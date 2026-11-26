#include "commands.h"
#include "config.h"
#include "protocol.h"
#include "comms.h"
#include "motion.h"
#include "face.h"
#include "behavior.h"

// ---- TONE (비블로킹) ----
static bool s_toneOn = false;
static unsigned long s_toneStart = 0;
static uint16_t s_toneMs = 0;
static uint8_t s_tonePort = PORT_BT;

static void stopTone() {
  if (!s_toneOn) return;
  noTone(PIN_BUZZER);
  s_toneOn = false;
  motion_markEnd();               // 소리 반응 쿨다운 기준
  comms_done(CMD_TONE, s_tonePort);
}

void commands_tick() {
  if (s_toneOn && millis() - s_toneStart >= s_toneMs) {
    s_toneOn = false;
    motion_markEnd();
    comms_done(CMD_TONE, s_tonePort);
  }
}

// ---- 검증 도우미 ----
static bool argcIn(uint8_t mn, uint8_t mx) { return g_argc >= mn && g_argc <= mx; }
static bool rng(uint8_t i, int16_t lo, int16_t hi) { return g_args[i] >= lo && g_args[i] <= hi; }
static bool allRng(uint8_t n, int16_t lo, int16_t hi) {
  for (uint8_t i = 0; i < n; i++) if (!rng(i, lo, hi)) return false;
  return true;
}

static bool isKnown(char t) {
  switch (t) {
    case CMD_PING: case CMD_STOP: case CMD_MOVE: case CMD_GESTURE: case CMD_SING:
    case CMD_TONE: case CMD_MOUTH: case CMD_MATRIX: case CMD_TEXT: case CMD_ARMS:
    case CMD_SERVO: case CMD_TRIM: case CMD_TELEM: case CMD_AUTO:
      return true;
  }
  return false;
}

static bool validArgs(char t) {
  switch (t) {
    case CMD_PING:  return argcIn(CMD_PING_MIN_ARGC, CMD_PING_ARGC);
    case CMD_STOP:  return argcIn(CMD_STOP_MIN_ARGC, CMD_STOP_ARGC);
    case CMD_MOVE:
      if (!argcIn(CMD_MOVE_MIN_ARGC, CMD_MOVE_ARGC)) return false;
      if (g_argc < 2) g_args[1] = CMD_MOVE_PERIOD_DEFAULT;
      if (g_argc < 3) g_args[2] = CMD_MOVE_SIZE_DEFAULT;
      return rng(0, CMD_MOVE_ID_MIN, CMD_MOVE_ID_MAX) &&
             rng(1, CMD_MOVE_PERIOD_MIN, CMD_MOVE_PERIOD_MAX) &&
             rng(2, CMD_MOVE_SIZE_MIN, CMD_MOVE_SIZE_MAX);
    case CMD_GESTURE:
      return argcIn(CMD_GESTURE_MIN_ARGC, CMD_GESTURE_ARGC) && rng(0, CMD_GESTURE_ID_MIN, CMD_GESTURE_ID_MAX);
    case CMD_SING:
      return argcIn(CMD_SING_MIN_ARGC, CMD_SING_ARGC) && rng(0, CMD_SING_ID_MIN, CMD_SING_ID_MAX);
    case CMD_TONE:
      return argcIn(CMD_TONE_MIN_ARGC, CMD_TONE_ARGC) &&
             rng(0, CMD_TONE_FREQ_MIN, CMD_TONE_FREQ_MAX) && rng(1, CMD_TONE_MS_MIN, CMD_TONE_MS_MAX);
    case CMD_MOUTH:
      return argcIn(CMD_MOUTH_MIN_ARGC, CMD_MOUTH_ARGC) && rng(0, CMD_MOUTH_ID_MIN, CMD_MOUTH_ID_MAX);
    case CMD_MATRIX:
      return argcIn(CMD_MATRIX_MIN_ARGC, CMD_MATRIX_ARGC) && allRng(8, CMD_MATRIX_R0_MIN, CMD_MATRIX_R0_MAX);
    case CMD_TEXT:
      return argcIn(CMD_TEXT_MIN_ARGC, CMD_TEXT_ARGC) && g_strArg && strlen(g_strArg) <= CMD_TEXT_TEXT_MAXLEN;
    case CMD_ARMS:
      return argcIn(CMD_ARMS_MIN_ARGC, CMD_ARMS_ARGC) &&
             rng(0, CMD_ARMS_LEFT_MIN, CMD_ARMS_LEFT_MAX) && rng(1, CMD_ARMS_RIGHT_MIN, CMD_ARMS_RIGHT_MAX);
    case CMD_SERVO:
      return argcIn(CMD_SERVO_MIN_ARGC, CMD_SERVO_ARGC) && allRng(4, CMD_SERVO_YL_MIN, CMD_SERVO_YL_MAX);
    case CMD_TRIM:
      if (!argcIn(CMD_TRIM_MIN_ARGC, CMD_TRIM_ARGC)) return false;
      if (g_argc < 5) g_args[4] = CMD_TRIM_SAVE_DEFAULT;
      return allRng(4, CMD_TRIM_YL_MIN, CMD_TRIM_YL_MAX) && rng(4, CMD_TRIM_SAVE_MIN, CMD_TRIM_SAVE_MAX);
    case CMD_TELEM:
      return argcIn(CMD_TELEM_MIN_ARGC, CMD_TELEM_ARGC) && rng(0, CMD_TELEM_INTERVAL_MS_MIN, CMD_TELEM_INTERVAL_MS_MAX);
    case CMD_AUTO:
      return argcIn(CMD_AUTO_MIN_ARGC, CMD_AUTO_ARGC) && rng(0, CMD_AUTO_MASK_MIN, CMD_AUTO_MASK_MAX);
  }
  return false;
}

// behavior.md 6절 상태별 허용 명령. 0 = 허용, 아니면 ERR 코드
static uint8_t stateReject(char t) {
  if (g_state == ST_AVOID) {
    switch (t) {
      case CMD_MOVE: case CMD_GESTURE: case CMD_SING: case CMD_TEXT:
      case CMD_SERVO: case CMD_ARMS: case CMD_TRIM:
        return ERR_BUSY;
    }
  } else if (g_state == ST_FALLEN) {
    switch (t) {
      case CMD_MOVE: case CMD_GESTURE: case CMD_SERVO: case CMD_ARMS: case CMD_TRIM:
        return ERR_FALLEN;
    }
  }
  if (t == CMD_MOVE && behavior_moveLocked()) return ERR_BUSY;   // 자동 정지 직후 잠금 → e 3 77
  return 0;
}

static void sendTrims(uint8_t dest) {
  comms_send(dest, MSG_TRIMS, motion_trims(), MSG_TRIMS_FIELDS);
}

// 1회성 블로킹 동작 시작: 진행 중 MOVE를 끝내고(d 77) ACTION으로
static void beginAction() {
  behavior_endMove();
  if (g_state != ST_FALLEN) g_state = ST_ACTION;
}
static void endAction() {
  if (g_state == ST_ACTION) g_state = ST_IDLE;
}

void commands_handle(char* line) {
  char t = line[0];
  if (!isKnown(t)) { comms_err(ERR_UNKNOWN_CMD, (uint8_t)t); return; }
  if (!comms_parseArgs(line, t == CMD_TEXT) || !validArgs(t)) {
    comms_err(ERR_BAD_ARG, (uint8_t)t);
    return;
  }
  uint8_t rej = stateReject(t);
  if (rej) { comms_err(rej, (uint8_t)t); return; }

  uint8_t port = g_replyPort;
  comms_ack(t);   // 검증 직후·실행 전 (watchdog 수신 시각 갱신 포함)

  switch (t) {
    case CMD_PING:
      behavior_sendInfo(port);
      sendTrims(port);
      break;

    case CMD_STOP:
      if (g_state == ST_MOVING) behavior_endMove();
      else if (g_state == ST_AVOID) g_state = ST_IDLE;
      stopTone();
      if (g_state != ST_FALLEN) motion_home();   // FALLEN은 풀지 않는다
      break;

    case CMD_MOVE:
      if (g_args[0] == 0) {           // home: 1회성
        beginAction();
        motion_home();
        endAction();
        break;
      }
      motion_setMove((uint8_t)g_args[0], g_args[1], g_args[2]);
      g_movePort = port;
      g_state = ST_MOVING;            // 교체·keepalive면 그대로 이어감 (d 77 없음)
      return;                         // DONE은 멈출 때

    case CMD_GESTURE:
      beginAction();
      motion_gesture((uint8_t)g_args[0]);
      face_restore();                 // 제스처가 바꾼 입모양 대신 기억된 얼굴로
      endAction();
      break;

    case CMD_SING:
      beginAction();
      motion_sing((uint8_t)g_args[0]);
      endAction();
      break;

    case CMD_TONE:
      stopTone();                     // 앞 소리의 d 84 (새 ACK 뒤)
      tone(PIN_BUZZER, (unsigned int)g_args[0], (unsigned long)g_args[1]);
      s_toneOn = true;
      s_toneStart = millis();
      s_toneMs = (uint16_t)g_args[1];
      s_tonePort = port;
      return;                         // DONE은 commands_tick에서

    case CMD_MOUTH:
      face_mouth((uint8_t)g_args[0]);
      break;

    case CMD_MATRIX:
      face_matrix(g_args);
      break;

    case CMD_TEXT:
      beginAction();
      face_text(g_strArg);
      endAction();
      break;

    case CMD_ARMS:
      motion_arms(g_args[0], g_args[1]);
      break;

    case CMD_SERVO:
      beginAction();
      motion_servos(g_args);
      endAction();
      break;

    case CMD_TRIM:
      beginAction();
      motion_setTrims(g_args, g_args[4] != 0);
      sendTrims(port);
      endAction();
      break;

    case CMD_TELEM:
      behavior_setTelem(g_args[0]);
      break;

    case CMD_AUTO:
      behavior_setAuto((uint8_t)g_args[0]);   // FALLEN 해제 시 v 4 1
      behavior_sendInfo(port);
      break;
  }
  comms_done(t, port);
}

// 멈춰 있을 때 터치 → 인사(behavior.cpp). 명령이 아니므로 ACK/DONE 없음
void commands_greet() {
  beginAction();
  motion_gesture(TOUCH_GREET_GESTURE);  // 기쁨 제스처 (OttoHappy)
  face_text(TOUCH_GREET_TEXT);          // HELLO 흐르기 → 얼굴 복원
  motion_rehome();                      // 동작이 끝나면 원위치
  endAction();
}
