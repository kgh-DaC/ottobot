// Otto Fat 핀 연결 진단 스케치
// - 부팅 시 자동 검사: I2C(MPU6050), 초음파(정/역 배선), 터치, 사운드, 부저, LED 매트릭스, 블루투스
// - 이후 USB 시리얼 또는 블루투스로 한 글자 명령을 보내 개별 검사 (h = 도움말)
// 결과는 USB 시리얼과 블루투스(D11/D12) 양쪽으로 출력한다.

#include <Wire.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <Otto.h>
#include <EEPROM.h>

// ---- 검증 대상 핀 (bl_motion.ino / 배선도 기준) ----
const byte SERVO_PINS[6] = {2, 3, 4, 5, 6, 7};
const char* const SERVO_NAMES[6] = {"LeftLeg", "RightLeg", "LeftFoot", "RightFoot", "Arm(D6)", "Arm(D7)"};
#define TRIG 8
#define ECHO 9
#define BT_RX 11
#define BT_TX 12
#define BUZZER 13
#define TOUCH A0
#define M_CLK A1
#define M_CS A2
#define M_DIN A3
#define SOUND A6

SoftwareSerial BT(BT_RX, BT_TX);
Otto Otto;
Servo sv;

// ---- 양쪽 출력 ----
// 각 줄 앞에 "@0001 " 순번을 붙인다. 일부 USB-시리얼(FT232 호환칩) 드라이버가 유휴 시
// 마지막 데이터를 반복해 돌려주는 문제가 있어, PC 쪽에서 순번으로 중복을 걸러내기 위함.
class Dual : public Print {
  bool lineStart = true; unsigned int seq = 0;
 public:
  size_t write(uint8_t c) override {
    if (lineStart && c != '\n') {
      char h[8]; snprintf(h, sizeof h, "@%04u ", ++seq); Serial.print(h); lineStart = false;
    }
    Serial.write(c);
    if (c == '\n') lineStart = true;
    return 1;
  }
} out;

// ---- 초음파 ----
long pingCm(byte trig, byte echo) {
  pinMode(trig, OUTPUT); pinMode(echo, INPUT);
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  unsigned long us = pulseIn(echo, HIGH, 25000UL);
  return us ? (long)(us / 58UL) : 0;
}

void testUltrasonic(byte n) {
  out.println(F("[초음파] TRIG=D8 ECHO=D9"));
  byte ok = 0;
  for (byte i = 0; i < n; i++) {
    long cm = pingCm(TRIG, ECHO);
    out.print(F("  거리 ")); out.print(cm); out.println(F(" cm"));
    if (cm > 0) ok++;
    delay(100);
  }
  if (ok) { out.println(F("  => OK (응답 있음)")); return; }
  byte rev = 0;
  for (byte i = 0; i < 3; i++) { if (pingCm(ECHO, TRIG) > 0) rev++; delay(80); }
  if (rev) out.println(F("  => FAIL: TRIG/ECHO가 서로 바뀐 것으로 보임 (D8<->D9)"));
  else out.println(F("  => FAIL: 응답 없음 (배선/전원 확인, 앞이 4m 이상 비어 있으면 손을 대고 'u')"));
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
}


void scanUltrasonic() {
  out.println(F("[초음파 핀 탐색] D8/D9/D10 조합 시험"));
  const byte P[3] = {8, 9, 10};
  for (byte i = 0; i < 3; i++) for (byte j = 0; j < 3; j++) {
    if (i == j) continue;
    long best = 0;
    for (byte k = 0; k < 3; k++) { long cm = pingCm(P[i], P[j]); if (cm > best) best = cm; delay(70); }
    out.print(F("  TRIG=D")); out.print(P[i]); out.print(F(" ECHO=D")); out.print(P[j]);
    out.print(F(" -> ")); out.print(best); out.println(best ? F(" cm  <== 응답") : F(" cm"));
  }
  for (byte i = 0; i < 3; i++) pinMode(P[i], INPUT);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  out.print(F("  ECHO(D9) 대기 레벨=")); out.println(digitalRead(ECHO));
}

// ---- I2C / MPU6050 ----
bool i2cWrite(byte addr, byte reg, byte val) {
  Wire.beginTransmission(addr); Wire.write(reg); Wire.write(val);
  return Wire.endTransmission() == 0;
}
int i2cRead(byte addr, byte reg, byte* buf, byte len) {
  Wire.beginTransmission(addr); Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return -1;
  byte got = Wire.requestFrom(addr, len);
  for (byte i = 0; i < got; i++) buf[i] = Wire.read();
  return got;
}
byte imuAddr = 0;

void testI2C() {
  out.println(F("[I2C] SDA=A4 SCL=A5 스캔"));
  byte found = 0;
  imuAddr = 0;
  for (byte a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    byte e = Wire.endTransmission();
    if (Wire.getWireTimeoutFlag()) { Wire.clearWireTimeoutFlag(); out.println(F("  => FAIL: I2C 버스 멈춤 (SDA/SCL 단락 또는 풀업 문제)")); return; }
    if (e == 0) {
      found++;
      out.print(F("  장치 발견 0x")); out.println(a, HEX);
      if (a == 0x68 || a == 0x69) imuAddr = a;
    }
  }
  if (!found) { out.println(F("  => FAIL: 장치 없음 (SDA/SCL 바뀜, 전원, 접촉 확인)")); return; }
  if (!imuAddr) { out.println(F("  => WARN: MPU6050 주소(0x68/0x69) 아님")); return; }
  byte who = 0;
  i2cRead(imuAddr, 0x75, &who, 1);
  out.print(F("  WHO_AM_I = 0x")); out.println(who, HEX);
  i2cWrite(imuAddr, 0x6B, 0x00);
  i2cWrite(imuAddr, 0x1C, 0x00);
  delay(50);
  out.println(F("  => OK (MPU6050 응답)"));
  testIMU(3);
}

void testIMU(byte n) {
  if (!imuAddr) { out.println(F("[IMU] 센서 없음")); return; }
  out.println(F("[IMU] 원시 가속도 (1g = 16384)  ax ay az | pitch roll(도)"));
  for (byte i = 0; i < n; i++) {
    byte b[6];
    if (i2cRead(imuAddr, 0x3B, b, 6) != 6) { out.println(F("  읽기 실패")); return; }
    int ax = (b[0] << 8) | b[1], ay = (b[2] << 8) | b[3], az = (b[4] << 8) | b[5];
    int pitch = (int)(atan2((float)ax, sqrt((float)ay * ay + (float)az * az)) * 57.3);
    int roll = (int)(atan2((float)ay, (float)az) * 57.3);
    out.print(F("  ")); out.print(ax); out.print(' '); out.print(ay); out.print(' '); out.print(az);
    out.print(F(" | ")); out.print(pitch); out.print(' '); out.println(roll);
    delay(300);
  }
}

// ---- 터치 / 사운드 ----
void testTouch(unsigned int ms) {
  out.print(F("[터치] A0 디지털=")); out.print(digitalRead(TOUCH));
  out.print(F(" 아날로그=")); out.println(analogRead(TOUCH));
  if (!ms) { out.println(F("  (손대지 않은 상태에서 디지털 0이 정상. 't'로 5초 감시)")); return; }
  unsigned long t0 = millis(); int last = -1; byte changes = 0;
  while (millis() - t0 < ms) {
    int v = digitalRead(TOUCH);
    if (v != last) { out.print(F("  ")); out.print((millis() - t0) / 1000.0, 1); out.print(F("s -> ")); out.println(v ? F("눌림(HIGH)") : F("뗌(LOW)")); last = v; changes++; }
    delay(20);
  }
  out.println(changes > 1 ? F("  => OK (변화 감지)") : F("  => 변화 없음 (센서를 눌렀는데도 그렇다면 배선 확인)"));
}

void testSound(unsigned int ms) {
  int mn = 1023, mx = 0;
  unsigned long t0 = millis();
  while (millis() - t0 < ms) { int v = analogRead(SOUND); if (v < mn) mn = v; if (v > mx) mx = v; }
  out.print(F("[사운드] A6 최소=")); out.print(mn); out.print(F(" 최대=")); out.println(mx);
}

// ---- 부저 / 매트릭스 ----
void testBuzzer() {
  out.println(F("[부저] D13: 도-미-솔 3음"));
  int f[3] = {523, 659, 784};
  for (byte i = 0; i < 3; i++) { tone(BUZZER, f[i], 180); delay(230); }
  noTone(BUZZER);
}

void testMatrix() {
  out.println(F("[매트릭스] CLK=A1 CS=A2 DIN=A3"));
  out.println(F("  표시: y=0 행 전체 + x=0 열 전체 + (7,7) 점 하나"));
  out.println(F("  => 로봇 얼굴에서 선 2개가 어느 가장자리(위/아래/왼/오른)에 보이는지 확인"));
  Otto.clearMouth();
  for (byte i = 0; i < 8; i++) { Otto.setLed(i, 0, 1); Otto.setLed(0, i, 1); }
  Otto.setLed(7, 7, 1);
}


// ---- 트림 확인·조정 ----
// E: Otto 라이브러리가 EEPROM 0~3에 저장한 다리 트림(YL YR RL RR) 읽기
// 조정: 먼저 숫자(1~6)로 서보 선택 -> < > 1도, , . 5도 이동(힘 유지) -> z 해제
int8_t trimIdx = -1; int trimAngle = 90;
void readEepromTrims() {
  out.print(F("[EEPROM 트림] YL(D2) YR(D3) RL(D4) RR(D5) ="));
  for (byte i = 0; i < 4; i++) { int t = EEPROM.read(i); if (t > 128) t -= 256; out.print(' '); out.print(t); }
  out.println();
}
void trimStep(int d) {
  if (trimIdx < 0) { out.println(F("먼저 1~6으로 서보를 선택")); return; }
  trimAngle = constrain(trimAngle + d, 0, 180);
  if (!sv.attached()) sv.attach(SERVO_PINS[trimIdx]);
  sv.write(trimAngle);
  out.print(F("[트림] D")); out.print(SERVO_PINS[trimIdx]); out.print(F(" 각도=")); out.print(trimAngle);
  out.print(F(" (트림 ")); out.print(trimAngle - 90); out.println(F(")"));
}

// ---- 서보 ----
void sweepServo(byte idx) {
  out.print(F("[서보] D")); out.print(SERVO_PINS[idx]); out.print(F(" (예상 ")); out.print(SERVO_NAMES[idx]);
  out.println(F(") 90 -> 60 -> 120 -> 90"));
  for (byte k = 0; k <= idx; k++) { tone(BUZZER, 1200, 120); delay(260); }  // 삑 횟수 = 서보 번호
  delay(400);
  sv.attach(SERVO_PINS[idx]);
  const int seq[4] = {90, 60, 120, 90};
  for (byte s = 0; s < 4; s++) { sv.write(seq[s]); delay(600); }
  sv.detach();
  trimIdx = idx; trimAngle = 90;
  out.println(F("  => 어느 부위가 움직였는지 확인"));
}

void allServos90() {
  out.println(F("[서보] 6개 모두 90도 (조립 기준 자세)"));
  for (byte i = 0; i < 6; i++) { sv.attach(SERVO_PINS[i]); sv.write(90); delay(400); sv.detach(); }
}

unsigned long btQuiet = 0;

// ---- 블루투스 라인 진단 ----
// 1) 아무것도 보내지 않고 1초 듣기: 수신 바이트 = 잡음 또는 외부(BLE 연결 기기)에서 온 데이터
// 2) 고유 문자열을 BT TX(D12)로 보내고 D11로 되돌아오는지 확인 = 루프백(단락/모듈 에코)
void testBT() {
  out.println(F("[블루투스] RX=D11 TX=D12 9600"));
  while (BT.available()) BT.read();
  unsigned long t0 = millis(); unsigned int idle = 0; byte sample[12]; byte ns = 0;
  while (millis() - t0 < 1000) if (BT.available()) { byte b = BT.read(); if (ns < 12) sample[ns++] = b; idle++; }
  out.print(F("  무송신 1초 동안 수신: ")); out.print(idle); out.print(F(" B"));
  for (byte i = 0; i < ns; i++) { out.print(F(" 0x")); out.print(sample[i], HEX); }
  out.println();
  const char probe[] = "Zq7Zq7\n";
  BT.print(probe);
  t0 = millis(); char got[24]; byte n = 0;
  while (millis() - t0 < 400) if (BT.available() && n < 23) got[n++] = BT.read();
  got[n] = 0;
  bool loop = strstr(got, "Zq7Zq7") != NULL;
  out.print(F("  루프백 시험 문자열 되돌아옴: ")); out.println(loop ? F("예") : F("아니오"));
  if (loop) out.println(F("  => FAIL: 보낸 데이터가 그대로 돌아옴 (D11-D12 단락, 또는 모듈 TX/RX가 같은 핀에 연결)"));
  else if (idle > 20) out.println(F("  => WARN: 보내지 않았는데 계속 수신됨 (RX 선 떠 있음/잡음, 또는 연결된 BLE 기기가 송신 중)"));
  else out.println(F("  => 라인 정상(되먹임·잡음 없음). 실제 송수신은 BLE 앱에서 확인 필요"));
  btQuiet = millis();
}

void help() {
  out.println(F("--- 명령 (USB 또는 블루투스) ---"));
  out.println(F("1~6 서보 D2~D7 하나씩 | a 전체 90도 | m 매트릭스 | b 부저"));
  out.println(F("u 초음파 10회 | i 기울기 10회 | t 터치 5초 | s 사운드 2초 | n 블루투스 | p 초음파핀탐색 | r 자동검사 | h 도움말"));
}

void autoTests() {
  out.println(F("===== Otto 핀 진단 시작 ====="));
  testI2C();
  testUltrasonic(3);
  testTouch(0);
  testSound(300);
  testBuzzer();
  testMatrix();
  testBT();
  out.println(F("===== 자동 검사 끝 ====="));
  help();
}

void handle(char c, bool fromBT) {
  if (c == '\r' || c == '\n' || c == ' ') return;
  if (fromBT) out.println(F("[블루투스] 수신 OK"));
  if (c >= '1' && c <= '6') sweepServo(c - '1');
  else switch (c) {
    case 'a': allServos90(); break;
    case 'm': testMatrix(); break;
    case 'y': out.println(F("[매트릭스] y=0 행만 표시")); Otto.clearMouth(); for (byte i = 0; i < 8; i++) Otto.setLed(i, 0, 1); break;
    case 'b': testBuzzer(); break;
    case 'u': testUltrasonic(10); break;
    case 'p': scanUltrasonic(); break;
    case 'i': testIMU(10); break;
    case 't': testTouch(5000); break;
    case 's': testSound(2000); break;
    case 'r': autoTests(); break;
    case 'h': help(); break;
    case 'E': readEepromTrims(); break;
    case 'W':  // 선택한 다리 서보(D2~D5)의 현재 트림을 Otto 형식으로 EEPROM 저장, 비어 있는 칸은 0으로
      if (trimIdx < 0 || trimIdx > 3) { out.println(F("다리 서보(1~4)를 선택한 뒤 저장")); break; }
      for (byte i = 0; i < 4; i++) if (EEPROM.read(i) == 255) EEPROM.update(i, 0);
      EEPROM.update(trimIdx, (byte)(int8_t)(trimAngle - 90));
      readEepromTrims(); break;
    case '<': trimStep(-1); break;
    case '>': trimStep(1); break;
    case ',': trimStep(-5); break;
    case '.': trimStep(5); break;
    case 'z': sv.detach(); out.println(F("[트림] 서보 해제")); break;
    case 'n': testBT(); break;
    default: out.print(F("? ")); out.println(c);
  }
}

void setup() {
  Serial.begin(9600);
  BT.begin(9600);
  pinMode(TOUCH, INPUT);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  Wire.begin();
  Wire.setClock(100000);
  Wire.setWireTimeout(3000, true);
  Otto.initMATRIX(M_DIN, M_CS, M_CLK, 1);
  Otto.matrixIntensity(3);
  delay(500);
  autoTests();
}

void loop() {
  if (Serial.available()) handle(Serial.read(), false);
  if (BT.available()) {
    byte b = BT.read();
    if (millis() - btQuiet > 200) { out.print(F("[BT 수신] 0x")); out.print(b, HEX);
      if (b >= 32 && b < 127) { out.print(F(" '")); out.write(b); out.print('\''); }
      out.println(); btQuiet = millis(); }
  }
}
