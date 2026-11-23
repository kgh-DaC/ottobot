# QA 보고 — 2026-11-24 통합 (단계 4, 라운드 2)

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| gen_protocol --check | PASS | protocol.h, protocol.js 일치 |
| check_contract | PASS | 오류 0, 경고 0 |
| test_protocol_js | PASS | 통과 224 / 실패 0 |
| compile.py (arduino:avr:uno) | PASS | 경고 0, Flash 30590 B (94%), RAM 1281 B (62%), 남은 767 B. 로그 `_workspace/qa_compile_r2.log` |
| node --check web/js/*.js | PASS | 전 파일 문법 OK |

## 이전(r1) 결함 해결 여부
| 결함 | 상태 | 근거 |
|---|---|---|
| [주요] 터치 정지 직후 keepalive MOVE 재보행 | 해결 | 아래 "MOVE 잠금 대조" |
| [경미] nano 정의 Flash 99% | 해결(결정·문서화) | `_workspace/03_firmware_notes.md:8` "nano 정의로는 들어가지 않는다... uno FQBN이 필수", `.claude/skills/otto-firmware/SKILL.md:104` 기본 FQBN uno |
| [경미] 자동 정지 후 팔 슬라이더 | 해결 | `ui-express.js:102` `moveDone` → `resetArmsUi`. 터치·watchdog은 홈(팔 90°) 뒤 `d 77`이라 `moveDone`이 온다. 펌웨어 `motion_home()`(`motion.cpp:76-79`)이 `ARM_REST_L/R`=90으로 설정 = 일치 |

## 결함 (심각도순)
치명·주요 없음.

### [경미] web(demo+link) — 장애물 후퇴 중 사용자 STOP 뒤에도 MOVE 잠금을 건다(펌웨어는 안 건다)
- 위치: `link.js:443` `if (c === CODE_STOP && this.avoidActive) {... this._startLock(); }`, `demo-robot.js:263` `if (wasAvoid) this._lockMoves(now)`
- 근거: behavior.md 4절 "대상: 터치 정지, 장애물 후퇴 종료(정상 종료·터치로 끊김), watchdog / 제외: 사용자 STOP". 펌웨어 `commands.cpp:140-145` STOP은 `lockMove()`를 부르지 않는다(`lockMove` 호출처는 `behavior.cpp:166,214,224` 세 곳뿐). 표 1절 "AVOID | S | IDLE"에도 잠금 표기가 없다.
- 영향: 후퇴 중 STOP 뒤 곧바로 방향키를 누르면 웹이 최대 1.2초 미루고 "잠시 이동을 받지 않습니다" 안내를 띄운다(실제 로봇은 받을 수 있음). 데모는 `e 3 77`을 낸다. 초음파가 불량이라 지금 실물에서는 발생하지 않는다.
- 수정 제안: web. STOP 경로의 `_startLock()`과 데모의 `wasAvoid` 잠금을 제거. 이때 후퇴 중 d 83 뒤 `avoidActive` 정리는 유지.

### [경미] web — 잠금 중 "홈(MOVE 0)" 버튼은 아무 안내 없이 무시된다
- 위치: `link.js:458-474`(lockReject), `app.js:368`
- 근거: 펌웨어는 잠금 중 `M 0`도 `e 3 77`로 거부(behavior.md 4절 "id 0 포함"). 웹은 이 응답을 silent 처리하고 MOVE 0은 hold가 아니라 재시도·notice도 없다.
- 영향: 자동 정지 후 1~1.2초 안에 홈 버튼을 누르면 반응이 없다(이미 홈 자세라 실해 없음).
- 수정 제안: web, 선택 사항. 홈 버튼은 잠금 구간이면 `lockUntil`까지 지연하거나 notice만 띄운다.

## MOVE 잠금 대조 (docs/behavior.md 4절 ↔ firmware ↔ web)
| 항목 | 판정 | 근거 |
|---|---|---|
| 같은 loop에서 자동 정지 뒤 버퍼의 M 거부 | 통과 | `otto_fat.ino:48-50` 순서 `behavior_safety`(터치 정지, `behavior.cpp:164-167` 홈 뒤 `lockMove()`) → `comms_poll` → `commands.cpp:104` `stateReject`가 MOVE를 `ERR_BUSY`로 거부. `e 3 77`, ACK·DONE 없음(`:129` ACK 이전 반환). `behavior_motion`에서는 `g_state==IDLE`이라 `motion_cycle` 안 돈다 |
| 대상 3종 | 통과 | 터치(MOVING·AVOID 공통 `:166`), watchdog `:214`, 후퇴 종료 `:224`. 후퇴 중 터치도 `:166`이 덮는다 |
| 제외 | 통과 | STOP(`commands.cpp:140`)·넘어짐(`fall()`)에 `lockMove` 없음. 넘어짐은 FALLEN `e 6`로 거부 |
| 시작 시점 = home 완료 후 | 통과 | 세 곳 모두 `motion_home()`(블로킹) 직후 `lockMove()` |
| id 0 포함 | 통과 | `t == CMD_MOVE`만 보고 id는 안 봄. 검증(BAD_ARG)이 먼저라 범위 오류는 `e 2`로 남음 |
| 만료·다른 명령 | 통과 | `behavior_moveLocked()`는 `millis()` 경과로만 해제, STOP·다른 명령 무관. `|1UL`로 0 회피, wrap 안전(부호 없는 뺄셈) |
| `e 3 77`이 watchdog 입력을 갱신하지 않음 | 통과 | ACK 시각만 갱신(`comms_ack`), ERR는 아님 |
| 웹 터치 경로 타이밍 | 통과 | `v 1 1` 수신 → `_autoStopped`(lockUntil=rx+1200). 펌웨어는 이벤트 뒤 홈(H ms) → `lockMove` → `d 77`이라 실제 만료 = d 77 송신+1000. 웹은 `d 77` 수신 때 `_onDone` selfStop 분기(`link.js:436-439`)에서 `lockUntil`을 d 77 수신+1200으로 다시 잡는다. 그래서 웹 추정은 항상 실제보다 늦거나 같다. 홈 시간 H가 길어도 불필요한 거부 없음 |
| 웹 watchdog 경로 | 통과 | 홈 뒤 `d 77`만 옴 → `hold.acked && wasLive` → `_autoStopped('MOVE_DONE')`(`:435`). 잠금 +1200 |
| 웹 후퇴 경로(초음파 복구 시) | 통과(근사) | `v 2` 수신 시 +1200+2600(=3.8초), 텔레메트리가 켜져 있으면 후퇴 끝 때 재산정. 실제 = 후퇴 2주기(2000)+홈+1000. 홈 H가 800ms를 넘고 텔레메트리가 꺼져 있으면 추정이 짧을 수 있으나 `lockReject`(`lockUntil+1500` 창, 조용히 처리, 1회 자동 재시도)가 흡수 → 오류 토스트 없음 |
| 잠금 중 `e 3 77`이 오류 토스트를 띄우는 경우 | 없음 | 터치·watchdog은 `lockUntil+1500` 창 안이라 silent. 잠금과 무관한 AVOID BUSY는 의도대로 경고 토스트 |
| 잠금 중 재입력 | 통과 | `holdMove`가 `lockUntil`까지 지연 후 1회 송신, 손 떼면 취소(`releaseMove`→`_cancelDeferred`) |
| 데모와 펌웨어 | 거의 일치 | loop 순서(`_sense` → `_readInput`), MOVE 0 포함 잠금, FALLEN 우선(`demo-robot.js:219`)은 일치. 차이는 위 경미 1건(STOP in AVOID) |
| 팔 90° 복귀 | 일치 | 펌웨어: STOP·터치·watchdog·후퇴 종료·MOVE 0 모두 `motion_home()` → 팔 90°(`ARM_REST_*`), 회복은 `motion_attachAll`. 웹: `tx STOP`, `RECOVER`, `moveDone`에서 슬라이더 90. 하드웨어 팔 "내림" 각도가 90인지는 실물 확인 항목. 사소한 불일치 가능성: 이동 중 팔을 움직이고 제스처를 누르면 `d 77`로 슬라이더가 90이 되지만 펌웨어는 홈을 안 돌아 팔이 그대로(경미, 아래 하드웨어 항목) |

## 회귀 재확인 (r1 통과 항목)
- 줄 48B 제한, 인자 검증·무동작, ACK-전·DONE-후, TEXT, 제스처·노래 변환: `commands.cpp` 변경은 `stateReject` 한 줄뿐, 해당 코드 그대로.
- loop 순서(센서→안전→poll→motion)와 STOP·watchdog 판정: 변경 없음. 터치 정지·후퇴 종료·watchdog에 `lockMove()`만 추가되어 DONE·이벤트 순서는 그대로(`v 1 1` → 확인음 → 홈 → `d 77`).
- 웹 d 77 귀속(hold.acked), STOP 중 블로킹 재전송 금지, 조각난 수신, 재연결: `link.js` 구조 유지, 잠금 로직이 추가됐을 뿐 기존 분기를 건드리지 않음. gen/contract/protocol.js 자동 검사 통과.
- Flash 30456 → 30590 B(+134 B), uno 한도 32256 B의 94%, 여유 약 1.6KB.
- 문서 자잘한 점(비결함): behavior.md 2절은 watchdog을 "안전 판정 단계"로 적었고 3절 표·코드는 poll 뒤 `behavior_motion`(주기 종료 후 입력을 읽은 뒤)이다. 의미는 표와 코드가 같다.

## 하드웨어에서만 확인 가능한 항목
- 방향키 누른 채 터치: 멈춘 뒤 다시 걷지 않는지, 1초 안에 다시 누르면 지연 후 움직이는지(토스트 "잠시(1초)").
- 홈 시간 H(터치 정지 뒤 홈 자세까지)가 실제로 얼마인지, `d 77`과 `v 1 1` 간격.
- IMU pitch/roll 부호, 걷는 중 오탐(60°), 넘어짐 감지 지연.
- 터치 HIGH 극성, 블로킹 주기 중 짧은 탭 누락.
- 팔 90°가 내린 자세인지, 좌우 방향(`ARM_REST_*`).
- BLE 지연 시 watchdog 1500ms, 서보 동시 구동 브라운아웃, SoftwareSerial 수신 손실.
- 초음파는 센서 불량. 수리 후 장애물 후퇴와 잠금(후퇴 종료 시점 추정)을 재검증.

## 통과 판정: PASS (치명 0, 주요 0, 경미 2)
- 담당별: web 경미 2건(후퇴 중 STOP 뒤 불필요한 잠금, 잠금 중 홈 버튼 무반응). firmware·protocol 결함 없음.
- `docs/hardware-test.md` 작성함.
