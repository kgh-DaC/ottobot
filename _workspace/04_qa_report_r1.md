# QA 보고 — 2026-11-24 통합 (단계 4, 라운드 1)

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| gen_protocol --check | PASS | protocol.h, protocol.js가 protocol.json과 일치 |
| check_contract | PASS | 오류 0, 경고 0 |
| test_protocol_js | PASS | 통과 224 / 실패 0 |
| compile.py (arduino:avr:uno) | PASS | 경고 0, Flash 30456 B (94%), RAM 1277 B (62%), 남은 771 B. 로그 `_workspace/qa_compile_r1.log` |
| compile.py (arduino:avr:nano, 추가 확인) | 크기 초과 아님, 정책 한도 초과 | Flash 30456 B / 30720 B = **99%**(스크립트 한도 97% 초과로 FAIL 표시). 실제 보드(Nano)에는 들어가지만 여유 264 B. 로그 `_workspace/qa_compile_r1_nano.log` |
| node --check web/js/*.js | PASS | 14개 파일 모두 문법 OK |

## 이전 결함 해결 여부
| 출처 | 결함 | 상태 | 근거 |
|---|---|---|---|
| fw_1 | comms_poll 재진입 | 해결 | `comms.cpp:59-60` 가드, loop에서 poll 한 곳만 |
| fw_1 | comms_send 경계 | 해결 | `comms.cpp:117,125` |
| fw_2 | OFFSET/SIGN 순서 | 해결 | `sensors.cpp:115-116` 오프셋 먼저 더한 뒤 부호 곱 |
| fw_2 | 부팅 중 Wire 타임아웃 플래그 | 해결 | `sensors.cpp:43` clearWireTimeoutFlag |
| fw_3 | [주요] GESTURE/SING id 변환 | 해결 | `motion.cpp:99` `OttoHappy+(id-1)`, `:102-106` SONGS 표 |
| fw_3 | 경미 4건(sing markEnd, 제스처 후 얼굴, face_text) | 해결 | `motion.cpp:110`, `commands.cpp:161`, `face.cpp:43-` |
| fw_4 | [주요] MOVING 중 IMU 필터 지연 | 해결 | 주기 끝 원시 샘플 2회 연속/75° 즉시 판정(`behavior.cpp:97-111`), behavior.md 3·4절과 일치 |
| fw_4 | [주요] 터치 디바운스가 loop 2회 필요 | 해결 | 처음 본 순간 10ms×3 재샘플(`sensors.cpp:133-145`) |
| fw_4 | 경미: 터치 정지 S_buttonPushed | 해결 | 비블로킹 `tone` 1500Hz 80ms(`behavior.cpp:158`), behavior.md 반영 |
| fw_4 | 경미: 첫 PING 얼굴 변경 | 해결 | `commands.cpp:134-137` PING은 INFO/TRIMS만 |
| fw_4 | 경미: TONE markEnd | 해결 | `commands.cpp:19,26` |
| fw_4 | 경미: loop 순서 | 문서 갱신으로 정리 | 아래 "loop 순서 대조" 참조 |
| web_1 | [주요] 방향 전환 시 새 MOVE 취소 | 해결 | `hold.acked` 기준 귀속(`link.js:_onDone`, `_onAck`). 순서 `a 83,d 77,d 83,a 77`에서 새 hold 유지 확인 |
| web_1 | [주요] 블로킹 중 STOP 거짓 오류 | 해결 | `_blockingRemain()`, 블로킹 중 재전송 없음(`link.js:stop`) |
| web_1 | 경미: STOP이 inflight 취소 | 해결 | `link.js:stop` 비블로킹 inflight 취소 |
| web_1 | 경미: MOVE 0이 d 77 두 개 | 해결 | `link.js:_onAck` dones=2 |
| web_1 | 경미: demo 줄 순서 | 해결 | `demo-robot.js:send` rxFreeAt |
| web_1 | 경미: demo 재연결 INFO | 해결 | `bootPending` |
| web_1 | 경미: serial 해제·재연결, BLE 세부 | 해결 | `_lost`/`_unplugged`/쓰기 직렬화, 리스너 선등록, `_manual` 유지 |

## 결함 (심각도순)

### [주요] firmware(+protocol 문서) — 터치 정지 직후 같은 바퀴에서 대기 중이던 keepalive MOVE가 읽혀 로봇이 다시 걷는다
- 위치: `otto_fat.ino:48-51`(센서→안전→poll→motion), `behavior.cpp:151-160`(터치 정지), `commands.cpp:146-156`(MOVE 수락), docs/behavior.md 2절 "명령 실행"이 안전 판정 뒤
- 근거: 터치 정지는 `behavior_safety()`에서 `g_state = ST_IDLE; motion_home(); d 77`로 끝난다. 곧바로 `comms_poll()`이 SoftwareSerial 버퍼에서 웹이 블로킹 주기 중에 보낸 keepalive `M ...`를 읽는다. `stateReject`는 IDLE에서 MOVE를 막지 않으므로 `a 77` 후 `g_state = ST_MOVING`이 되고, 바로 이어 `behavior_motion()`이 `motion_cycle()`을 한 주기 돈다. 웹 keepalive는 주기마다 거의 항상 1줄을 버퍼에 남기므로(`link.js:_keepalive`, ACK 오면 다음 tick에 1줄) 매번 일어난다. 웹이 이 상황을 알고 있다는 증거가 `link.js:_onAck`의 경고 "자동 정지 뒤 늦게 도착한 MOVE를 STOP으로 취소합니다"다. 그 STOP도 한 주기가 끝난 뒤에야 처리된다.
  - 넘어짐은 FALLEN이 MOVE를 `e 6`으로 거부해 안전하다. 장애물(AVOID)은 `e 3`으로 거부해 안전하다. **터치만** 뚫린다.
- 영향: 방향키를 누른 채 머리를 터치하면 "터치로 멈췄습니다" 토스트가 뜬 뒤 로봇이 홈 자세에서 다시 한 주기(최대 3초) 걷고서야 멈춘다. 설계 우선순위 "터치 > 명령"이 실제로는 지켜지지 않는다.
- 데모 불일치: `demo-robot.js:_tick`은 입력 읽기 → 감시 → 센서 순서(`_readInput` 뒤 `_sense`)라 같은 상황에서 keepalive가 먼저 처리된 뒤 터치가 정지시킨다. 데모는 통과하고 실물은 재시작한다.
- 수정 제안:
  - firmware: 터치 정지(또는 어떤 자동 정지)가 일어난 바퀴의 같은 `comms_poll`에서는 정지 직전 MOVE와 동일한 줄(id·period·size 일치)을 "낡은 keepalive"로 보고 MOVE를 시작하지 않는다. 응답은 protocol 담당과 정한다(예: `a 77` 후 즉시 `d 77`, 또는 ERR). 사용자가 새로 누른 다른 MOVE는 정상 수락. Flash 여유가 264 B(Nano)뿐이니 작게 구현한다.
  - protocol: behavior.md 2·6절에 이 규칙을 명시한다.
  - web(demo): 위 규칙 확정 뒤, 데모의 loop 순서와 낡은 keepalive 처리를 펌웨어와 같게 맞춘다.

### [경미] firmware — Nano 기준 Flash 99% (여유 264 B)
- 근거: `compile.py --fqbn arduino:avr:nano` → 30456 / 30720 B (99%). 업로드는 가능하다. Uno 기준(94%)이 기본 검사 값이라 PASS 처리했다.
- 영향: 위 주요 결함 수정이나 이후 기능 추가에서 쉽게 넘친다.
- 수정 제안: firmware. 수정 때 Flash 증가량을 확인하고, 필요하면 쓰지 않는 입모양/출력 문자열을 줄인다.

### [경미] web — 자동 정지(터치·감시·장애물) 후 팔 슬라이더가 90°로 돌아가지 않음
- 위치: `ui-express.js` (STOP 송신·RECOVER 때만 `resetArmsUi`)
- 근거: 펌웨어 `motion_home()`은 팔을 90°로 되돌린다(`motion.cpp:76-79`). 터치 정지·감시 정지(`behavior.cpp:155,203`)도 홈을 거치지만 웹 슬라이더는 그대로다.
- 영향: 화면 값과 실제 팔 각도가 다르다. 동작에는 영향 없다.
- 수정 제안: web. `moveDone`의 unexpected나 `d 83` 외에 `d 77` 뒤에도 슬라이더를 90으로 맞춘다.

## 경계 대조 체크리스트

### 명령 처리 경로 (펌웨어)
| 항목 | 판정 | 근거 |
|---|---|---|
| 줄 48B 초과 → `e 4 0` + 줄 끝까지 버림 | 통과 | `comms.cpp:46-52`. 내용 47B까지 허용 |
| 인자 개수·범위 → BAD_ARG, 무동작 | 통과 | `commands.cpp:49-88`, ACK 이전에 반환 |
| 생략 인자 DEFAULT | 통과 | MOVE period/size, TRIM save |
| ACK는 검증 직후·블로킹 전, DONE은 후 | 통과 | `commands.cpp:131` 뒤 실행, `:220` DONE. MOVE·TONE만 나중 DONE |
| 음수 파싱 | 통과 | `comms.cpp:75-84` |
| TEXT 전체 문자열 | 통과 | `comms.cpp:94-96` |
| 번호 변환 | 통과 | 제스처 `OttoHappy+(id-1)`, 노래 표 19개 |
| USB/BT 각자 버퍼, 응답 포트 | 통과 | `s_lb[2]`, `g_replyPort`, 이벤트는 `g_activePort` |
| STOP은 주기 사이·FALLEN에서도 | 통과 | `commands.cpp:139-144`, FALLEN은 홈 안 함 |

### loop 순서 대조 (behavior.md 2절 vs `otto_fat.ino:45-54`)
- 문서: 수신(STOP 즉시) → 센서 → 안전 → 명령 → motion. 코드: 센서 → 안전 → `comms_poll`(수신과 명령 실행을 한 번에, STOP 포함) → watchdog → MOVE 1주기.
- 차이는 "STOP을 센서 갱신 앞에서 처리하는가"뿐이고, STOP은 어느 쪽이든 다음 MOVE 주기 전에 처리되므로 지연이 같다. 명령이 안전 뒤에 실행되는 점은 문서와 같다. 따라서 실질 동일. 다만 위 [주요] 결함은 이 순서(명령이 터치 정지 뒤에 실행됨)에서 나온다.
- watchdog: poll 직후, `motion_cycle` 직전 판정(`behavior.cpp:199-206`) = 문서 "주기 종료 후 입력을 모두 읽은 뒤"와 일치. `g_lastValidRx`는 ACK 시각(`comms_ack`)이라 ERR·빈 줄은 갱신 안 함 = 문서와 일치.

### 웹 ↔ 펌웨어 타이밍·버퍼
| 항목 | 판정 | 근거 |
|---|---|---|
| ACK 타임아웃(웹 1.5초, 이동 중 + period) > 펌웨어 최악 ACK 지연 | 통과 | 최악은 MOVE 한 주기(≤3000) + 센서 약 30~60ms. `link.js:_ackTimeout`. 초음파 없음이라 AVOID(2걸음+홈≈2.5초)는 실물에서 발생하지 않음(발생해도 재전송 1회로 흡수) |
| DONE 타임아웃 30초 > 가장 긴 동작 | 통과 | 제스처·노래·TEXT(9자) 모두 수 초~십수 초 |
| keepalive 간격 vs watchdog 1500ms | 통과 | `min(1000,max(500,ceil(P/3)))`, poll이 watchdog 판정보다 먼저라 주기 중 쌓인 줄이 인정됨. 한 주기에 최소 1줄이 남는다 |
| 64B 버퍼: 블로킹 1주기 동안 웹이 보낼 수 있는 최대 | 통과 | inflight 1개만 송신(다른 명령은 웹 큐 대기). keepalive 1줄(≤14B) + 타임아웃 재전송 1줄(≤14B) + STOP(2B, 중복 합침) ≈ 30B < 64B. behavior.md 6절의 "3줄" 가정보다 실제는 더 적다 |
| BLE 20B 분할 vs 펌웨어 줄 조립 | 통과 | 웹 `_writeChain` 순차 await, 펌웨어 `feed()`는 바이트 단위. 수신은 `LineSplitter` |
| MATRIX 34B 왕복 | 통과 | `X`+8×3자리=34B(<48). 20+14로 분할, 응답 `a 88`/`d 88` |

### 웹
| 항목 | 판정 | 근거 |
|---|---|---|
| 모든 송신 encode() | 통과 | check_contract 경고 0 |
| ERR 6코드 한국어 | 통과 | `names.js ERR_HELP` UNKNOWN_CMD/BAD_ARG/BUSY/LINE_TOO_LONG/SENSOR_FAIL/FALLEN. 토스트로 표시 |
| EVENT 6종 | 통과 | TOUCH(깜빡임), OBSTACLE·SOUND(토스트), FALL(토스트+배너), RECOVER(토스트), BOOT(토스트+재핸드셰이크) |
| STATE 5종 | 통과 | `STATE_KO`, 센서 카드·이동 상태줄 |
| 조각난 수신 줄 | 통과 | `line-splitter.js`, `test_protocol_js` 포함 |
| 연결 끊김 후 UI | 통과 | `_reset`, 재연결 버튼, serial `_unplugged` |
| INFO 4필드 / TRIMS 해석 | 통과 | `onInfo`, `ui-calib` TRIMS 수신 전 트림 버튼 비활성(YL −10 덮어쓰기 방지) |
| 초음파 부재 표시 | 통과 | INFO sensors 비트 2 없음 → "센서 없음", AUTO 비트 2 비활성 |
| 데모와 실제 펌웨어 규칙 | 한 건 불일치 | 위 [주요] 참조. 그 외 ACK 시점, ERR 허용표(AVOID/FALLEN), watchdog, STOP 순서, TONE 교체 순서, PING 얼굴 불변, 센서 구성(초음파 없음)은 일치 |

### 안전·하드웨어
| 항목 | 판정 | 근거 |
|---|---|---|
| 우선순위 넘어짐 > 터치 > 장애물 > 명령 | **명령이 터치를 뚫음** | 위 [주요]. 나머지 순서는 `behavior.cpp:147-178`대로 |
| 장애물 후퇴 전진 계열만, 히스테리시스 | 통과 | `motion_isForward`(1,9,12), 10/15cm `s_obstArmed` |
| 넘어짐 detach, 회복 attach | 통과 | `fall()`, `recover()` |
| Wire 타임아웃, IMU 실패 시 멈추지 않음 | 통과 | `setWireTimeout(3000,true)`, 3회 실패 → `e 5 0` |
| pulseIn ≤ 25ms | 통과 | `US_TIMEOUT_US 25000`, 초음파 없으면 측정 안 함 |
| String 미사용, F() | 통과 | grep 결과 없음 |
| 핀 번호 | 통과 | config.h = 핀 표 (D2~D7 서보, A0 터치, A1/A2/A3 매트릭스, D8/D9 초음파, D11/D12 BT, D13 부저, A6 사운드) |
| 터치가 loop와 무관하게 확정 | 통과 | delay(10)×3 재샘플 |

## 하드웨어에서만 확인 가능한 항목
- IMU pitch/roll 부호(앞으로 기울일 때 +인지), 걷는 중 원시 기울기가 60°를 넘지 않는지(오탐), 실제 넘어짐 감지 지연.
- 터치센서 눌림 HIGH와 블로킹 주기 중 짧은 탭 누락(구조상 한계).
- BLE 지연이 큰 환경에서 period 3000일 때 watchdog(1500ms)이 걸리지 않는지.
- 팔 90°가 "내린 자세"인지, 좌우 방향.
- 서보 동시 구동 시 브라운아웃, SoftwareSerial 수신 손실(서보 인터럽트와 경합).
- USB 경로의 FTDI 반복 데이터와 80ms 중복 제거 창.
- 초음파는 센서 불량 의심이라 하드웨어 수리 후 재검증.

## 통과 판정: FAIL (주요 1건, 치명 0건)
- 담당별: firmware(+protocol 문서) 1건(터치 정지 직후 keepalive MOVE 재시작), web 경미 1건(데모 loop 순서 정렬은 위 주요에 포함, 팔 슬라이더 표시), firmware 경미 1건(Flash 99%).
- `docs/hardware-test.md`는 통합 PASS 때 작성하므로 이번 라운드에서는 만들지 않았다.
