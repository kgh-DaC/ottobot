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

static void bootDiag() {   // USB 전용 사람용 표시, '#' 시작 → 웹 RAW. 센서 유무는 뒤따르는 i·v 6 줄을 본다
  comms_usb().print(F("# Otto fat fw 1\n"));   // Flash 30,720B 한도 때문에 숫자 출력 없이 고정 문자열(2026-11-26)
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
  motion_tick();                  // 팔 서보 detach (BT 송수신 중 떨림 방지)
  behavior_telemetry();
}
