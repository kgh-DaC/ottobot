# QA 보고 — 2026-11-24 firmware (단계 3, comms 모듈)

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| gen_protocol --check | 통과 | protocol.h, protocol.js가 정의와 일치 |
| check_contract | 오류 38 / 경고 31 | 오류 전부 "처리 코드 없음" 계열. 아래 "미구현" 참조. 미구현 외 오류 없음 |
| test_protocol_js | 통과 | 통과 224, 실패 0 |
| compile.py (otto_fat) | 통과 | 경고 0, Flash 10106B (32%), RAM 674B (32%), 남은 1374B. 로그 `_workspace/qa_compile_fw1.log` |
| node --check web/js/*.js | 통과 | 4개 파일 모두 문법 오류 없음 |

## 미구현 (결함 아님, 이번 범위 밖)
- 펌웨어 `CMD_*` 14종 처리 코드 없음 (PING, STOP, MOVE, GESTURE, SING, TONE, MOUTH, MATRIX, TEXT, ARMS, SERVO, TRIM, TELEM, AUTO). commands/motion/face/behavior 모듈 미구현이고, `otto_fat.ino`는 임시 스텁이다.
- 펌웨어 `MSG_INFO`, `MSG_TRIMS`, `MSG_TELEMETRY` 송신 코드 없음 (sensors/commands 미구현).
- 웹 쪽 송신(CMD 14종)·수신 처리(INFO, TRIMS, ACK, DONE, ERR, TELEMETRY, EVENT) 코드 없음. web 작업 중이라 미구현으로 분류. `states.AVOID` 경고도 같은 이유다.

## 명령 처리 경로 대조 (comms.cpp, protocol.md 기준)
| 항목 | 판정 | 근거 |
|---|---|---|
| 줄 길이 초과 시 `e 4 0`을 보내고 줄 끝까지 버림 | 통과 | `comms.cpp:47-52`. 내용 47바이트까지 허용하고 48번째 글자에서 `overflow=true`, `ERR_LINE_TOO_LONG` 전송. `:46`에서 `\n`까지 버리고 `:35,42-43`에서 초기화. 버퍼는 `PROTO_MAX_LINE+1`이라 넘치지 않음. protocol.md 12행과 일치 |
| 인자 개수·범위 검사, 생략 시 DEFAULT | 미구현 (commands 모듈) | comms는 정수 파싱 실패와 인자 9개 이상(`PROTO_MAX_ARGS` 초과)만 false로 돌려주고 `*_MIN_ARGC`/`*_ARGC`/범위는 보지 않음. `g_argc`로 판단하는 쪽은 commands 구현 때 확인 |
| ACK는 검증 직후·블로킹 이전, DONE은 실행 후 | API 통과, 사용처 미구현 | `comms_ack`/`comms_done`이 분리돼 있음. 호출 순서는 commands 구현 때 확인 |
| 음수 인자(TRIM) 파싱 | 통과 | `parseInt16` (`:66-82`)이 `-` 부호와 -32768~32767 범위를 처리. `-`만 있거나 `+5`, `1a`는 거부 |
| TEXT 문자열은 토큰 뒤 공백 하나 이후 전체 | 통과 | `:88-92`. `W HELLO WORLD`에서 `g_strArg="HELLO WORLD"`, 공백 포함. `W`와 `W `는 argc=0이므로 commands에서 BAD_ARG 처리 필요. 소문자 대문자 변환은 commands 몫 |
| 토큰 뒤에 글자가 바로 붙은 줄 | 통과 | `:88`에서 `false`를 돌려주고, 스텁은 `ERR BAD_ARG`를 보냄 |
| USB·BT 별도 버퍼, 응답이 보낸 쪽으로 | 통과 | `s_lb[2]`를 포트별로 사용(`:20,61-62`). `g_replyPort=portMask` 후 handler 호출(`:38`). `comms_ack`/`comms_err`는 `g_replyPort`로 전송. 줄 길이 초과 ERR도 해당 포트로 감(`comms_errTo(portMask)`) |
| 빈 줄, `\r` 처리 | 통과 | `:33,37` |
| STOP이 연속 MOVE 주기 사이에서, FALLEN 중에도 수신 | 미구현, 설계 위험 있음 | 아래 경미 결함 참조 |
| 컴파일 한도 | 통과 | RAM 32%, 남은 1374B(기준 500B 이상) |
| 핀 | 통과 | `PIN_BT_RX/TX` = 11/12가 otto-hardware 표와 일치. `BT_BAUD` 9600 |

## 결함 (심각도순)

치명 0건, 주요 0건.

### [경미] comms_poll 재진입 시 줄 버퍼 손상 가능 (STOP 수신 경로 미확정)
- 담당: firmware
- 위치: `firmware/otto_fat/comms.cpp:31-45, 56-64`
- 근거: handler 실행 중에는 `lb.len`과 `lb.buf`가 초기화되지 않는다(`h(lb.buf)` 후 `:42`에서 `lb.len=0`). behavior.md 139행은 STOP을 MOVE 주기 사이에 확인한다고 정한다. 그 확인을 handler 안(MOVE 실행 중)에서 `comms_poll`로 하면 같은 포트의 `feed`가 실행 중인 줄 버퍼에 이어 붙는다. 이때 실행 중인 `g_strArg`가 손상되고, 새 줄이 이전 줄 뒤에 붙어 잘못 파싱된다. 복귀 후에는 `lb.len=0`으로 도착 중이던 줄의 앞부분도 사라진다.
- 영향: MOVE 중 STOP 또는 새 MOVE가 무시되거나 깨진 명령으로 해석됨. 현재 코드에서는 아직 발생하지 않는다.
- 수정 제안: comms에 "블로킹 중 STOP 확인용" 경로를 정한다. 예를 들어 handler 호출 전에 줄을 별도 복사본으로 옮기고 `lb.len`을 0으로 비운 뒤 호출하거나, `comms_pollStop()` 같은 전용 함수를 둔다. motion 모듈 구현 전에 정하는 것이 좋다.

### [경미] comms_send 버퍼 경계 검사 부족 (잠재)
- 담당: firmware
- 위치: `comms.cpp:113-120`
- 근거: 자릿수 복사만 `len < PROTO_MAX_LINE-1`로 막고, 공백(`out[len++]=' '`)과 `\n`은 검사하지 않는다. 인자 n이 큰 호출이 생기면 `out[48]`을 넘는다.
- 영향: 현재 호출은 n≤2이고 프로토콜 최악 줄이 24바이트라 실제 발생하지 않는다. TELEMETRY 인자 수가 늘면 스택이 손상될 수 있다.
- 수정 제안: 루프 앞에 `if (len + 1 >= PROTO_MAX_LINE) break;` 같은 검사를 추가한다.

## 하드웨어에서만 확인 가능한 항목
- SoftwareSerial 9600 수신 중 Servo(Timer1)·`tone`(Timer2) 인터럽트로 BLE 바이트가 유실되는지. 특히 MATRIX처럼 긴 줄(약 30바이트 이상)을 서보 구동 중에 보낼 때.
- 동작 중 BT·USB 입력이 SoftwareSerial 64바이트 버퍼를 넘기는지(블로킹 구간이 길 때).
- USB와 BLE를 동시에 연결했을 때 `g_activePort`가 의도대로 마지막 올바른 줄의 포트로 따라가는지(이벤트가 `g_activePort`로만 가고, 첫 ACK 전에는 BT가 기본값).

## 통과 판정: PASS (치명·주요 0건)
comms 모듈 범위의 판정이다. 계약 검사 오류 38건은 모두 미구현 모듈과 web 때문이므로 통합 판정은 이후 단계에서 한다. 경미 2건은 motion 구현 전에 반영하길 권한다. 통합 PASS 전이라 `docs/hardware-test.md`는 작성하지 않았다.
