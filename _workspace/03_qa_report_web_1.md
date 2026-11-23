# QA 보고 — 단계 3, 대상: web (transport / link / demo-robot)

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| 펌웨어 컴파일 | 생략(지시) | |
| gen_protocol --check | PASS | protocol.h, protocol.js 일치 |
| check_contract | 오류 12 / 경고 1 | 오류는 모두 "명령 X 송신 코드 없음"(PING GESTURE SING TONE MOUTH MATRIX TEXT ARMS SERVO TRIM TELEM AUTO) = 화면 미구현. 경고: SENSOR_FAIL 표시 없음 = 미구현 |
| test_protocol_js | PASS | 통과 224 / 실패 0 |
| node --check web/js/*.js | PASS | 6개 파일 모두 문법 OK |

## 결함 (심각도순)

### [주요] web — 방향 전환(뗐다가 바로 다시 누름) 시 새 MOVE가 늦게 온 STOP의 `d 77`로 취소됨
- 위치: link.js `stop()` 158-165행, `holdMove()` 125행, `_onDone()` 274-280행, `_onAck()` 251-257행
- 근거: `stop()`은 `expectMoveDone = true`를 세우고, `holdMove()`는 즉시 `expectMoveDone = false`로 덮어쓴다. 펌웨어는 STOP을 MOVE 주기 경계(최대 3초 뒤)에 처리하므로 수신 순서는 `a 83, d 77, d 83, a 77`이다. 이때 `d 77`이 도착하면 `this.hold`는 새 MOVE이고 `expectMoveDone`은 false라서 `unexpected`로 판정하고 `_setHold(null)`을 호출한다. 이어서 새 MOVE의 `a 77`이 오면 `!hold && !stopPending && !expectMoveDone`이라 "자동 정지 뒤 늦게 도착한 MOVE"로 보고 STOP을 또 보낸다.
- 영향: 이동 중 버튼에서 손을 뗐다가 한 주기 안에 다른 방향을 누르면 로봇이 반응 없이 멈춘다. 데모 로봇도 같은 순서로 동작하므로 데모에서 재현된다.
- 수정 제안: web(link). STOP이 만든 `d 77`은 STOP 응답 구간(`a 83`~`d 83`) 안에서 흡수한다. 예를 들어 STOP마다 기대 `d 77` 개수를 세거나, `d 83`을 받을 때까지 `d 77`을 STOP 몫으로 처리한다.

### [주요] web — 긴 블로킹 동작 중 STOP을 누르면 1.5초·3초 뒤 "STOP 응답 없음, 전원 스위치를 직접 끄세요" 오류
- 위치: link.js `_ackTimeout()` 184-188행, `stop()` 172-179행
- 근거: 블로킹 동작(제스처·노래·TEXT) 중에는 펌웨어가 입력을 읽지 못한다(behavior.md 156행). 그런데 `_ackTimeout()`은 `hold` 또는 MOVING/AVOID일 때만 시간을 늘린다. `waitDone`(블로킹 대기) 중에는 1500ms 그대로다. STOP은 1.5초에 재전송하고 3초에 reject한다. 동작이 3초를 넘으면(데모의 GESTURE는 3000ms, 실물 제스처·노래는 더 길 수 있음) 로봇은 정상인데 거짓 긴급 오류가 뜬다.
- 영향: 사용자가 정지가 실패했다고 오해해 전원을 끌 수 있다. 재전송된 STOP이 한 번 더 쌓여 `d 83`도 두 번 온다.
- 수정 제안: web(link). `waitDone` 중에는 STOP ACK 타임아웃을 DONE 타임아웃(30초) 수준 또는 남은 시간으로 하고, 재전송을 하지 않는다. 실패 문구는 "응답 지연"으로 낮춘다.

### [경미] web — STOP이 inflight 명령을 취소하지 않아 STOP 뒤에 재전송이 나갈 수 있음
- 위치: link.js `stop()` 158-165행, `_ackTimedOut()` 208-221행
- 근거: `stop()`은 `queue`만 비우고 `inflight`와 그 타이머는 그대로 둔다. ACK를 받지 못한 `holdMove` 첫 MOVE(keepalive가 아님)가 있으면 STOP 뒤에 1회 재전송되어 로봇이 다시 움직일 수 있다. 이때 `expectMoveDone`이 true라서 안전망 STOP도 작동하지 않는다.
- 수정 제안: web(link). `stop()`에서 inflight의 타이머를 지우고 reject한다.

### [경미] web — MOVE 0(home) 대기가 MOVE 중단의 `d 77`에 일찍 풀림
- 위치: link.js `_onDone()` 282-288행, demo-robot.js 259행
- 근거: 이동 중 `M 0`의 응답은 `a 77` → `d 77`(MOVE 중단) → 홈 → `d 77`이다. `waitDone.code === 77`이라 첫 `d 77`에서 busy가 풀리고 `_pump()`가 돌아, 홈 동작 중 다음 명령이 나간다.
- 수정 제안: web(link). MOVE 0은 이동 중이었다면 `d 77`을 2개 기다린다. 이 문제는 펌웨어에도 같은 모호성이 있는지 protocol 담당 확인이 필요하다(protocol.md에 이 순서가 명시돼 있지 않음).

### [경미] web — 데모 로봇 `send()`가 줄 길이에 따라 순서를 뒤집음
- 위치: demo-robot.js 107행 `setTimeout(() => this._rxBytes(line), Math.max(2, line.length))`
- 근거: 긴 줄(예: `M 1 1000 15\n`, 12ms) 뒤에 짧은 STOP(2ms)이 오면 STOP이 먼저 버퍼에 들어간다. 실제 UART는 순서를 지킨다.
- 영향: 아주 빠른 탭에서 데모는 "STOP 뒤 MOVE"로 처리해, 실물과 다른 결과가 나온다.
- 수정 제안: web(demo). 도착 시각을 단조 증가시킨다(이전 줄의 도착 시각 이후로 예약).

### [경미] web — 데모가 연결할 때마다 INFO와 BOOT를 보냄
- 위치: demo-robot.js 79행 `_bootMessages()`
- 근거: 실물은 부팅 때만 `i`와 `v 6`을 보내고, BLE 연결만으로는 아무것도 오지 않는다. 화면이 연결 직후 PING을 보내지 않고 이 INFO에 의존하면 데모에서만 통과한다.
- 수정 제안: web(demo). 최초 부팅 때만 보내고, 재연결에서는 보내지 않는다. 화면은 연결 직후 PING을 보내 INFO와 TRIMS를 받는다.

### [경미] web — serial-transport 연결 해제·재연결 경로
- 위치: serial-transport.js 123-128행 `_lost()`, 37행 `canReconnect`, 55행
- 근거 1: `_lost()`가 읽기 예외의 catch 안에서 `port.close()`를 호출한다. 이 시점에는 reader 락이 아직 해제되지 않아(finally에서 해제) close가 실패하고 `.catch(() => {})`로 가려진다. 포트가 열린 채 남는다.
- 근거 2: 케이블을 뽑은 뒤에도 `canReconnect`가 true라서, "다시 연결"이 낡은 port로 `open()`을 시도하고 "다른 프로그램이 쓰고 있나" 오류가 나온다.
- 근거 3: `send()`는 호출마다 `getWriter()`를 받는다. 쓰기가 끝나기 전에 STOP이 겹치면 TypeError(락)로 실패한다. 재전송이 있어 복구는 되지만 지연된다.
- 근거 4: `disconnect` 리스너는 `_lost` 경로에서 제거되지 않아 재연결할 때마다 쌓인다. 동작에는 영향이 없다.
- 수정 제안: web. finally 뒤에 close하고, 분리 시 `port = null`로 두며, 쓰기를 직렬화(체인)한다.

### [경미] web — BLE 세부
- ble-transport.js 74행: `startNotifications()` 뒤에 리스너를 붙인다. 그 사이에 온 첫 notify를 놓칠 수 있다. 리스너를 먼저 붙이는 편이 안전하다.
- ble-transport.js 114-127행: `_manual` 플래그는 `gatt.disconnect()` 뒤 `finally`에서 곧바로 false가 된다. `gattserverdisconnected`는 비동기로 오기 때문에 플래그가 소용없다. Link가 상태 중복을 걸러내서 증상은 없다.
- send()의 쓰기가 중간에 실패하면 줄이 일부만 나가고 다음 줄과 이어 붙는다. 로봇은 48B 초과나 BAD_ARG를 돌려준다. 재전송으로 복구된다.

## 체크리스트 대조 (통과 항목)
- BLE: 20B 분할을 `_writeChain`으로 직렬 처리하고 각 조각을 `await`한다. notify는 LineSplitter로 조립해 `\n`에서 자른다(DataView, `\r`, 다중 바이트 안전). 후보 FFE0/FFE1을 먼저 보고, 이어서 FFF0, Nordic, ISSC와 속성 기반 대체 선택이 있다. 연결 후 서비스와 특성 목록을 로그로 남긴다. `gattserverdisconnected`를 처리한다.
- Serial 중복 방어: 같은 줄이 80ms 안에 다시 올 때만 버린다. 9600bps에서 정상 텔레메트리 간격(최소 100ms)과 keepalive 응답(500ms 이상)은 통과한다. 반복이 이어지는 동안만 창을 연장한다. 수신량 1100B/s 초과 경고가 있다. 실제 FTDI 반복 주기가 80ms보다 길면 방어가 안 될 수 있다(아래 하드웨어 항목).
- link: ACK 타임아웃 1.5초(MOVE 중이면 + period), 재전송 1회, 이후 reject. STOP은 큐를 비우고 즉시 쓴다. 블로킹 DONE 대기 중에는 `_pump`가 막힌다. DONE 타임아웃 30초는 가장 긴 동작보다 길다. keepalive 간격 `min(1000, max(500, ceil(period/3)))`는 문서와 같다.
- demo: ACK는 검증 직후 실행 전에 보내고 DONE은 1회다. 교체 MOVE는 DONE이 없다. 블로킹 명령이 MOVE를 끝낼 때의 순서(`a` → `d 77` → `d xx`)가 맞다. 감시 1500ms는 주기 종료 후 판정하고 `a 83`·`d 83` 없이 `d 77`만 보낸다. FALLEN은 e6, AVOID는 e3이며 허용 명령 집합이 behavior.md 표와 일치한다. INFO는 4필드이고 PING에서 `c`(TRIMS)를 보낸다. TONE 교체 시 새 ACK 뒤에 앞 `d 84`를 보낸다. 줄 길이 초과 처리와 64B 수신 버퍼 모사가 있다.
- 줄 조각 수신: LineSplitter 단일 구현을 BLE와 Serial이 공유한다.

## 미구현 (결함으로 세지 않음)
- 명령 12종의 송신 코드, SENSOR_FAIL 표시, ERR 한국어 표시, EVENT·STATE 화면 반영, UI 연결·재연결 버튼. 모두 화면 모듈이 없기 때문이다.
- USB 연결 후 `bootWaitMs`(1800ms) 대기는 transport가 값을 노출만 한다. 화면이나 Link가 이 시간 동안 송신을 보류해야 한다. 이 처리는 화면 단계에서 확인한다.
- 펌웨어 motion의 제스처·노래 id 변환 결함은 이미 담당에게 전달됨(중복 보고 생략).

## 하드웨어에서만 확인 가능한 항목
- 실제 모듈의 서비스 UUID(FFE0/FFE1 가정), write-without-response 지원, notify 조각 크기.
- FTDI 반복 데이터의 실제 주기. 80ms 창이 맞는지 확인한다.
- 실물 제스처·노래의 최장 시간과 AVOID 후퇴 시간. DONE 30초와 ACK(period 가산) 타임아웃에 충분한지 본다.

## 통과 판정: FAIL (주요 2건: link의 재누름 취소, 블로킹 중 STOP 거짓 오류)
이 둘은 담당 web(link.js)이다. 나머지는 경미다.
