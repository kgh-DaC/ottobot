# 핀 배치 상세와 근거

| 핀 | 장치 | 방향 | 근거 | 비고 |
|----|------|------|------|------|
| D0/D1 | USB Serial | - | 보드 고정 | 업로드·디버그·USB 제어용. 다른 용도로 쓰지 않는다 |
| D2 | 서보 LeftLeg (YL) | 출력 | bl_motion `#define LeftLeg 2` | Otto.init 1번 인자 |
| D3 | 서보 RightLeg (YR) | 출력 | bl_motion | Otto.init 2번 인자 |
| D4 | 서보 LeftFoot (RL) | 출력 | bl_motion | Otto.init 3번 인자 |
| D5 | 서보 RightFoot (RR) | 출력 | bl_motion | Otto.init 4번 인자 |
| D6 | 서보 왼팔 | 출력 | servo_setup S5, 실물 확인 | Fat 버전 팔 |
| D7 | 서보 오른팔 | 출력 | servo_setup S6, 실물 확인 | |
| D8 | 초음파 TRIG | 출력 | bl_motion `TRIG 8`, 배선도 | |
| D9 | 초음파 ECHO | 입력 | bl_motion `ECHO 9`, 배선도 | Timer1 PWM 상실은 무관 |
| D10 | (비어 있음) | - | Otto_APP은 PIN_ASSEMBLY로 사용 | 필요 시 INPUT_PULLUP 모드 스위치용 |
| D11 | BLE 모듈 TX → Arduino RX | 입력 | bl_motion `SoftwareSerial BT(11, 12)` | |
| D12 | Arduino TX → BLE 모듈 RX | 출력 | bl_motion | 분압 권장 |
| D13 | 수동 부저 | 출력 | bl_motion, passive_buzzer | 내장 LED와 공유 |
| A0 | 터치센서 | 입력 | bl_motion, touch_test | 눌림 HIGH |
| A1 | LED 매트릭스 CLK | 출력 | bl_motion `CLK A1` | |
| A2 | LED 매트릭스 CS | 출력 | bl_motion `CS A2` | |
| A3 | LED 매트릭스 DIN | 출력 | bl_motion `DIN A3` | Orientation 1 |
| A4 | MPU6050 SDA | I2C | 배선도 (SCL SDA 5V GND 헤더) | 하드웨어 I2C 고정 핀 |
| A5 | MPU6050 SCL | I2C | 배선도 | 하드웨어 I2C 고정 핀 |
| A6 | 사운드센서 OUT | 아날로그 | sound_test, 배선도 | 아날로그 전용 |
| A7 | (비어 있음) | 아날로그 | - | |

## 확인이 필요한 항목

- (확인됨) 팔 D6=왼팔, D7=오른팔. 남은 것: "팔을 내린 상태" 각도. 펌웨어에서는 `config.h` 상수로 두고 첫 하드웨어 시험 때 사용자에게 확인받는다.
- MPU6050 장착 방향 (어느 축이 로봇 앞쪽인지). 축 매핑 상수로 둔다.
- 다리 서보 트림 값. Otto 라이브러리 `init(..., true, ...)`은 EEPROM에 저장된 트림을 불러온다.
