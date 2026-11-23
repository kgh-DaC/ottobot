---
name: otto-hardware
description: "Otto DIY 휴머노이드(Fat 버전) 로봇의 하드웨어 사실(핀 배치, 보드, 서보 6개, LED 매트릭스, 터치·초음파·MPU6050 기울기·사운드 센서, BLE 블루투스 모듈 otto2)과 실물 진단 결과(트림, 매트릭스 방향, 초음파 불량, USB 드라이버 문제)와 전기적 제약을 제공한다. Otto 펌웨어·웹·프로토콜 작업에서 핀 번호, 센서 동작, 타이머 충돌, 전원 문제를 판단해야 할 때 반드시 먼저 읽는다. 일반 Arduino 질문이나 다른 로봇에는 사용하지 않는다."
---

# Otto 하드웨어 기준 정보

이 스킬은 "로봇이 실제로 어떻게 배선돼 있는가"에 대한 단일 기준이다. 핀 번호나 센서 동작을 코드에서 추측하지 말고 여기서 확인한다. 추측한 핀 하나가 서보를 엉뚱하게 움직이거나 센서를 영원히 0으로 읽게 만든다.

## 근거 자료 (ref/)

| 파일 | 알 수 있는 것 |
|------|---------------|
| `ref/bl_motion/bl_motion.ino` | **사용자가 실제로 쓰던 스케치.** 핀 배치의 1순위 근거 |
| `ref/led matrix 회로도.jpg` | 실물 배선도 (Nano 쉴드, 서보 6개, 센서 위치) |
| `ref/servo_setup/servo_setup.ino` | 서보 6개 (D2~D7) 단독 테스트 |
| `ref/touch_test`, `ref/test1` | 터치센서 A0 = 눌림 시 HIGH |
| `ref/sound_test` | 사운드센서 A6 (아날로그, 임계값 약 55) |
| `ref/블루투스 회로도.jpg` | HC-05 일반 배선 예시 (핀 번호는 bl_motion이 우선, 실제 모듈은 BLE) |
| `ref/OttoDIYLib-main/` | Otto 라이브러리 v13 소스와 예제 (`Otto_APP` = 공식 BT 펌웨어) |

배선도와 코드가 다르면 `bl_motion.ino`를 따르고 차이를 보고서에 적는다.

## 핀 배치 요약

자세한 표와 근거는 `references/pinmap.md`를 읽는다.

| 장치 | 핀 |
|------|----|
| 서보: 왼다리 / 오른다리 / 왼발 / 오른발 | D2 / D3 / D4 / D5 |
| 서보: 팔 2개 (Fat 버전 추가분) | D6 / D7 (좌우 구분은 실물 확인 필요) |
| 초음파 TRIG / ECHO | D8 / D9 |
| BLE 모듈 `otto2` (SoftwareSerial RX / TX) | D11 / D12 |
| 수동 부저 | D13 |
| 터치센서 (디지털, 눌림=HIGH) | A0 |
| LED 매트릭스 CLK / CS / DIN (MAX7219 8x8) | A1 / A2 / A3, Orientation 1 |
| MPU6050 SDA / SCL (I2C 0x68) | A4 / A5 |
| 사운드센서 (선택, 아날로그 전용) | A6 |

## 보드와 빌드

- 보드: Arduino Nano 호환 (ATmega328P, Flash 30,720B, **SRAM 2,048B**). Otto Nano 쉴드 사용.
- FQBN: `arduino:avr:nano` (신형 부트로더). 업로드가 `stk500_getsync` 오류로 실패하면 `arduino:avr:nano:cpu=atmega328old`.
- 설치된 도구: `C:\Program Files\Arduino CLI\arduino-cli.exe`, `arduino:avr 1.8.8`, `OttoDIYLib 13.0.0`, `Servo 1.3.0`.
- 기준선: `ref/bl_motion` 컴파일 결과 Flash 58%, RAM 40%(824B). 새 펌웨어는 RAM 75% 이하를 목표로 한다. 남은 SRAM이 500B 미만이면 스택 충돌로 무작위 리셋이 생긴다.

## 반드시 알아야 할 전기·타이머 제약

1. **Servo 라이브러리는 Timer1을 쓴다.** D9, D10의 PWM(analogWrite)이 사라진다. D9는 ECHO 입력이라 문제없다.
2. **`tone()`은 Timer2를 쓴다.** 부저 소리를 내는 동안 D3, D11의 PWM이 꺼진다. D3 서보는 Servo(Timer1) 구동이라 영향 없다.
3. **SoftwareSerial은 바이트를 받는 동안 인터럽트를 막는다** (9600bps에서 바이트당 약 1ms). 서보 펄스가 살짝 흔들릴 수 있다. 명령을 짧게 유지하는 것이 최선의 대책이다.
4. **SoftwareSerial 수신 버퍼는 64바이트**다. Otto 동작 함수는 블로킹이라 `walk(1, 1000)` 동안 1초간 읽지 못한다. 그 사이 64바이트가 넘게 들어오면 버린다.
5. **`pulseIn()`은 블로킹**이다. 타임아웃을 25ms 이하(약 4m)로 둔다. 초음파가 연결 안 되면 0이 나오므로 0은 "측정 실패"로 다룬다.
6. **A6/A7은 아날로그 전용**이다. `digitalRead` 불가.
7. **MPU6050이 빠지거나 배선이 끊기면 `Wire`가 영원히 멈출 수 있다.** AVR 코어 1.8.x의 `Wire.setWireTimeout(3000, true)`을 반드시 켠다.
8. **BLE 모듈 RX는 3.3V 로직**이다(브레이크아웃 보드에 레벨 변환이 없으면). Arduino TX(D12) → 모듈 RX 사이에 분압 저항(1k/2k)을 권장한다. 통신이 한쪽만 될 때 첫 의심 대상이다.
9. **서보 6개를 동시에 움직이면 전류가 1A를 넘는다.** USB 전원만으로는 브라운아웃 리셋(부팅음이 반복됨)이 날 수 있다. 증상이 보이면 코드보다 전원을 먼저 의심하라고 사용자에게 안내한다.

## 블루투스 모듈 `otto2` — **BLE** (실측으로 정정됨)

- 장치 이름 **`otto2`**, MAC `98:DA:50:03:53:D9`. Windows가 `BTHLE`(Bluetooth Low Energy) 장치로 등록하고 **COM 포트를 만들지 않았다.** 처음에 사용자는 HC-05 클래식이라고 답했지만 실측 결과 BLE UART 모듈(HM-10/HC-08/AT-09 계열)이다. PC에 페어링된 `ROBOT10`, `BIKE`는 이 로봇이 아니다.
- 따라서 웹은 **Web Bluetooth API**로 연결한다(Web Serial 불가). Chrome/Edge 데스크톱·안드로이드 Chrome 지원, iOS Safari 미지원. ref의 OttoWebAppControl이 같은 방식이다.
- BLE UART 서비스는 HM-10/CC2541 계열이 보통 서비스 `0xFFE0`, 특성 `0xFFE1`(notify + write-without-response) 하나로 송수신한다. HC-08 등은 다를 수 있으므로 `optionalServices`에 후보를 넣고 실제 연결 시 서비스 목록을 로그로 확인한다.
- BLE 패킷은 한 번에 최대 20바이트. 웹은 한 줄을 20바이트 단위로 나눠 쓰고, 수신은 notify 조각을 이어 붙여 `\n`으로 자른다.
- 모듈 ↔ Arduino 쪽은 그대로 UART 9600bps, 8N1 (D11 RX / D12 TX, SoftwareSerial). 펌웨어 입장에서는 클래식이든 BLE든 차이 없다.
- 2026-11-24 진단: D11/D12 라인에 잡음·되먹임 없음. 실제 BLE 송수신은 아직 미확인.
- 같은 프로토콜을 USB 시리얼(`Serial`)로도 받으면 블루투스 없이 USB 케이블 + Web Serial로 시험할 수 있다(아래 USB 주의 참고).

## USB 시리얼 (COM10, FTDI FT232 호환칩) 주의

- 이 보드의 USB-시리얼은 **로봇이 아무것도 보내지 않을 때 드라이버가 마지막 데이터를 반복해서 돌려준다**(초당 수백 KB, 9600bps로는 불가능한 양). 호환칩 + FTDI 드라이버 조합의 알려진 증상으로, pyserial·.NET 모두 같다.
- 대책: PC에서 USB로 읽는 도구는 줄 순번(`@0001 `)으로 중복을 거른다(`tools/pin_check/read_diag.py` 참고). 펌웨어의 USB 출력은 디버그용으로만 쓰고, 웹 연결의 기본 경로는 BLE로 한다. USB로 웹을 시험한다면 프로토콜 줄에도 같은 문제가 생길 수 있음을 QA 항목에 넣는다.
- 업로드는 정상 동작한다 (`arduino:avr:nano`, COM10).

## 2026-11-24 실물 진단 결과 (`tools/pin_check`)

| 항목 | 결과 |
|------|------|
| 서보 D2~D7 | 정상. D2 왼다리, D3 오른다리, D4 왼발목, D5 오른발목, **D6 왼팔, D7 오른팔** |
| 다리 트림 (EEPROM 0~3, Otto 형식) | **YL(D2) = −10**, YR = 0, RL = 0, RR = 0 저장 완료. D2는 +방향이 로봇 안쪽 회전 |
| LED 매트릭스 | Orientation 1에서 `setLed(0,0)` = 정면에서 본 왼쪽 위, y=0 = 맨 위 가로줄. 웹 편집기와 같은 좌표계 |
| MPU6050 | 0x68, WHO_AM_I 0x68. 바로 선 상태 ax≈1850 ay≈−290 az≈17000 → pitch≈+6°, roll≈0°. 기울기 0점 보정 필요(pitch −6°). 앞으로 기울일 때 부호는 미확인 |
| 터치 A0 | 평상시 0. 눌림 미확인 |
| 사운드 A6 | 배경 51~54 |
| 부저 D13 | 정상 |
| **초음파 D8/D9** | **응답 없음.** D8/D9/D10 모든 조합 0cm, 4선 연결 확인됨 → 센서 불량 또는 Vcc/Gnd 역결선 의심. 사용자 하드웨어 점검 필요. 펌웨어는 초음파 없이도 동작해야 함 |

## 센서별 동작

자세한 측정 방법과 판정 값은 `references/sensors.md`를 읽는다. 핵심만:

- **터치 (A0)**: TTP223 계열 디지털 모듈. 눌림 HIGH. 30ms 이상 유지될 때만 눌림으로 본다(디바운스).
- **초음파 (D8/D9)**: HC-SR04. 거리(cm) = 왕복시간(us) / 58. 측정 간격 최소 60ms. 0 = 실패.
- **MPU6050 (I2C 0x68)**: 가속도만으로 pitch/roll을 구해도 정지·저속 보행에는 충분하다. WHO_AM_I(0x75) = 0x68이면 정상. 장착 방향을 모르므로 축 매핑을 설정값으로 둔다.
- **사운드 (A6)**: 선택 사항. 아날로그 값 > 임계값이면 소리 감지.

## Otto 라이브러리

동작·제스처·노래·입모양 ID 목록과 API는 `references/otto-lib-api.md`를 읽는다. Otto 라이브러리는 다리 서보 4개만 다룬다. 팔 서보 2개는 별도 `Servo` 객체로 직접 제어해야 한다.
