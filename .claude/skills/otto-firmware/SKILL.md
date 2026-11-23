---
name: otto-firmware
description: "Arduino Nano 기반 Otto Fat 휴머노이드 로봇 펌웨어(firmware/otto_fat)를 작성·수정·디버깅한다. 서보 6개 보행·팔, LED 매트릭스 표정, 터치·초음파·MPU6050 기울기·사운드 센서, BLE 블루투스 모듈(UART) 명령 처리, 자동 반응(넘어짐·장애물·터치 정지), 메모리 최적화, arduino-cli 컴파일·업로드를 다룬다. '펌웨어', '아두이노 코드', '스케치', '로봇이 안 움직여', '센서 값 이상', 'RAM 부족', '업로드' 요청에 사용한다. 프로토콜 자체 변경은 otto-protocol, 웹 화면은 otto-web을 쓴다."
---

# Otto 펌웨어 작성법

먼저 `otto-hardware` 스킬로 핀과 제약을, `otto-protocol` 스킬로 통신 규칙을 확인한다.

## 목표 동작

- USB 시리얼과 BLE 모듈(SoftwareSerial D11/D12) **양쪽에서** 같은 프로토콜 명령을 받는다. 응답은 명령이 온 쪽으로 보낸다(텔레메트리·이벤트는 마지막으로 명령을 보낸 쪽, 기본 BT). USB로도 받아야 블루투스 없이 웹과 시리얼 모니터로 시험할 수 있다.
- 명령 하나가 실행되는 동안에도 STOP과 안전 반응이 늦지 않아야 한다.
- 센서가 하나 빠져도 나머지 기능은 동작한다.

## 파일 구조 (Arduino IDE에서 그대로 열리는 형태)

```
firmware/otto_fat/
├── otto_fat.ino     setup()/loop() — 얇게 유지, 각 모듈의 update() 호출만
├── config.h         핀, 임계값, 축 매핑, 팔 기본 각도 등 사용자가 바꿀 값
├── protocol.h       생성물 (직접 수정 금지, otto-protocol 스크립트로 생성)
├── comms.h/.cpp     줄 수신(Serial+BT), 파싱, 응답 송신
├── commands.h/.cpp  명령 → 동작 연결 (switch(CMD_*))
├── motion.h/.cpp    Otto 라이브러리 래핑, 연속 동작 스케줄러, 팔 서보
├── sensors.h/.cpp   터치 디바운스, 초음파, MPU6050, 사운드
├── behavior.h/.cpp  자동 반응 상태 머신 (넘어짐 > 터치 > 장애물 > 명령)
└── face.h/.cpp      LED 매트릭스 (입모양, 8x8 비트맵, 상태 표정)
```

모듈 경계는 지켜야 하지만 파일 개수 자체가 목적은 아니다. 작은 모듈은 합쳐도 된다.

## 메모리 규칙 (SRAM 2KB)

| 규칙 | 이유 |
|------|------|
| `String` 클래스 금지. `char buf[PROTO_MAX_LINE+1]` 고정 버퍼 | 힙 단편화로 몇 시간 뒤 멈춤 |
| 상수 문자열은 `F("...")`, 표는 `PROGMEM` | 리터럴은 기본적으로 SRAM에 복사된다 |
| `Serial.print(float)` 대신 정수 | 프로토콜이 정수 전용 |
| 줄 버퍼 2개(USB, BT) + 인자 배열 1개 정도로 끝낸다 | |
| 컴파일 후 RAM ≤ 75% | 스택 여유 500B 이상 확보 |
| SerialCommand 라이브러리 대신 자체 파서 | 버퍼 크기 고정, 메모리 예측 가능 |

## 루프 구조와 블로킹 다루기

Otto 동작 함수는 블로킹(`walk(1, 1000)` = 약 1초)이다. 라이브러리를 다시 쓰지 말고 **한 주기씩 끊어서** 실행한다.

```cpp
void loop() {
  comms.poll();          // 수신된 줄 처리 (STOP이면 즉시 motion.stop())
  sensors.update();      // 주기가 된 센서만 측정 (초음파 60ms, IMU 20ms, 터치 매번)
  behavior.update();     // 안전 반응 판정 — 명령보다 우선
  motion.update();       // 연속 MOVE면 1주기 실행 (여기서만 블로킹)
  telemetry.update();    // 주기 텔레메트리
}
```

- 연속 MOVE는 `motion.update()`가 한 번에 `steps=1`만 실행한다. 다음 주기 전에 루프가 한 바퀴 돌며 STOP과 센서를 확인한다. 최악 반응 지연 = MOVE period(최대 3초). 이를 줄이려면 period 상한을 낮춘다.
- 1회성 동작(GESTURE, SING, TEXT)은 블로킹으로 실행하되 시작 전에 ACK를 보낸다. 실행 중 들어온 명령은 SoftwareSerial 버퍼(64B)에 남아 있다가 처리된다.
- ACK는 **검증 직후·실행 전**, DONE은 실행 후. 연속 MOVE의 DONE은 멈출 때.
- `delay()`는 동작 함수 내부 외에는 쓰지 않는다. 시간 판단은 `millis()` 차이로 한다(오버플로 안전: `millis() - t0 >= dt`).

## 자동 반응 (behavior) 우선순위

`AUTO` 명령의 mask로 각각 켜고 끈다. 기본값은 `config.h`에 둔다(권장: 터치+장애물+넘어짐 = 7).

1. **넘어짐** (MPU6050): |pitch| 또는 |roll| > 60°가 300ms 지속 → 동작 중지, `Otto.detachServos()`와 팔 detach(서보 보호), 슬픈 입, `EVENT FALL`. 상태 FALLEN 동안 동작 명령은 `ERR FALLEN`. 둘 다 < 25°가 1초 지속 → attach, home, `EVENT RECOVER`.
2. **터치**: 눌림 시작 순간 → 동작 정지, home, `S_buttonPushed`, `EVENT TOUCH`. (bl_motion과 같은 의미)
3. **장애물** (초음파): 0 < 거리 < 10cm이고 **앞으로 걷는 중**일 때만 → 정지 후 뒤로 1걸음, `EVENT OBSTACLE`. 제자리 동작 중에 손을 대도 후퇴하면 사용자가 당황한다. 이벤트는 거리가 15cm 이상으로 벗어난 뒤에야 다시 낸다(히스테리시스).
4. **소리** (선택): 임계값 초과 시 `EVENT SOUND`만 보낸다. 서보 동작 중에는 무시.

이벤트 하나가 같은 원인으로 반복 발송되지 않게 상태 변화 시점에만 보낸다.

## 센서 구현 요점

`otto-hardware/references/sensors.md`의 코드와 판정 값을 따른다. 특히:
- `Wire.setWireTimeout(3000, true)` 필수. 부팅 시 WHO_AM_I 확인 실패 → IMU 비활성, INFO의 sensors 비트에서 제외.
- 초음파 `pulseIn` 타임아웃 25ms. 0은 측정 실패로 보고 텔레메트리에 0으로 보낸다.
- 축 매핑·부호는 `config.h` 상수 (`IMU_PITCH_AXIS`, `IMU_PITCH_SIGN` 등).

## 팔 서보

Otto 라이브러리 밖에서 `Servo` 2개로 제어한다. `home()` 때 팔도 `ARM_REST_L/R`(config.h)로 돌린다. 제스처 중 팔을 흔들게 하고 싶으면 `motion`에 간단한 팔 동작 표를 둔다(선택). 넘어짐 시 detach.

## LED 매트릭스

- 입모양: `Otto.putMouth(id)` (0~30).
- 8x8 비트맵 MATRIX 명령: `Otto.setLed(x, y, bit)` 64번. Otto의 `putMouth(bits,false)`는 6×5만 그리므로 8x8 용도로 쓰지 않는다. orientation 1 기준으로 x/y 방향이 웹 편집기와 일치하는지 하드웨어 시험 항목에 넣는다.
- 상태 표정: 부팅 smile, 연결(PING 수신) happyOpen, 넘어짐 sad, 오류 xMouth 정도면 충분하다.

## 부팅 자가진단

`setup()` 끝에서 USB 시리얼로 사람이 읽을 수 있는 진단을 한 번 출력한다(이 줄들은 웹 파서에서 RAW로 처리된다):
`# Otto fat fw <build> proto <ver> | IMU ok(0x68) | US 23cm | touch 0` 그리고 `EVENT BOOT`를 보낸다.

## 컴파일과 업로드

```bash
python .claude/skills/otto-firmware/scripts/compile.py --sketch firmware/otto_fat --log _workspace/fw_compile.log
# 업로드는 사용자가 요청했을 때만 (포트는 사용자에게 확인):
python .claude/skills/otto-firmware/scripts/compile.py --upload --port COM5
```

- 기본 FQBN **`arduino:avr:uno`** (2026-11-24 결정): 이 Nano는 Optiboot라 Uno 정의로 빌드·업로드하면 Flash 32,256B를 쓸 수 있다(Nano 정의는 30,720B). 전체 펌웨어가 Nano 정의 98%였기 때문. 업로드 동기화 실패 시 `OTTO_FQBN=arduino:avr:nano:cpu=atmega328old`(이 경우 Flash 부족 가능).
- Flash 한도 97%(compile.py `--flash-limit`). 대부분은 Otto 라이브러리(제스처·노래)가 차지한다. 기능 추가 전에 여유를 확인한다.
- **업로드할 때는 블루투스 모듈 TX/RX 선이 D0/D1에 연결돼 있지 않은지 확인** (이 설계는 D11/D12라 영향 없음). 업로드 포트는 COM10.
- 다리 트림은 이미 EEPROM에 저장돼 있다(YL −10, 나머지 0). `Otto.init(..., true, ...)`로 불러오고, 펌웨어가 EEPROM 0~3을 다른 용도로 쓰지 않는다.
- 초음파 센서는 현재 응답이 없다(하드웨어 점검 대기). 0 = 측정 실패로 처리하고, 부팅 시 응답이 없으면 INFO sensors 비트에서 빼고 장애물 자동 반응을 끈다.
- MPU6050 0점: 바로 선 상태 pitch≈+6°. `config.h`에 `IMU_PITCH_OFFSET`으로 보정값을 둔다.
- 모듈을 하나 완성할 때마다 컴파일한다. 마지막에 몰아서 컴파일하면 오류 원인을 좁히기 어렵다.

## 하드웨어 없이 검증하는 한계

컴파일 통과는 "로봇이 제대로 걷는다"를 보장하지 않는다. 하드웨어 의존 동작(축 방향, 팔 좌우, 매트릭스 방향, 트림)은 `docs/hardware-test.md`의 시험 항목으로 남기고, 확인 전 가정은 `config.h` 주석에 `// TODO(하드웨어 확인)`으로 표시한다.
