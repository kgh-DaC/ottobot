# QA 보고 - 2026-11-24 firmware (단계 3, behavior + commands 모듈)

참고: 지시된 `_workspace/qa_compile_fw4.log`는 존재하지 않았다. 컴파일을 다시 실행했고 로그는 `_workspace/qa_compile_fw4b.log`다. 제품 코드는 수정하지 않았다.

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| gen_protocol --check | 통과 | protocol.h, protocol.js 일치 |
| check_contract | 오류 12 / 경고 0 | 오류 전부 `[웹] 명령 X 송신 코드 없음`(12종). 펌웨어 쪽 오류 0(이전 31 -> 12). 웹은 미구현으로 분류 |
| test_protocol_js | 통과 | 통과 224, 실패 0 |
| compile.py (otto_fat, arduino:avr:uno) | 통과 | 경고 0, Flash 30186B (93%, 한도 97%), RAM 1276B (62%), 남은 772B |
| node --check web/js/*.js | 통과 | 9개 파일 문법 오류 없음 |

## 이전 결함 해결 여부
| 출처 | 결함 | 상태 | 근거 |
|---|---|---|---|
| fw_1 | comms_poll 재진입 | 해결 | `comms.cpp:59-60` 가드. loop() 한 지점(`otto_fat.ino:203`)에서만 poll, 핸들러는 poll을 부르지 않음 |
| fw_1 | comms_send 경계 | 해결 | `comms.cpp:117,125` |
| fw_3 | [주요] GESTURE/SING id 변환 | 해결 | `motion.cpp:386` `OttoHappy+(id-1)`. `:389-393` SONGS 표를 `Otto_sounds.h`(S_connection=0, S_disconnection=1, S_buttonPushed=2, S_mode1..3=3..5, S_surprise=6, S_OhOoh=7, S_OhOoh2=8, S_cuddly=9, S_sleeping=10, S_happy=11, S_superHappy=12, S_happy_short=13, S_sad=14, S_confused=15, S_fart1..3=16..18)와 대조: 프로토콜 1~19 순서(connection, disconnection, surprise, OhOoh, OhOoh2, cuddly, sleeping, happy, superHappy, happy_short, sad, confused, fart1~3, mode1~3, buttonPushed)와 일치. 제스처 enum은 `Otto_gestures.h:8-20` 0~12로 연속 |
| fw_3 | [경미] motion_sing markEnd 누락 | 해결 | `motion.cpp:397` |
| fw_3 | [경미] 제스처 후 얼굴 불일치 | 해결 | `commands.cpp:161` `face_restore()` |
| fw_3 | [경미] face_text 시그니처 | 해결 | `face.cpp:43` `const char*`, 지역 `buf[10]` |
| fw_3 | 미구현 항목(BAD_ARG, TRIM save 기본 1, TRIMS 송신, MOUTH 범위) | 구현 확인 | `commands.cpp:48-87, 79, 106-108` |

## 결함 (심각도순)

치명 0건, 주요 2건, 경미 4건. 두 주요 결함은 모두 "센서를 loop당 1번만 읽는데 MOVING 중 loop 간격이 period(400~3000ms)"라는 같은 뿌리다.

### [주요] MOVING 중 IMU 저역통과 필터가 주기당 1샘플만 갱신되어 넘어짐 감지가 수 주기 늦음
- 담당: firmware (sensors)
- 위치: `sensors.cpp:556-560`(20ms 게이트, loop당 1회), `:530-534`(f = f*0.8 + new*0.2)
- 근거: MOVING에서 loop는 `motion_cycle()`(블로킹, period ms)마다 한 번 돈다. 그 사이 IMU 샘플은 1개다. 필터 가중치 0.2에서 값이 0도에서 약 90도로 바뀌면 60도를 넘기까지 샘플 5개(1-0.8^5 = 0.67), 거기에 300ms 유지 판정(`behavior.cpp:322`)이 다음 loop에서 한 번 더 필요하다. 즉 약 6주기다. 계산값이고 하드웨어 측정값은 아니다.
- 영향: 걷다가 넘어져도 period 1000이면 약 6초, 3000이면 약 18초간 서보가 계속 구동된다(웹 keepalive가 watchdog을 계속 풀어 준다). behavior.md 4절은 "블로킹 동작 중에는 감지 못함, 끝난 뒤 첫 300ms 안에 판정"이라고 했는데 MOVING 중에는 이 약속이 지켜지지 않는다.
- 수정 제안: `imuUpdate`에서 이전 샘플과의 간격이 `IMU_INTERVAL_MS*3` 이상이면 필터를 새 값으로 다시 초기화한다(`s_imuFirst = true` 재사용). 필요하면 `s_fallT` 유지 시간도 샘플 2개 연속 초과로 판정한다.

### [주요] 터치 디바운스가 loop 2회 연속 HIGH를 요구해 MOVING 중 터치 정지가 최소 한 주기 이상 눌러야 동작
- 담당: firmware (sensors)
- 위치: `sensors.cpp:541-546`
- 근거:
  ```
  if (raw != s_touchRaw) { s_touchRaw = raw; s_touchChange = now; }
  else if (raw != s_touchStable && now - s_touchChange >= TOUCH_DEBOUNCE_MS) { ... s_touchEdge = true; }
  ```
  첫 loop에서 HIGH를 처음 본 시각만 기록하고, 확정은 30ms 뒤의 다음 loop 샘플에서 한다. MOVING/AVOID에서 loop 간격은 period(400~3000ms)다. 눌림이 두 loop 시점을 모두 덮어야 하므로 period 이상 눌러야 한다.
- 영향: 걷는 중 머리를 가볍게 터치해도 정지하지 않거나 한 주기 늦게 정지한다. 터치 정지는 요구사항의 핵심 안전 기능이고, `v 1 1` 이벤트도 같이 늦거나 사라진다.
- 수정 제안: 직전 sensors_update와의 간격이 `TOUCH_DEBOUNCE_MS`보다 길면 디바운스를 건너뛰고 한 번의 HIGH 샘플로 확정한다(간격 자체가 디바운스 시간보다 길다). 주기 사이에 끝나는 짧은 탭은 블로킹 때문에 구조상 놓친다(behavior.md도 ACTION 중 터치 누락은 인정). 이 한계는 "하드웨어에서만 확인 가능한 항목"에 둔다.

### [경미] 터치 정지 때 S_buttonPushed를 재생하는 것이 명세에 없고, 그동안 IDLE 상태로 블로킹
- 담당: firmware (또는 protocol 문서에 반영)
- 위치: `behavior.cpp:361` `motion_singLib(S_buttonPushed)`
- 영향: behavior.md의 터치 정지 전이는 `v 1 1`, `d 77`, 홈뿐이다. 노래 동안(수백 ms) 입력을 읽지 못하고 상태는 IDLE(ACTION이 아님)이라 텔레메트리 state가 실제와 다르다. 동작은 안전하다. 의도라면 behavior.md에 적고, 아니면 제거한다.

### [경미] 첫 PING에서 얼굴을 happyOpen(11)으로 바꾸는 동작이 명세에 없음
- 담당: firmware
- 위치: `commands.cpp:136`
- 영향: 사용자가 MATRIX로 그린 그림이 있는 상태에서 웹을 처음 연결하면 그림이 지워진다(재연결해도 `s_pinged`가 true라 한 번뿐). 의도된 "연결 표시"라면 behavior.md에 추가한다.

### [경미] TONE이 `markEnd()`를 호출하지 않음
- 담당: firmware
- 위치: `commands.cpp:171-178`, `commands_tick`
- 영향: AUTO 8을 켠 상태에서 TONE 재생이 끝난 직후 부저 소리를 소리 센서가 듣고 `v 5`가 나갈 수 있다. 기본은 AUTO 8 꺼짐이라 영향이 작다. `commands_tick`의 종료 시점(과 STOP의 stopTone)에 `motion_lastEnd` 갱신을 두면 된다(motion에 setter 필요).

### [경미] 명령 실행이 안전 판정보다 앞서 loop에서 실행됨 (명세 순서와 다름)
- 담당: firmware
- 위치: `otto_fat.ino:203-205`
- 근거: behavior.md 2절은 입력 읽기(1) -> 넘어짐(2) -> 터치(3) -> 장애물(4) -> 명령 실행 또는 MOVE(5)다. 구현은 `comms_poll`이 줄을 읽는 즉시 핸들러를 실행하므로 명령이 안전 판정보다 먼저 돈다.
- 영향: 같은 loop에서 겹치는 경우에만 차이가 생긴다. 넘어짐은 300ms 유지가 필요해 사실상 영향이 없고, 터치와 같은 loop에 오는 `M`은 먼저 MOVING이 된 뒤 터치가 곧바로 정지시키므로 결과는 같다. 문서와 코드 중 하나에 맞추면 된다(문서를 "STOP과 즉시 명령은 읽는 즉시 처리"로 고치는 쪽이 간단).

## 체크리스트 대조: 명령 처리 경로 (펌웨어)
| 항목 | 판정 | 근거 |
|---|---|---|
| LINE_TOO_LONG 후 줄 끝까지 버림 | 통과 | `comms.cpp:46-52` (fw_1에서 확인, 변경 없음) |
| 인자 개수·범위 오류는 BAD_ARG, 동작 없음 | 통과 | `commands.cpp:48-87,122-125`. 검증 실패는 ACK·실행 이전에 return. 인자 9개 이상·정수 아님은 `comms_parseArgs`가 false |
| 생략 인자 DEFAULT | 통과 | MOVE period/size `:54-55`, TRIM save `:79` (protocol.h 상수) |
| ACK는 검증 직후, 블로킹 이전 / DONE은 실행 후 | 통과 | 검증 `:122-127` -> `comms_ack` `:130` -> 실행 `:132-219` -> `comms_done` `:220`. MOVE·TONE만 `return`으로 DONE 지연(의도) |
| 검증 순서(토큰, 인자, 범위, 상태) | 통과 | BAD_ARG가 FALLEN/BUSY보다 먼저(`:122-127`). behavior.md 6절과 일치 |
| 음수 TRIM 파싱 | 통과 | `comms.cpp:71-87`, `allRng(4,-90,90)` |
| TEXT 공백 포함·9자·대문자 | 통과 | `comms.cpp:94-97`, `commands.cpp:71`(argc 1, strlen<=9; `W`·`W `는 argc 0이라 BAD_ARG), `face.cpp:43-52` |
| 번호 변환(제스처 id-1, 노래 표) | 통과 | 위 "이전 결함" 표 |
| MOUTH 0~30 | 통과 | `commands.cpp:66-67`. `Mouthtable` 31개(`Otto_mouths.h:8`)와 일치. 입모양 번호 10 smile, 11 happyOpen, 14 bigSurprise, 26 xMouth는 otto-lib-api.md 표와 일치 |
| USB/BT 별도 버퍼, 응답이 명령 온 포트로 | 통과 | `comms.cpp:20,65-66`. 핸들러가 `port=g_replyPort`를 먼저 저장(`commands.cpp:129`)하고 INFO·TRIMS·DONE에 사용 |
| STOP이 MOVE 주기 사이·FALLEN에서도 수신 | 통과 | loop당 poll 1회(`otto_fat.ino:203`)가 `motion_cycle` 사이에 돈다. FALLEN은 STOP을 거부하지 않음(`commands.cpp:97-101`) |
| PING 순서 `a -> i -> c -> d` | 통과 | `:130,134-135,220` |

### 상태별 거부, STOP, 우선순위
| 항목 | 판정 | 근거 |
|---|---|---|
| FALLEN: M H G A C -> `e 6` | 통과 | `commands.cpp:97-101` (MOVE, GESTURE, SERVO, ARMS, TRIM). K W P S T L X R U는 허용 |
| AVOID: M H K W G A C -> `e 3` | 통과 | `:91-96` (MOVE, GESTURE, SING, TEXT, SERVO, ARMS, TRIM) |
| STOP이 FALLEN을 풀지 않음 | 통과 | `:143` FALLEN이면 홈을 생략하고 상태 유지. 서보 해제 상태 유지, `a 83 -> d 83` |
| STOP 순서 `a 83 -> d 77 -> d 84 -> 홈 -> d 83` | 통과 | `:139-144,220`. AVOID는 `d 77` 없이(진입 때 이미 보냄) IDLE로 |
| 우선순위 넘어짐 > 터치 > 장애물 | 통과 | `behavior.cpp:350-381`. 넘어짐 성립 시 터치는 이벤트만(`:356` `!fallen`), 터치 정지 시 장애물 동작 생략(`:372` `!touchStopped`), 장애물 이벤트는 FALLEN 제외(`:367`) |
| 소리는 IDLE에서만, 쿨다운 | 통과 | `:388-398`, FALLEN 중 표정 복원 생략 `:386` |

### DONE과 순서
| 항목 | 판정 | 근거 |
|---|---|---|
| 교체·keepalive MOVE는 DONE 없음, 홈 안 거침 | 통과 | `commands.cpp:153-156` `motion_setMove`만. 진행 중 주기를 끊지 않음 |
| MOVE 종료 경로마다 `d 77` 정확히 1회 | 통과 | STOP/1회성 명령(`behavior_endMove`: 상태 확인 후 IDLE로 바꿈), watchdog(`:404-409`), 터치(`:357-360`), 넘어짐(`:305,311`), 장애물(`:374-375`, 이후 AVOID라 다시 안 나감). 모두 상태를 MOVING 밖으로 바꾸는 같은 지점에서 한 번씩 |
| 1회성 명령이 MOVE 종료 시 `a xx -> d 77 -> d xx` | 통과 | `beginAction`(`:111-114`)이 ACK 뒤에 `behavior_endMove`. MOVE 0, H, K, W, G, C 모두 사용 |
| AVOID 중 STOP `a 83 -> d 83` | 통과 | |
| TONE: 새 ACK -> 앞 `d 84`, 종료 시 1회, STOP 시 중단 | 통과 | `:171-178,16-21,23-28`. 포트는 `s_tonePort` |
| 상태 코드 ACTION 표시 | 참고 | ACTION은 블로킹이라 텔레메트리에서 관측되지 않음(명세와 동일 한계) |

## 체크리스트 대조: 안전·하드웨어
| 항목 | 판정 | 근거 |
|---|---|---|
| watchdog 1500ms, 주기 종료 후 판정 | 통과 | `behavior.cpp:404`. loop 순서상 poll(버퍼 줄 수신 시각 갱신) 뒤, 다음 `motion_cycle` 앞에서 판정. 수신 시각은 `comms_ack`(`comms.cpp:135`)에서 ACK를 보낸 줄만 갱신하므로 ERR·빈 줄·깨진 줄은 제외. MOVING 진입 ACK가 타이머를 0으로 둠. `a 83/d 83` 없이 홈, `d 77`, IDLE. 비-MOVING 상태에는 적용 안 됨 |
| 텔레메트리 주기 하한 | 통과 | `behavior.cpp:298-302`(1~99 -> 100), `:423` MOVING 중 500ms. 필드 순서 dist, touch, pitch, roll, sound, state가 protocol.json과 일치 |
| 응답 경로 | 통과 | 명령 응답은 `g_replyPort`, 이벤트·텔레메트리는 `g_activePort`(`comms_ack`에서 갱신, 기본 BT), 부팅 `i`+`v 6`은 `PORT_BOTH`(`behavior.cpp:263-272`) |
| 초음파 부재: 측정 안 함, AUTO 2 제거, INFO | 통과 | `sensors.cpp:548` 부재면 `usMeasure` 호출 없음, `:567` dist 0. `behavior.cpp:247-253` allowedMask가 비트 2 제거. 기본 auto = 7 & 가용 = 5, sensors = 1 (실물 예상값 `i 1 1 1 5`) |
| U로 없는 센서 비트 | 통과 | `behavior_setAuto`가 마스크로 걸러 ERR 없이 적용, INFO 재전송(`commands.cpp:216-217`) |
| IMU 3회 연속 실패 | 통과 | `sensors.cpp:510-517` 3회째에 비트 제거, `behavior.cpp:341-347`: `e 5 0` -> auto 비트 4 제거 -> FALLEN이면 `recover(1)` -> `i` 재전송. 순서가 behavior.md 5절과 일치 |
| 이벤트 폭주 없음 | 통과 | 터치는 디바운스 확정 에지마다 1회, 장애물은 `s_obstArmed`로 해제(>15cm 또는 0) 전 1회, 넘어짐·회복은 상태 전이 때만, 소리는 2s 쿨다운, SENSOR_FAIL은 에지 1회 |
| 장애물 후퇴는 전진 중에만, 히스테리시스 | 통과 | `behavior.cpp:369-380`. 트리거 1~10, 해제 >15 또는 0, 전진 계열은 `motion_isForward`(1, 9, 12). AUTO 2가 꺼져도 이벤트는 나감(명세와 일치) |
| 넘어짐 시 detach, 회복 시 attach | 통과 | `fall()`: `motion_detachAll`(다리+팔) 후 `face_mouth(26)`, `v 3`, `d 77`. `recover()`: `motion_attachAll`(attach + 홈 + 팔 90) -> `face_mouth(10)` -> `v 4 why`. FALLEN 중 홈을 부르는 경로 없음(STOP, 터치, watchdog 모두 상태 조건으로 차단) |
| U로 비트 4 해제 시 `a 85 -> v 4 1 -> i -> d 85` | 통과 | `behavior_setAuto` -> `recover(1)`(이벤트는 방금 ACK로 갱신된 activePort) -> `behavior_sendInfo` -> DONE |
| `Wire.setWireTimeout` | 통과 | `sensors.cpp:488` (3000us, 리셋 true), 실패 시 `clearWireTimeoutFlag` |
| `pulseIn` 타임아웃 | 통과 | `config.h:250` 25000us |
| String 미사용, F() | 통과 | grep 결과 `String` 없음, 문자열 리터럴 출력은 `bootDiag`의 `F()`뿐 |
| 핀 | 통과 | config.h 값이 pinmap과 일치(fw_3에서 확인한 값 그대로). 부저 13, 터치 A0, 초음파 8/9, 사운드 A6, BT 11/12 |

## Flash 93% / RAM 62% 리스크 평가
- Flash 30186/32256B (93%): 한도 97%(31288B)까지 1102B 여유, 실제 빈 공간 2070B. 이전 보고(54%)보다 +13.5KB인 이유는 fw_3에서는 스텁이 `Otto.walk` 등 대부분을 참조하지 않아 링커가 제거했기 때문으로 보인다(이번에 `motion_runOnce` 21종, 제스처, 노래가 연결됨). 앞으로 펌웨어에 기능을 더 얹을 여유는 약 1KB뿐이라 이 단계가 사실상 마지막이다. 새 문자열·`Serial.print` 추가는 피할 것.
- RAM 1276/2048B (62%): behavior.md 9절 한도 75%(1536B)보다 260B 아래. 남은 772B는 스택용이다. 가장 깊은 경로 loop -> poll -> feed -> `commands_handle` -> `behavior_sendInfo` -> `comms_send`(out[48] + tmp[8])는 약 120B, 제스처 경로 `playGesture` -> `_moveServos`(int[4]+지역)는 100B 안팎으로 어림된다. 힙 사용(malloc)은 없다(Servo·SoftwareSerial은 정적). 현재 구조에서는 안전하다고 판단하지만 실제 스택 깊이는 실행 시험이 필요하다(TEXT는 `face_text` 지역 10B + `writeText` 호출 깊이).
- 판정: 한도 이내. 위험은 Flash 여유(약 1.1KB)이며 결함으로 올리지 않는다.

## 웹 계약 상태 (미구현으로 분류, 결함 아님)
- `check_contract`의 오류 12건은 모두 웹 쪽 명령 송신 코드 없음(PING, GESTURE, SING, TONE, MOUTH, MATRIX, TEXT, ARMS, SERVO, TRIM, TELEM, AUTO). 웹 UI 단계에서 해소 예정.
- 웹 keepalive(500ms, period > 1500이면 `ceil(period/3)`)와 ACK·DONE 타임아웃은 웹 구현 후 대조한다.

## 하드웨어에서만 확인 가능한 항목
- MOVING 중 실제 넘어짐 감지 지연 시간과 터치 정지 반응 시간(위 주요 2건 수정 전후 비교). 짧은 탭은 주기 사이에 놓칠 수 있다.
- IMU 축·부호(`IMU_PITCH_SIGN`, `IMU_ROLL_SIGN`)가 실물과 맞는지. 넘어짐 이벤트 부호.
- 장애물 후퇴: 초음파가 연결되기 전에는 검증 불가. 중앙값 3개가 MOVING 중 주기당 1개씩 갱신되어 반응이 2주기 늦을 수 있다(초음파 연결 후 평가). 후퇴 후 거리가 10~15cm이면 `s_obstArmed`가 false라 다음 전진에서 AVOID가 다시 걸리지 않는다(명세 그대로의 동작이므로 필요하면 protocol/behavior에서 정책을 정할 것).
- 후퇴 2걸음 거리, 소리 임계값(70), 팔 90도가 내린 자세인지, MOVE 중 SoftwareSerial 64B 버퍼 넘침과 keepalive 수신.
- `Otto.home()`이 다리 서보를 detach하므로 홈 직후 자세가 처지는지.
- 서보 동시 구동 시 전원·리셋, 텔레메트리 송신 중 서보 떨림(MOVING 500ms 하한).

## 통과 판정: FAIL (주요 2건)
firmware(sensors) 주요 2건(IMU 필터·터치 디바운스가 MOVING 중 loop 간격 문제) 수정 후 재검사가 필요하다. 명령 분기·ACK/DONE·상태별 거부·watchdog·응답 경로·센서 부재 처리는 명세와 일치한다. 통합 PASS 전이라 `docs/hardware-test.md`는 작성하지 않았다.
