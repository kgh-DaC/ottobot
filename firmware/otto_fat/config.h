// config.h - 사용자가 바꿀 값(핀, 임계값, 축 매핑, 기본 각도)은 모두 여기에.
// 핀 근거: otto-hardware 스킬 핀 표 + 2026-11-24 실물 진단, ref/bl_motion/bl_motion.ino
#pragma once
#include <Arduino.h>

#define FW_BUILD 1

// ---- 서보 (실물 확인 완료) ----
#define PIN_YL 2          // 왼다리
#define PIN_YR 3          // 오른다리
#define PIN_RL 4          // 왼발목
#define PIN_RR 5          // 오른발목
#define PIN_ARM_L 6       // 왼팔 (실물 확인)
#define PIN_ARM_R 7       // 오른팔 (실물 확인)
#define LOAD_TRIM_EEPROM true   // EEPROM 0~3 = Otto 트림(YL -10). 다른 용도로 쓰지 않는다

#define ARM_REST_L 90     // TODO(하드웨어 확인): 팔 내린 각도(요구사항 가정 90)
#define ARM_REST_R 90     // TODO(하드웨어 확인)
// 팔 방향: 명령 각도가 커지면 두 팔 모두 '손을 든다'로 통일. -1이면 서보에 (180 - 각도)를 쓴다.
// 2026-11-24 실물: 왼팔은 각도↑=들기, 오른팔은 각도↑=내리기(좌우 대칭 장착) → 오른팔 반전
#define ARM_DIR_L 1
#define ARM_DIR_R -1
#define ARM_DETACH_MS 500 // 팔 각도를 쓴 뒤 이 시간이 지나면 신호를 끊는다. 계속 붙여 두면 SoftwareSerial(BT) 송수신 때 서보 펄스가 흔들려 팔이 떤다(2026-11-24)

// ---- 부저 / 매트릭스 ----
#define PIN_BUZZER 13
#define PIN_MTX_DIN A3
#define PIN_MTX_CS  A2
#define PIN_MTX_CLK A1
#define MTX_ORIENTATION 1
#define MTX_INTENSITY 1
// 실물 확인: Orientation 1에서 setLed(0,0)=정면 왼쪽 위, y=0=맨 위 행.
// MATRIX r0=맨 위 행, bit7=왼쪽 칸 → setLed(x, y, bit(7-x) of r[y]). 반전이 필요하면 1.
#define MTX_FLIP_X 0
#define MTX_FLIP_Y 0
#define TEXT_SCROLL_SPEED 80

// ---- 센서 ----
#define PIN_TOUCH A0      // 눌림 HIGH
#define PIN_TRIG 8
#define PIN_ECHO 9
#define PIN_SOUND A6      // 아날로그 전용

#define TOUCH_RESAMPLE_N 3      // 디바운스: 처음 본 순간 10ms 간격 3회 재샘플(총 30ms), 모두 같으면 확정
#define TOUCH_RESAMPLE_MS 10
#define US_INTERVAL_MS 60
#define US_TIMEOUT_US 25000UL
#define US_BOOT_TRIES 5   // 부팅 감지: 5회 모두 0이면 부재

#define IMU_ADDR 0x68
#define IMU_INTERVAL_MS 20
#define IMU_GAP_RESET_MS 60   // 샘플 간격이 이보다 길면(블로킹 뒤) 필터를 새 값으로 초기화
#define IMU_FAIL_LIMIT 3  // 연속 실패 시 비활성(e 5 0)
// 축 매핑: 0=ax, 1=ay, 2=az. 실측(바로 선 상태) ax≈1850 ay≈-290 az≈17000.
// pitch = atan2(A[PITCH], sqrt(A[ROLL]^2 + A[UP]^2)), roll = atan2(A[ROLL], A[UP])
// 2026-11-24 실물: 좌우로 기울이면 pitch가 변함 → 센서 장착 방향이 90° 돌아가 있음. pitch=ay, roll=ax로 교체
#define IMU_PITCH_AXIS 1
#define IMU_ROLL_AXIS  0
#define IMU_UP_AXIS    2
#define IMU_PITCH_SIGN 1  // TODO(하드웨어 확인): 앞으로 기울일 때 pitch가 +인지
#define IMU_ROLL_SIGN  1  // TODO(하드웨어 확인): 오른쪽/왼쪽 기울기 부호
// 원시 각도에 더한 뒤 SIGN을 곱함. 실측 0점 +6°는 ax축(축 교체 전 pitch) 값이므로 roll로 옮김
#define IMU_PITCH_OFFSET 0
#define IMU_ROLL_OFFSET  (-6)  // TODO(하드웨어 확인): 바로 선 상태 roll ±3° 이내인지

// ---- 자동 반응 (behavior.md 3절) ----
#define AUTO_DEFAULT 7            // 터치+장애물+넘어짐, & 가용 센서
#define FALL_DEG 60
#define FALL_HOLD_MS 300          // IDLE 등: 필터 값이 60° 초과 300ms 지속
#define FALL_MOVING_SAMPLES 2     // MOVING/AVOID: 주기 끝 원시 샘플이 60° 초과 2회 연속 (behavior.md와 다름, QA fw_4)
#define FALL_INSTANT_DEG 75       // MOVING/AVOID: 원시 샘플 하나가 75° 초과면 즉시 (behavior.md와 다름)
#define TOUCH_BEEP_HZ 1500        // 터치 정지 신호음 (비블로킹 tone)
#define TOUCH_BEEP_MS 80
// 멈춰 있을 때(IDLE) 터치하면 인사 (AUTO 1, 2026-11-26 사용자 요청): 제스처(프로토콜 id, 1 = 기쁨 OttoHappy)
// → 글자 흐르기 → 다리 원위치(홈)
#define TOUCH_GREET_GESTURE 1
#define TOUCH_GREET_TEXT "HELLO"
#define RECOVER_DEG 25
#define RECOVER_HOLD_MS 1000
#define OBST_TRIGGER_CM 10
#define OBST_RELEASE_CM 15
#define AVOID_STEPS 2             // 가정: 뒤로 2걸음
#define AVOID_PERIOD 1000
#define SOUND_THRESHOLD 70        // 가정: 배경 51~54
#define SOUND_COOLDOWN_MS 2000
#define SOUND_AFTER_MOTION_MS 500
#define SOUND_FACE_MS 1000
#define FALL_MOUTH 26             // xMouth (가정)

#define MOVE_WATCHDOG_MS 1500
#define MOVE_LOCKOUT_MS 1000     // 자동 정지(터치·장애물 후퇴 끝·watchdog) 직후 MOVE 거부(e 3 77) 시간
#define SERVO_MOVE_MS 300
#define TELEM_MIN_MS 100
#define TELEM_MOVING_MIN_MS 500
#define BT_BAUD 9600
#define PIN_BT_RX 11   // 모듈 TX → D11 (2026-11-24 실물 확인)
#define BT_LINE_GAP_MS 20   // BT로 한 줄 보낸 뒤 쉬는 시간. 연속 4줄(PING 응답)을 몰아 보내면 BLE 모듈이 연결을 끊음(2026-11-24 진단)
#define PIN_BT_TX 12   // D12 → 모듈 RX (실물 확인. ref/블루투스 회로도.jpg의 D10/D11과 다름)
