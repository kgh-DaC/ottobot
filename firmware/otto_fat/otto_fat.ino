// Otto Fat 휴머노이드 펌웨어 - protocol version 1
// 구조: otto-firmware 스킬. 명세: docs/protocol.md, docs/behavior.md
#include "config.h"
#include "protocol.h"
#include "comms.h"
#include "sensors.h"
#include "motion.h"
#include "face.h"
#include "behavior.h"
#include "commands.h"

// Print::print(int) 대신 itoa로 출력 (Flash 절약)
static void putNum(Print& u, int16_t v, uint8_t base) {
  char tmp[8];
  itoa(v, tmp, base);
  u.write((const uint8_t*)tmp, strlen(tmp));
}

static void bootDiag() {   // USB 전용 사람용 진단, '#' 시작 → 웹 RAW
  Print& u = comms_usb();
  u.print(F("# Otto fat fw "));  putNum(u, FW_BUILD, 10);
  u.print(F(" proto "));          putNum(u, PROTO_VERSION, 10);
  u.print((sensors_present() & SENS_IMU) ? F(" | IMU ok(0x") : F(" | IMU none(0x"));
  putNum(u, sensors_imuWhoAmI(), 16);
  u.print(F(") | US "));
  if (sensors_present() & SENS_US) { putNum(u, sensors_distance(), 10); u.print(F("cm")); }
  else u.print(F("none"));
  u.print(F(" | touch "));        putNum(u, sensors_touch() ? 1 : 0, 10);
  u.print(F(" | auto "));         putNum(u, behavior_auto(), 10);
  u.print(F("\n"));
}

void setup() {
  comms_begin();                  // 1. USB + BT 9600
  motion_begin();                 // 2~3. Otto.init(트림 EEPROM 로드), 홈, 팔 90°
  face_begin();                   // 4. 매트릭스
  sensors_begin();                // 5~6. IMU, 초음파 감지
  behavior_begin();               // 7. AUTO = 7 & 가용 센서, TELEM 0
  face_mouth(10);                 // 8. smile + 부팅음
  motion_singLib(S_connection);
  bootDiag();
  behavior_bootReport();          // 9. 두 포트로 i, v 6
}

void loop() {
  // behavior.md 2절 순서: 센서 → 안전 판정 → 명령 → 동작.
  // STOP은 MOVE 주기 직전 poll에서 처리되므로 지연은 기존과 같다(최대 한 주기).
  sensors_update();
  behavior_safety();              // 넘어짐 > 터치 > 장애물 (+소리)
  comms_poll(commands_handle);    // 입력 (완성된 줄은 도착 순서대로 처리)
  behavior_motion();              // watchdog 판정(poll 직후) → MOVE 1주기 / AVOID 1걸음
  commands_tick();                // 6. TONE 종료
  behavior_telemetry();
}
