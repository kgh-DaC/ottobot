#include "motion.h"
#include "config.h"
#include <Servo.h>
#include <EEPROM.h>

class Otto Otto;
static Servo s_armL, s_armR;
static int16_t s_trim[4];
static uint8_t s_id = 1;
static int16_t s_period = 1000, s_size = 15;
static unsigned long s_lastEnd = 0;
static unsigned long s_armAt = 0;   // 마지막 팔 각도 쓰기 시각 (ARM_DETACH_MS 뒤 detach)

static void markEnd() { s_lastEnd = millis(); }
void motion_markEnd() { markEnd(); }

// 명령 각도(각도↑ = 손 들기) → 서보 실제 각도. ARM_DIR_* 참고
static void armsWrite(int16_t l, int16_t r) {
  s_armL.write(ARM_DIR_L < 0 ? 180 - l : l);
  s_armR.write(ARM_DIR_R < 0 ? 180 - r : r);
  s_armAt = millis();
}

static void armsAttach() {
  s_armL.attach(PIN_ARM_L);
  s_armR.attach(PIN_ARM_R);
}

void motion_begin() {
  Otto.init(PIN_YL, PIN_YR, PIN_RL, PIN_RR, LOAD_TRIM_EEPROM, PIN_BUZZER);
  // Otto.init과 같은 방식으로 EEPROM 0~3을 읽어 RAM 사본을 둔다(TRIMS 응답용, 읽기만)
  for (uint8_t i = 0; i < 4; i++) {
    int v = EEPROM.read(i);
    if (v > 128) v -= 256;
    s_trim[i] = LOAD_TRIM_EEPROM ? v : 0;
  }
  Otto.home();
  armsAttach();
  armsWrite(ARM_REST_L, ARM_REST_R);
  markEnd();
}

void motion_setMove(uint8_t id, int16_t period, int16_t size) {
  s_id = id; s_period = period; s_size = size;
}
uint8_t motion_moveId() { return s_id; }

void motion_runOnce(uint8_t id, int16_t T, int16_t h) {
  switch (id) {   // Otto_APP move 표 (otto-lib-api.md)
    case 0:  Otto.home(); break;
    case 1:  Otto.walk(1, T, 1); break;
    case 2:  Otto.walk(1, T, -1); break;
    case 3:  Otto.turn(1, T, 1); break;
    case 4:  Otto.turn(1, T, -1); break;
    case 5:  Otto.updown(1, T, h); break;
    case 6:  Otto.moonwalker(1, T, h, 1); break;
    case 7:  Otto.moonwalker(1, T, h, -1); break;
    case 8:  Otto.swing(1, T, h); break;
    case 9:  Otto.crusaito(1, T, h, 1); break;
    case 10: Otto.crusaito(1, T, h, -1); break;
    case 11: Otto.jump(1, T); break;
    case 12: Otto.flapping(1, T, h, 1); break;
    case 13: Otto.flapping(1, T, h, -1); break;
    case 14: Otto.tiptoeSwing(1, T, h); break;
    case 15: Otto.bend(1, T, 1); break;
    case 16: Otto.bend(1, T, -1); break;
    case 17: Otto.shakeLeg(1, T, 1); break;
    case 18: Otto.shakeLeg(1, T, -1); break;
    case 19: Otto.jitter(1, T, h); break;
    case 20: Otto.ascendingTurn(1, T, h); break;
  }
  markEnd();
}

void motion_cycle() { motion_runOnce(s_id, s_period, s_size); }

void motion_arms(int16_t l, int16_t r) {
  if (!s_armL.attached()) armsAttach();
  armsWrite(l, r);
}

void motion_home() {
  Otto.home();            // 이미 홈이면 라이브러리가 건너뜀
  motion_arms(ARM_REST_L, ARM_REST_R);
  markEnd();
}

void motion_servos(const int16_t* t) {
  int target[4] = { t[0], t[1], t[2], t[3] };
  Otto._moveServos(SERVO_MOVE_MS, target);
  markEnd();
}

void motion_setTrims(const int16_t* t, bool save) {
  for (uint8_t i = 0; i < 4; i++) s_trim[i] = t[i];
  Otto.setTrims(t[0], t[1], t[2], t[3]);
  if (save) Otto.saveTrimsOnEEPROM();   // EEPROM 0~3 (Otto 형식)
  Otto.setRestState(false);              // 새 트림으로 홈을 다시 잡게
  motion_home();
}

const int16_t* motion_trims() { return s_trim; }

// 프로토콜 GESTURE 1~13 = Otto_APP 순서 = 라이브러리 OttoHappy(0)~OttoFail(12)
void motion_gesture(uint8_t id) { Otto.playGesture(OttoHappy + (id - 1)); markEnd(); }

// 프로토콜 SING 1~19 → 라이브러리 상수 (라이브러리 값 순서가 다르므로 표로 변환)
static const uint8_t SONGS[19] PROGMEM = {
  S_connection, S_disconnection, S_surprise, S_OhOoh, S_OhOoh2, S_cuddly, S_sleeping,
  S_happy, S_superHappy, S_happy_short, S_sad, S_confused, S_fart1, S_fart2, S_fart3,
  S_mode1, S_mode2, S_mode3, S_buttonPushed
};
void motion_sing(uint8_t id) {
  if (id < 1 || id > 19) return;
  Otto.sing(pgm_read_byte(&SONGS[id - 1]));
  markEnd();
}
void motion_singLib(uint8_t libSong) { Otto.sing(libSong); markEnd(); }

// 터치 인사 끝: 다리를 홈(90°+트림)으로 확실히 되돌린다. 라이브러리는 '쉬는 중'이면 home()을 건너뛰므로 먼저 푼다.
void motion_rehome() { Otto.setRestState(false); motion_home(); }
void motion_backStep() { Otto.walk(1, AVOID_PERIOD, -1); markEnd(); }

void motion_detachAll() {
  Otto.detachServos();
  s_armL.detach();
  s_armR.detach();
}

void motion_attachAll() {
  Otto.attachServos();
  armsAttach();
  Otto.setRestState(false);
  motion_home();
}

// 팔이 목표 각도에 도달한 뒤 신호를 끊어 떨림을 없앤다 (다리는 Otto 라이브러리가 같은 방식으로 detach)
void motion_tick() {
  if (millis() - s_armAt >= ARM_DETACH_MS) {   // detach는 이미 떼어져 있어도 안전하다
    s_armL.detach();
    s_armR.detach();
  }
}

bool motion_isForward(uint8_t id) { return id == 1 || id == 9 || id == 12; }
unsigned long motion_lastEnd() { return s_lastEnd; }
