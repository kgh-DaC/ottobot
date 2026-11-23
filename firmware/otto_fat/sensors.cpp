#include "sensors.h"
#include "config.h"
#include <Wire.h>
#include <math.h>

static uint8_t s_present = 0;
static uint8_t s_who = 0;

// 터치
static bool s_touchStable = false, s_touchEdge = false;

// 초음파
static int16_t s_usHist[3] = {0, 0, 0};
static uint8_t s_usIdx = 0;
static int16_t s_dist = 0;
static bool s_distFresh = false;
static unsigned long s_usLast = 0;

// IMU
static float s_pitchF = 0, s_rollF = 0;
static int16_t s_pitchRaw = 0, s_rollRaw = 0;   // 필터 전 최근 샘플 (보정·부호 적용)
static uint8_t s_imuSeq = 0;                    // 새 샘플마다 1 증가
static bool s_imuFirst = true;
static uint8_t s_imuFails = 0;
static bool s_imuFailEdge = false;
static unsigned long s_imuLast = 0;

// 사운드
static int16_t s_sound = 0;

static bool imuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

static int16_t imuReadByte(uint8_t reg) {
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0 ||
      Wire.requestFrom((uint8_t)IMU_ADDR, (uint8_t)1) != 1) {
    Wire.clearWireTimeoutFlag();
    return -1;
  }
  return Wire.read();
}

static int16_t usMeasure() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, US_TIMEOUT_US);
  int16_t cm = us ? (int16_t)(us / 58UL) : 0;
  if (cm > 400) cm = 0;
  return cm;
}

static int16_t median3(int16_t a, int16_t b, int16_t c) {
  if (a > b) { int16_t t = a; a = b; b = t; }
  if (b > c) { b = c; }
  return a > b ? a : b;
}

void sensors_begin() {
  pinMode(PIN_TOUCH, INPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  // MPU6050
  Wire.begin();
  Wire.setClock(100000);
  Wire.setWireTimeout(3000, true);
  int16_t who = imuReadByte(0x75);
  s_who = who < 0 ? 0 : (uint8_t)who;
  if (who == 0x68 || who == 0x70 || who == 0x72) {
    if (imuWrite(0x6B, 0x00) && imuWrite(0x1A, 0x03) && imuWrite(0x1C, 0x00))
      s_present |= SENS_IMU;
  }

  // 초음파: 60ms 간격 5회 모두 0이면 부재
  for (uint8_t i = 0; i < US_BOOT_TRIES; i++) {
    int16_t cm = usMeasure();
    if (cm > 0) { s_present |= SENS_US; s_usHist[0] = s_usHist[1] = s_usHist[2] = cm; s_dist = cm; }
    delay(US_INTERVAL_MS);
  }
  s_touchStable = digitalRead(PIN_TOUCH) == HIGH;
}

static int16_t roundDeg(float f) { return (int16_t)(f >= 0 ? f + 0.5f : f - 0.5f); }

static void imuUpdate(bool gap) {
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x3B);
  bool ok = Wire.endTransmission(false) == 0;
  if (ok) ok = Wire.requestFrom((uint8_t)IMU_ADDR, (uint8_t)6) == 6;
  if (!ok) {
    Wire.clearWireTimeoutFlag();
    if (++s_imuFails >= IMU_FAIL_LIMIT) {
      s_present &= ~SENS_IMU;
      s_imuFailEdge = true;
      s_pitchF = s_rollF = 0;
    }
    return;
  }
  s_imuFails = 0;
  int16_t a[3];
  for (uint8_t i = 0; i < 3; i++) {
    uint8_t hi = Wire.read();
    uint8_t lo = Wire.read();
    a[i] = (int16_t)((hi << 8) | lo);
  }
  float fp = (float)a[IMU_PITCH_AXIS], fr = (float)a[IMU_ROLL_AXIS], fu = (float)a[IMU_UP_AXIS];
  // 0점 보정은 원시 각도에 먼저 적용한 뒤 부호를 곱한다(부호를 바꿔도 바로 선 자세 = 0°)
  float pitch = (atan2(fp, sqrt(fr * fr + fu * fu)) * 57.2958f + IMU_PITCH_OFFSET) * IMU_PITCH_SIGN;
  float roll = (atan2(fr, fu) * 57.2958f + IMU_ROLL_OFFSET) * IMU_ROLL_SIGN;
  s_pitchRaw = roundDeg(pitch);
  s_rollRaw = roundDeg(roll);
  s_imuSeq++;
  // 블로킹 동작 등으로 샘플 간격이 벌어지면 오래된 필터 값을 버리고 새 값에서 시작
  if (s_imuFirst || gap) { s_pitchF = pitch; s_rollF = roll; s_imuFirst = false; }
  else {
    s_pitchF = s_pitchF * 0.8f + pitch * 0.2f;
    s_rollF = s_rollF * 0.8f + roll * 0.2f;
  }
}

void sensors_update() {
  unsigned long now = millis();

  // 터치: 확정 상태와 다른 값을 처음 본 순간 그 자리에서 짧게 재샘플해 확정한다.
  // loop 간격(MOVING 중 = period)과 무관. 블로킹 동작 중 눌렀다 뗀 터치는 놓친다(구조상 한계).
  bool raw = digitalRead(PIN_TOUCH) == HIGH;
  if (raw != s_touchStable) {
    bool same = true;
    for (uint8_t i = 0; i < TOUCH_RESAMPLE_N && same; i++) {
      delay(TOUCH_RESAMPLE_MS);
      same = (digitalRead(PIN_TOUCH) == HIGH) == raw;
    }
    if (same) {
      s_touchStable = raw;
      if (raw) s_touchEdge = true;
    }
    now = millis();
  }

  if ((s_present & SENS_US) && now - s_usLast >= US_INTERVAL_MS) {
    s_usLast = now;
    s_usHist[s_usIdx] = usMeasure();
    s_usIdx = (s_usIdx + 1) % 3;
    s_dist = median3(s_usHist[0], s_usHist[1], s_usHist[2]);
    s_distFresh = true;
  }

  if (now - s_imuLast >= IMU_INTERVAL_MS) {   // IMU·사운드 20ms 주기
    bool gap = now - s_imuLast >= IMU_GAP_RESET_MS;
    s_imuLast = now;
    if (s_present & SENS_IMU) imuUpdate(gap);
    s_sound = analogRead(PIN_SOUND);
  }
}

uint8_t sensors_present() { return s_present; }
uint8_t sensors_imuWhoAmI() { return s_who; }
bool sensors_touch() { return s_touchStable; }
bool sensors_touchPressedEdge() { bool e = s_touchEdge; s_touchEdge = false; return e; }
int16_t sensors_distance() { return (s_present & SENS_US) ? s_dist : 0; }
bool sensors_distanceFresh() { bool f = s_distFresh; s_distFresh = false; return f; }
int16_t sensors_pitchRaw() { return (s_present & SENS_IMU) ? s_pitchRaw : 0; }
int16_t sensors_rollRaw() { return (s_present & SENS_IMU) ? s_rollRaw : 0; }
uint8_t sensors_imuSeq() { return s_imuSeq; }
int16_t sensors_pitch() { return (s_present & SENS_IMU) ? roundDeg(s_pitchF) : 0; }
int16_t sensors_roll() { return (s_present & SENS_IMU) ? roundDeg(s_rollF) : 0; }
int16_t sensors_sound() { return s_sound; }
bool sensors_imuFailedEdge() { bool e = s_imuFailEdge; s_imuFailEdge = false; return e; }
