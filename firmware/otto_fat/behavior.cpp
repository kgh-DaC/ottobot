#include "behavior.h"
#include "config.h"
#include "protocol.h"
#include "comms.h"
#include "sensors.h"
#include "motion.h"
#include "face.h"

uint8_t g_state = ST_IDLE;
uint8_t g_movePort = PORT_BT;

static uint8_t s_auto = 0;
static uint16_t s_telemMs = 0;
static unsigned long s_telemLast = 0;
static unsigned long s_fallT = 0, s_recT = 0;   // 0 = 조건 미성립
static uint8_t s_fallSeq = 0, s_fallOver = 0;   // MOVING/AVOID: 마지막으로 본 샘플 번호, 연속 초과 횟수
static bool s_obstArmed = true;
static uint8_t s_avoidSteps = 0;
static unsigned long s_soundLast = 0;
static unsigned long s_soundFaceT = 0;          // 0 = 소리 표정 표시 중 아님
static unsigned long s_lockT = 0;               // 0 = MOVE 잠금 없음, 아니면 잠금 시작 시각

// 자동 정지 시점에 호출. 같은 loop의 뒤이은 poll에서 버퍼에 남은 keepalive M을 거부하게 한다
static void lockMove() { s_lockT = millis() | 1UL; }   // 0을 피한다

bool behavior_moveLocked() {
  if (s_lockT && millis() - s_lockT >= MOVE_LOCKOUT_MS) s_lockT = 0;
  return s_lockT != 0;
}

#define AUTO_TOUCH 1
#define AUTO_OBST  2
#define AUTO_FALL  4
#define AUTO_SOUND 8

static uint8_t allowedMask() {
  uint8_t s = sensors_present();
  uint8_t m = AUTO_TOUCH | AUTO_SOUND;
  if (s & SENS_IMU) m |= AUTO_FALL;
  if (s & SENS_US) m |= AUTO_OBST;
  return m;
}

static unsigned long stamp(unsigned long now) { return now | 1UL; }  // 0을 피한다

void behavior_begin() {
  s_auto = AUTO_DEFAULT & allowedMask();
  s_telemMs = 0;
  g_state = ST_IDLE;
}

void behavior_sendInfo(uint8_t dest) {
  int16_t v[MSG_INFO_FIELDS] = { PROTO_VERSION, FW_BUILD, (int16_t)sensors_present(), (int16_t)s_auto };
  comms_send(dest, MSG_INFO, v, MSG_INFO_FIELDS);
}

void behavior_bootReport() {
  behavior_sendInfo(PORT_BOTH);
  int16_t v[MSG_EVENT_FIELDS] = { EVT_BOOT, (int16_t)sensors_present() };
  comms_send(PORT_BOTH, MSG_EVENT, v, MSG_EVENT_FIELDS);
}

uint8_t behavior_auto() { return s_auto; }

void behavior_endMove() {
  if (g_state == ST_MOVING) {
    g_state = ST_IDLE;
    comms_done(CMD_MOVE, g_movePort);
  }
}

static void recover(int16_t why) {
  s_fallT = s_recT = 0;
  motion_attachAll();          // attach → 다리 홈, 팔 기본 각도
  face_mouth(10);              // smile
  comms_event(EVT_RECOVER, why);
  g_state = ST_IDLE;
}

uint8_t behavior_setAuto(uint8_t mask) {
  s_auto = mask & allowedMask();
  if (g_state == ST_FALLEN && !(s_auto & AUTO_FALL)) recover(1);
  if (!(s_auto & AUTO_FALL)) s_fallT = 0;
  return s_auto;
}

void behavior_setTelem(int16_t ms) {
  if (ms > 0 && ms < TELEM_MIN_MS) ms = TELEM_MIN_MS;
  s_telemMs = (uint16_t)ms;
  s_telemLast = millis();
}

static void fall(int16_t angle) {
  bool wasMoving = (g_state == ST_MOVING);
  g_state = ST_FALLEN;         // MOVE/AVOID 중단
  s_recT = 0;
  motion_detachAll();
  face_mouth(FALL_MOUTH);
  comms_event(EVT_FALL, angle);
  if (wasMoving) comms_done(CMD_MOVE, g_movePort);
}

// 반환: 이번 바퀴에 넘어짐 전이가 있었거나 FALLEN 상태인가
static bool checkFall(unsigned long now) {
  if (!(s_auto & AUTO_FALL) || !(sensors_present() & SENS_IMU)) return g_state == ST_FALLEN;
  if (g_state == ST_MOVING || g_state == ST_AVOID) {
    // 블로킹 주기 사이에는 주기 끝 샘플 1개뿐 → 필터 없이 원시 샘플 개수로 판정
    s_fallT = 0;
    uint8_t seq = sensors_imuSeq();
    if (seq == s_fallSeq) return false;
    s_fallSeq = seq;
    int16_t p = sensors_pitchRaw(), r = sensors_rollRaw();
    int16_t ap = abs(p), ar = abs(r);
    int16_t ang = ap >= ar ? p : r;
    if (ap > FALL_INSTANT_DEG || ar > FALL_INSTANT_DEG) { s_fallOver = 0; fall(ang); return true; }
    if (ap > FALL_DEG || ar > FALL_DEG) {
      if (++s_fallOver >= FALL_MOVING_SAMPLES) { s_fallOver = 0; fall(ang); return true; }
    } else s_fallOver = 0;
    return false;
  }
  s_fallOver = 0;
  s_fallSeq = sensors_imuSeq();
  int16_t p = sensors_pitch(), r = sensors_roll();
  int16_t ap = abs(p), ar = abs(r);
  if (g_state != ST_FALLEN) {
    if (ap > FALL_DEG || ar > FALL_DEG) {
      if (!s_fallT) s_fallT = stamp(now);
      else if (now - s_fallT >= FALL_HOLD_MS) {
        s_fallT = 0;
        fall(ap >= ar ? p : r);
        return true;
      }
    } else s_fallT = 0;
    return false;
  }
  if (ap < RECOVER_DEG && ar < RECOVER_DEG) {
    if (!s_recT) s_recT = stamp(now);
    else if (now - s_recT >= RECOVER_HOLD_MS) { recover(0); return false; }
  } else s_recT = 0;
  return true;
}

void behavior_safety() {
  unsigned long now = millis();

  // 실행 중 IMU 연속 실패 → e 5 0, 비트 제거, FALLEN이면 강제 회복, INFO 재전송
  if (sensors_imuFailedEdge()) {
    comms_errTo(g_activePort, ERR_SENSOR_FAIL, 0);
    s_auto &= ~AUTO_FALL;
    s_fallT = 0;
    if (g_state == ST_FALLEN) recover(1);
    behavior_sendInfo(g_activePort);
  }

  // 1. 넘어짐
  bool fallen = checkFall(now);

  // 2. 터치: 이벤트는 항상, 정지는 AUTO 1 + MOVING/AVOID
  bool touchStopped = false;
  if (sensors_touchPressedEdge()) {
    comms_event(EVT_TOUCH, 1);
    if (!fallen && (s_auto & AUTO_TOUCH) && (g_state == ST_MOVING || g_state == ST_AVOID)) {
      bool wasMoving = (g_state == ST_MOVING);
      g_state = ST_IDLE;
      motion_home();
      lockMove();                 // 홈을 마치고 IDLE이 된 시점부터 1000ms (AVOID 중 터치도 포함)
      if (wasMoving) comms_done(CMD_MOVE, g_movePort);
      tone(PIN_BUZZER, TOUCH_BEEP_HZ, TOUCH_BEEP_MS);   // 짧은 비블로킹 신호음
      touchStopped = true;
    }
  }

  // 3. 장애물 (초음파 있을 때만, FALLEN 제외)
  if (!fallen && (sensors_present() & SENS_US) && sensors_distanceFresh()) {
    int16_t d = sensors_distance();
    if (s_obstArmed && d >= 1 && d <= OBST_TRIGGER_CM) {
      s_obstArmed = false;
      comms_event(EVT_OBSTACLE, d);
      if (!touchStopped && (s_auto & AUTO_OBST) && g_state == ST_MOVING &&
          motion_isForward(motion_moveId())) {
        comms_done(CMD_MOVE, g_movePort);   // AVOID 진입 시 d 77
        g_state = ST_AVOID;
        s_avoidSteps = 0;
      }
    } else if (!s_obstArmed && (d == 0 || d > OBST_RELEASE_CM)) {
      s_obstArmed = true;
    }
  }

  // 4. 소리 (AUTO 8, IDLE에서만, 쿨다운)
  if (s_soundFaceT && now - s_soundFaceT >= SOUND_FACE_MS) {
    s_soundFaceT = 0;
    if (g_state != ST_FALLEN) face_restore();
  }
  if ((s_auto & AUTO_SOUND) && g_state == ST_IDLE &&
      now - s_soundLast >= SOUND_COOLDOWN_MS &&
      now - motion_lastEnd() >= SOUND_AFTER_MOTION_MS) {
    int16_t s = sensors_sound();
    if (s > SOUND_THRESHOLD) {
      s_soundLast = now;
      comms_event(EVT_SOUND, s);
      face_flash(14);            // bigSurprise, 1초 뒤 복원
      s_soundFaceT = stamp(now);
    }
  }
}

void behavior_motion() {
  if (g_state == ST_MOVING) {
    // MOVE watchdog: 주기 종료 후 입력을 모두 읽은 뒤(loop 순서상 poll 다음) 판정
    if (millis() - g_lastValidRx > MOVE_WATCHDOG_MS) {
      g_state = ST_IDLE;
      motion_home();
      lockMove();                 // 홈 이후부터
      comms_done(CMD_MOVE, g_movePort);
      return;
    }
    motion_cycle();
  } else if (g_state == ST_AVOID) {
    motion_backStep();
    if (++s_avoidSteps >= AVOID_STEPS && g_state == ST_AVOID) {
      motion_home();
      g_state = ST_IDLE;
      lockMove();                 // 홈 이후부터 잠금 시간 계산
    }
  }
}

void behavior_telemetry() {
  if (!s_telemMs) return;
  uint16_t iv = s_telemMs;
  if (g_state == ST_MOVING && iv < TELEM_MOVING_MIN_MS) iv = TELEM_MOVING_MIN_MS;
  unsigned long now = millis();
  if (now - s_telemLast < iv) return;
  s_telemLast = now;
  int16_t v[MSG_TELEMETRY_FIELDS] = {
    sensors_distance(), (int16_t)sensors_touch(), sensors_pitch(), sensors_roll(),
    sensors_sound(), (int16_t)g_state
  };
  comms_send(g_activePort, MSG_TELEMETRY, v, MSG_TELEMETRY_FIELDS);
}
