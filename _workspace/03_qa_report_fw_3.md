# QA 보고 — 2026-11-24 firmware (단계 3, motion + face 모듈)

이전 보고서: `03_qa_report_fw_1.md`만 있음. `_2.md`는 없음(컴파일 로그 `qa_compile_fw2.log`만 있음).
commands/behavior 모듈은 아직 없다. `otto_fat.ino`는 임시 스텁이라 연속 MOVE 스케줄러·watchdog·명령 분기는 검증 대상이 아니다.

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| gen_protocol --check | 통과 | protocol.h, protocol.js 일치 |
| check_contract | 오류 31 / 경고 27 | 오류 전부 "처리/송신 코드 없음"(펌웨어 CMD 14종, INFO·TRIMS·TELEMETRY 송신, 웹 쪽). 그 외 오류 없음 |
| test_protocol_js | 통과 | 통과 224, 실패 0 |
| compile.py (otto_fat) | 통과 | 경고 0, Flash 16640B (54%), RAM 1150B (56%), 남은 898B. 로그 `_workspace/qa_compile_fw3.log` |
| node --check web/js/*.js | 통과 | 5개 파일 문법 오류 없음 |

## 이전 결함 해결 여부 (fw_1)
| 결함 | 상태 | 근거 |
|---|---|---|
| [경미] comms_poll 재진입 시 줄 버퍼 손상 | 해결(가드) | `comms.cpp:56-69` `s_inPoll` 가드 추가, 재진입 시 즉시 return. 주의: 핸들러 안에서 STOP을 보려고 poll을 부르면 조용히 아무것도 안 읽는다. MOVE 주기 사이 STOP 처리는 loop() 한 지점의 poll로만 가능하다(commands 구현 때 이 구조여야 함) |
| [경미] comms_send 버퍼 경계 | 해결 | `comms.cpp:115-131` `LIM=PROTO_MAX_LINE-1`, 공백+숫자가 들어갈 때만 붙이고 `\n` 자리를 남김 |

## 결함 (심각도순)

치명 0건, 주요 1건, 경미 3건.

### [주요] GESTURE·SING id가 라이브러리 열거값과 어긋남
- 담당: firmware (motion)
- 위치: `firmware/otto_fat/motion.cpp:97-98`
- 근거:
  ```
  void motion_gesture(uint8_t id) { Otto.playGesture(id); markEnd(); }
  void motion_sing(uint8_t id) { Otto.sing(id); }
  ```
  protocol.md의 GESTURE는 1~13(1 Happy … 13 Fail)인데 라이브러리는 `OttoHappy=0 … OttoFail=12`(`Otto_gestures.h:8-20`). SING은 protocol.md 1~19(1 S_connection, 2 S_disconnection, 3 S_surprise …)인데 라이브러리 값은 `S_connection=0, S_disconnection=1, S_buttonPushed=2, S_mode1=3, …, S_surprise=6 …`(`Otto_sounds.h:107-125`)로 순서가 다르다. Otto_APP 예제는 `case 1: Otto.playGesture(OttoHappy)`처럼 이름으로 매핑한다.
- 영향: GESTURE 1은 SuperHappy가 나가고 13은 아무 동작도 없다(DONE만 나감). SING은 id 3을 보내면 S_mode1이 나오고 19는 무음이다. 대부분의 노래가 다른 곡이다.
- 수정 제안: `motion_gesture`는 `playGesture(id-1)`. `motion_sing`은 PROGMEM이 아니어도 19바이트 테이블(`{S_connection, S_disconnection, S_surprise, S_OhOoh, S_OhOoh2, S_cuddly, S_sleeping, S_happy, S_superHappy, S_happy_short, S_sad, S_confused, S_fart1, S_fart2, S_fart3, S_mode1, S_mode2, S_mode3, S_buttonPushed}`)로 `id-1`을 변환한다.

### [경미] motion_sing이 markEnd()를 부르지 않음
- 담당: firmware
- 위치: `motion.cpp:98`
- 근거: `motion_gesture`, `motion_home` 등은 `markEnd()`를 호출하지만 `motion_sing`만 빠짐. behavior.md 3절 "동작 종료 후 500ms 소리 무시"의 기준이 `motion_lastEnd()`다.
- 영향: 노래 직후 부저 소리를 소리 센서가 듣고 AUTO 8이 켜져 있으면 오반응. (AUTO 8은 기본 꺼짐)
- 수정 제안: `motion_sing`에 `markEnd()` 추가.

### [경미] 제스처 후 매트릭스가 face 기억과 달라짐
- 담당: firmware (motion/face 연동)
- 위치: `motion.cpp:97`, `face.cpp:25-40`
- 근거: Otto 제스처는 내부에서 `putMouth(...)`로 마지막 입모양을 바꾸지만 `s_faceId`는 갱신되지 않는다. MATRIX로 그린 그림도 제스처 뒤에 사라진다.
- 영향: 제스처 후 표정이 제스처가 남긴 입모양으로 남고, 이후 `face_restore()`(소리 반응 뒤, TEXT 뒤)가 제스처 이전 표정을 다시 그려 화면이 갑자기 바뀐다.
- 수정 제안: commands에서 GESTURE 끝에 `face_restore()`를 부르거나, 제스처 후 얼굴을 smile 등으로 정해 `face_mouth()`로 기억시킨다. 선택은 behavior에서 정하면 된다.

### [경미] face_text 시그니처가 g_strArg 타입과 맞지 않음
- 담당: firmware
- 위치: `face.h:8` `void face_text(char* s)` / `comms.h`의 `const char* g_strArg`
- 영향: commands가 `face_text(g_strArg)`를 부르면 컴파일 오류가 나고, 캐스트로 우회하면 줄 버퍼를 제자리에서 바꾼다(핸들러 안에서만이면 안전). 지금은 문제가 아니라 commands 구현 시 걸림돌이다.
- 수정 제안: `face_text(const char*)`로 받고 내부에서 대문자 변환을 하며 9자까지 복사한 `char[10]` 지역 버퍼를 쓰거나, 호출 규약(캐스트 허용)을 주석으로 못 박는다. 지역 버퍼는 스택 10B로 가볍다.

## 검증한 항목 (통과)
| 항목 | 판정 | 근거 |
|---|---|---|
| MATRIX r0=맨 위, bit7=왼쪽 → setLed | 통과 | `face.cpp:15` `setLed(px,py,(row>>(7-x))&1)`, y=r 인덱스, `MTX_FLIP_*`=0. 라이브러리 `setLed`→`setDot(col=X,row=Y)`이고 실물 setLed(0,0)=왼쪽 위와 일치 |
| TEXT 대문자 변환, 9자 | 통과(부분) | `face.cpp:45` a-z → A-Z. `writeText`는 9자까지만 읽음. 9자 초과·빈 문자열은 commands에서 BAD_ARG 처리해야 함(미구현) |
| TEXT 후 얼굴 복원 | 통과 | `face.cpp:47` `face_restore()`. 스크롤 끝에서 라이브러리가 `clearMatrix()` 하므로 필요한 호출 |
| EEPROM 0~3만 트림 용도 | 통과 | `EEPROM` 사용은 `motion.cpp:24`(읽기)와 `saveTrimsOnEEPROM`(Otto 형식 0~3)뿐. 다른 파일에서 EEPROM 접근 없음 |
| TRIM save 인자 | 통과(API) | `motion_setTrims(t, save)`: save=1일 때만 `saveTrimsOnEEPROM()`, 항상 `setRestState(false)` 후 홈. 음수 트림은 `EEPROM.write` 바이트 래핑을 `init`의 `>128 → -256`이 되돌림(−90~90 안전) |
| TRIMS 응답용 값 | 통과 | `motion_trims()`가 RAM 사본 반환. 부팅 시 EEPROM과 같은 규칙으로 로드(`:23-27`) |
| 팔 핀·좌우 | 통과 | `config.h` PIN_ARM_L=6(왼), PIN_ARM_R=7(오). pinmap.md와 일치. `motion_arms(l,r)`이 L→armL, R→armR |
| home 시 팔 기본각 | 통과 | `motion_begin`·`motion_home`·`motion_attachAll` 모두 ARM_REST_L/R(90) 적용. 하드웨어 확인 필요(TODO) |
| MOVE id 0~20 매핑, steps=1 | 통과 | `motion_runOnce`가 Otto_APP 표와 일치. `motion_isForward` = 1, 9, 12 (behavior.md와 일치) |
| 한 주기 API | 통과 | `motion_cycle()` 1주기 블로킹, `motion_setMove`는 다음 주기부터 적용, 홈을 거치지 않음 → keepalive 교체 요건을 지원하는 구조 |
| 서보 detach/attach | 통과(API) | `motion_detachAll`이 다리·팔 모두, `motion_attachAll`이 attach+홈 |
| F()/String | 통과 | motion/face에 문자열 상수·String 없음 |
| 핀 | 통과 | 서보 2~5, 부저 13, 매트릭스 DIN A3 / CS A2 / CLK A1이 pinmap과 일치 |

## 미구현 (commands/behavior/web, 결함 아님)
- 인자 개수·범위 검사, default, ACK 위치(검증 직후·블로킹 전), DONE 정확히 1회, 교체 시 DONE 없음, `a xx → d 77 → d xx` 순서.
- STOP이 MOVE 주기 사이에 처리되는지(구조는 지원: `motion_cycle` 1주기 + loop poll 1곳, 확정은 commands 구현 후).
- MOVE watchdog 1500ms, 주기 종료 후 판정(`MOVE_WATCHDOG_MS`, `g_lastValidRx`가 준비돼 있음).
- TEXT 9자 초과/빈 문자열 BAD_ARG, TRIM save 생략 시 1, TRIMS(`c`) 송신, 범위 밖 MOUTH id(`face_mouth`는 id 0~30 선검증을 전제로 함. 31 이상이면 PROGMEM 테이블 밖을 읽음).
- behavior(FALLEN, AVOID, 소리), web 전체, check_contract 오류 31건.

## RAM 위험 요소 (56%, 남은 898B)
- behavior.md 9절 한도는 75%(1536B). 남은 예산은 약 386B다. fw_1(674B) 대비 motion/face/sensors로 +476B 늘었다(Otto 객체의 서보 4 + 매트릭스 buffer 8 + CHARbuffer 80 등).
- 남은 모듈에서 조심할 것:
  - 문자열 상수 `F()` 필수(INFO/디버그). motion/face/sensors는 현재 문자열이 없다.
  - TEXT용 복사 버퍼는 10B 이하, 전역 `char[]` 금지. 줄 버퍼(`s_lb` 2×49B)를 그대로 쓴다.
  - 명령별 전역 상태는 `uint8_t`/`int16_t` 단위로 묶고, 텔레메트리용 큰 지역 배열을 두지 않는다. `comms_send`의 `out[48]`+`tmp[8]`이 이미 스택 56B를 쓴다.
  - 스택 깊이: loop → poll → feed → 핸들러 → motion_gesture → `playGesture` → `_moveServos`(int[4]) 경로가 가장 깊다. 핸들러에 큰 지역 배열을 넣지 않으면 898B 안이다.
- 경고 수준(지금은 문제 없음): 핸들러가 `comms_send`를 두 번 중첩 호출하는 구조(INFO+TRIMS를 연달아)는 스택이 아니라 순차 호출이면 괜찮다.

## 하드웨어에서만 확인 가능한 항목
- 팔 "내린" 각도(ARM_REST_L/R=90)가 실제로 내린 자세인지, 좌우 방향이 대칭인지.
- 홈 후 다리 detach(Otto.home 동작)로 자세가 처지는지, 트림 미리보기(save=0) 후 홈 위치.
- MATRIX 방향(setLed(0,0)=왼쪽 위, bit7=왼쪽)을 비대칭 그림으로 눈으로 확인. TEXT 스크롤 속도(`TEXT_SCROLL_SPEED` 80)와 글자 방향.
- `face_matrix`의 `clearMouth()` 후 64번 `setLed`(점마다 SPI 전송)로 깜박임이 보이는지. 거슬리면 clear를 생략해도 64점이 모두 덮어쓰여 결과는 같다.
- MOVE 주기 중 SoftwareSerial 버퍼(64B) 넘침, 서보 동시 구동 전원.

## 통과 판정: FAIL (주요 1건)
GESTURE·SING id 매핑 오류(firmware motion) 수정 후 재검사가 필요하다. 경미 3건은 commands 구현 전에 같이 반영하길 권한다. 통합 PASS 전이므로 `docs/hardware-test.md`는 작성하지 않았다.
