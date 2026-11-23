# 펌웨어 노트 — firmware/otto_fat (protocol v1, FW_BUILD 1, 2026-11-24)

## 빌드 설정
- **FQBN 기본값 `arduino:avr:uno`** (compile.py 기본값, 리더 결정). 보드는 그대로 Nano(ATmega328P, 16MHz)다.
- 이유: `arduino:avr:nano`는 구형 부트로더 2KB를 빼서 Flash 한도가 30,720B다. 최종 펌웨어가 30,186B(98%)로 여유가 534B뿐이었다. `uno` 정의는 칩과 클럭이 같고, 0.5KB짜리 Optiboot를 전제로 해서 한도가 32,256B다. 같은 바이너리가 93%가 되고 여유는 약 2KB다.
- 전제: 이 Nano는 신형(Optiboot) 부트로더다. `arduino:avr:nano`(115200bps 업로드)로 COM10 업로드에 성공한 기록이 근거다. 구형 부트로더 보드에 uno로 업로드하면 sync가 실패한다. 이 경우 30,720B 안에 들도록 기능을 줄여야 하고 `OTTO_FQBN=arduino:avr:nano:cpu=atmega328old`로 빌드한다.
- compile.py 판정: RAM ≤ 75%, **Flash ≤ 97%**(추가됨).
- **`arduino:avr:nano`(30,720B) 정의로는 들어가지 않는다(현재 30,590B = 99.6%, 97% 한도 초과). uno FQBN이 필수다.** nano 정의에 맞추려면 기능을 줄여야 하는데, 리더 결정으로 하지 않는다.

## 컴파일 결과 (`_workspace/fw_compile.log`)
| 단계 | Flash | RAM |
|------|-------|-----|
| comms (nano 기준) | 4134 B (13%) | 422 B (20%) |
| + sensors (nano) | 10106 B (32%) | 674 B (32%) |
| + motion + face (nano) | 16572 B (53%) | 1149 B (56%) |
| 최종, nano 정의 | 30186 B (98%, 남은 534 B) | 1276 B (62%) |
| 최종, uno 정의 (fw_4 QA 전) | 30186 B (93%) | 1276 B (62%) |
| fw_4 QA 반영 후 | 30456 B (94%) | 1277 B (62%) |
| **r1 QA 반영 후 (현재, MOVE 잠금 +134 B)** | **30590 B (94%, 97% 한도까지 698 B)** | **1281 B (62%, 남은 767 B)** |

경고 0. `check_contract.py`: 오류 0, 경고 0.

**Flash 여유**: uno 정의로 약 2KB가 남는다. 97% 한도까지는 약 1.1KB다. 공간 대부분은 Otto 라이브러리(playGesture, sing, tone, 이동 함수 21종)가 쓴다. libm atan2/sqrt를 근사식으로 바꿔 보니 오히려 368B 늘어서 되돌렸다. 더 필요하면 줄일 후보는 부팅 진단 줄(약 200B), TEXT 스크롤(writeText + 폰트, 약 1KB), 소리 반응이다.

## 파일 구조
| 파일 | 내용 |
|------|------|
| `otto_fat.ino` | setup(부팅 순서 behavior.md 8절), loop: poll → sensors → safety → motion(watchdog) → tone tick → telemetry |
| `config.h` | 핀, 임계값, IMU 축·부호·0점, 팔 기본 각도, 매트릭스 방향 |
| `comms.*` | BT(SoftwareSerial D11/D12) + USB 줄 버퍼(각 48B), 파서(int16 엄격 검사), 송신 도우미, 재진입 가드 |
| `commands.*` | `switch(CMD_*)` 검증 → ACK → 실행 → DONE, 상태별 거부(BUSY/FALLEN), TONE 비블로킹 |
| `motion.*` | Otto 래핑, MOVE id 0~20 1주기 실행, 팔 Servo 2개, 트림 RAM 사본, 제스처(id-1)·노래(PROGMEM 상수 표) 변환 |
| `sensors.*` | 터치 30ms 디바운스, 초음파 부팅 감지(5회)·60ms·중앙값3, MPU6050(WHO_AM_I, 필터 0.8/0.2, 3회 실패 시 비활성), A6 |
| `behavior.*` | 상태 머신, 넘어짐 > 터치 > 장애물 > 소리, MOVE watchdog, AVOID 2걸음, 텔레메트리 |
| `face.*` | 입모양, 8x8 MATRIX(r[y] bit(7-x) → setLed(x,y)), 텍스트(9자 지역 버퍼 대문자화), 얼굴 기억·복원 |

## 구현 요약 (명세 대응)
- 응답은 명령이 온 포트로, 텔레메트리·이벤트는 활성 포트(마지막 ACK 받은 포트, 기본 BT), 부팅 `i`·`v 6`은 두 포트. 디버그는 USB만 `#` 시작.
- ACK = 검증(토큰→인자 개수·정수·범위→상태) 직후. 거부는 ERR만.
- 연속 MOVE: `g_state = MOVING`, loop마다 1주기. 재수신(keepalive·교체)은 `a 77`만, 주기 유지.
- **MOVE watchdog**: `behavior_motion()`에서 poll 직후(주기 종료 후 입력을 모두 읽은 뒤) `millis() - g_lastValidRx > 1500`이면 홈 + 팔 90° + `d 77`(MOVE 포트) + IDLE. `g_lastValidRx`는 ACK 순간(올바른 줄)에만 갱신, ERR·빈 줄·깨진 줄은 불인정.
- MOVING 중 1회성 명령(M0 H K W G C): `a xx` → `d 77` → 실행 → `d xx`.
- STOP: `a 83` → (MOVING이면 `d 77`, AVOID면 해제) → TONE 중이면 `d 84` → FALLEN이 아니면 홈 → `d 83`.
- TONE: `tone()` 비블로킹, 새 T/S 시 새 ACK 뒤 앞 `d 84`.
- 넘어짐: 60°·300ms → detach(다리+팔) → xMouth(26) → `v 3 각도` → 움직이던 중이면 `d 77`. 회복 25°·1s → attach, 홈, 팔 90°, smile, `v 4 0`. AUTO에서 비트 4 해제 시 `v 4 1`. 실행 중 IMU 3회 연속 실패 → `e 5 0`, 비트 제거, 강제 회복, `i` 재전송.
- 터치: 눌림 시작마다 `v 1 1`(AUTO와 무관). AUTO 1 + MOVING/AVOID면 홈, (MOVING이면) `d 77`, S_buttonPushed 신호음.
- 장애물: 초음파가 있을 때만 측정. 1~10cm 처음 성립 시 `v 2 cm`, 15cm 초과 또는 0에서 재무장. AUTO 2 + 전진 계열(1/9/12) MOVING이면 `d 77` → AVOID → 뒤로 2걸음(걸음마다 loop 1바퀴) → 홈 → IDLE.
- 소리: AUTO 8, IDLE에서만, 쿨다운 2s, 동작 종료 후 500ms 무시, `v 5 값` + bigSurprise 1s 후 얼굴 복원.
- 센서 부재: 초음파 5회 모두 0이면 SENS_US 제외, AUTO 2 제외, 이후 pulseIn 안 함. MPU WHO_AM_I 0x68/0x70/0x72가 아니면 제외, pitch·roll 0.
- 트림: `Otto.init(..., true, 13)`로 EEPROM 0~3 로드, 같은 방식으로 RAM 사본(TRIMS 응답용). EEPROM은 TRIM save=1일 때 `saveTrimsOnEEPROM()`으로만 쓴다(0~3, Otto 형식). 그 밖에 EEPROM 사용 없음.

## QA fw_4 반영: 명세(behavior.md)와 달라진 점 (arch 문서 반영 필요)
원인은 같다. MOVING/AVOID 중에는 loop가 블로킹 주기(period 400~3000ms)마다 한 번만 돌아서, loop 횟수에 기대는 판정이 주기 수만큼 늦어진다. 그래서 판정 기준을 샘플 시점과 시간으로 바꿨다.
| 항목 | behavior.md | 구현 (config.h) |
|------|-------------|-----------------|
| 넘어짐, MOVING/AVOID 중 | 필터 값 60° 초과가 300ms 지속 | 필터를 거치지 않은 주기 끝 원시 샘플이 60° 초과 **2회 연속**(`FALL_MOVING_SAMPLES 2`)이면 FALLEN. 또는 원시 샘플 1개가 **75° 초과**(`FALL_INSTANT_DEG 75`)면 즉시 FALLEN. 지연은 최대 2주기 |
| 넘어짐, IDLE 등 | 필터 + 300ms | 그대로. 샘플 간격이 60ms를 넘으면(블로킹 뒤) 필터를 새 값으로 초기화한다(`IMU_GAP_RESET_MS`) |
| 회복 | 25° 미만 1s | 그대로 (FALLEN은 loop가 빠르다) |
| 터치 디바운스 | 30ms 같은 값 유지 | 확정 상태와 다른 값을 처음 본 순간 10ms 간격으로 3회 재샘플(총 30ms, `TOUCH_RESAMPLE_N/MS`)한다. 모두 같으면 확정. loop 속도와 무관하다. 블로킹 동작(MOVE 주기, 제스처 등) 중 눌렀다 뗀 터치는 놓친다(물리적 한계) |
| 터치 정지 신호음 | 없음 | 비블로킹 `tone(1500Hz, 80ms)`(`TOUCH_BEEP_HZ/MS`). 예전의 블로킹 S_buttonPushed는 없앴다 |
| loop 순서 | 입력 → 넘어짐 → 터치 → 장애물 → 명령/MOVE | 센서 → 안전 판정 → poll(명령 처리) → watchdog → MOVE 1주기. STOP은 MOVE 주기 직전 poll에서 처리되므로 지연은 최대 한 주기로 그대로다 |
| 첫 PING 표정 | 없음 | 없앴다(MATRIX 그림을 지우지 않게). 표정은 부팅 smile만 유지한다 |
| TONE 종료 | - | 종료·중단 때 `motion_markEnd()`를 불러 소리 반응 쿨다운(500ms) 기준으로 삼는다 |
| **자동 정지 후 MOVE 잠금 (r1, 리더 결정)** | - | 터치 정지(MOVING 또는 AVOID 중), 장애물 후퇴 종료, watchdog 정지에서 잠금을 건다. 시간은 home을 마치고 IDLE이 된 시점부터 센다(behavior.md 4절 확정본). `MOVE_LOCKOUT_MS`(1000ms) 동안 MOVE(id 0 포함)는 `e 3 77`(BUSY)로 거부하고 ACK·동작은 없다. STOP과 그 밖의 명령은 정상 처리. 잠금은 millis 경과로만 풀린다. 정지 처리(안전 판정·watchdog) 시점에 잠금이 걸리므로, 같은 loop의 poll이 버퍼에 남은 keepalive `M`을 읽어도 거부된다. STOP으로 멈춘 경우와 넘어짐은 잠금 대상이 아니다(넘어짐은 FALLEN이 `e 6`으로 막는다) |

## 가정 (behavior.md 가정 그대로 + 펌웨어 결정)
- 팔 기본 90°/90°, 전진 계열 1/9/12, AVOID 2걸음 period 1000, 소리 임계 70, 넘어짐 입모양 26, SERVO 보간 300ms, 부팅음 S_connection.
- 제스처 후에는 제스처 이전에 기억된 얼굴(입모양 또는 MATRIX)로 되돌린다.
- 텍스트 스크롤 속도 80 (`TEXT_SCROLL_SPEED`).
- 매트릭스 밝기 1 (`MTX_INTENSITY`).
- Otto 라이브러리 `home()`은 홈 후 다리 서보를 detach한다(라이브러리 동작, bl_motion과 같음). IDLE에서 다리는 힘이 빠져 있고 팔은 붙어 있다.

## 하드웨어 확인 필요 (config.h `TODO(하드웨어 확인)`)
1. IMU pitch 부호: 앞으로 기울일 때 + 인지 → 아니면 `IMU_PITCH_SIGN -1` (0점 보정은 부호 전에 적용되므로 그대로 둔다).
2. IMU roll 부호·축 매핑(`IMU_*_AXIS`).
3. 바로 선 상태 텔레메트리 pitch ≈ 0, roll ≈ 0 인지.
4. 팔 기본 각도 90°가 "내린 자세"인지, ARMS left/right가 실제 왼팔(D6)/오른팔(D7)인지.
5. MATRIX 방향: `X 128 0 0 0 0 0 0 0` → 정면 왼쪽 위 한 점, `X 0 0 0 0 0 0 0 1` → 오른쪽 아래 한 점. 다르면 `MTX_FLIP_X/Y`.
6. 터치 눌림 → `v 1 1` (실물에서 눌림 미확인 상태). 걷는 중 짧게 터치했을 때 정지하는지, 주기 사이에 끝난 탭을 놓치는 정도가 어떤지.
6-1. 걷는 중 넘어졌을 때 FALLEN까지 걸리는 시간(예상 1~2주기). 보행 진동으로 원시 샘플이 75°를 넘는 오감지가 있는지.
7. 초음파: 현재 부팅 진단이 `US none`, INFO `i 1 1 1 5` 예상. 배선 수리 후 리셋하면 `sensors=3`, `auto=7`.
8. 넘어짐 60°·회복 25° 실측, 서보 detach 확인.
9. watchdog: 전진 중 BLE 끊기 → period + 1.5s 안에 정지와 `d 77`(USB 쪽에서 관찰은 불가, BT 응답).
10. 서보 6개 동시 구동 시 전원 브라운아웃(부팅음 반복) 여부.
11. 부팅 USB 진단 예: `# Otto fat fw 1 proto 1 | IMU ok(0x68) | US none | touch 0 | auto 5`.

## 업로드
하지 않았다. 리더 지시 시 `python .claude/skills/otto-firmware/scripts/compile.py --sketch firmware/otto_fat --upload --port COM10`(기본 uno 정의, 115200bps Optiboot)로 한다. 업로드가 sync 오류로 실패하면 부트로더가 구형이라는 뜻이다. 이때는 위 빌드 설정의 대안대로 기능을 줄여야 한다.
