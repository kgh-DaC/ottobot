---
name: otto-protocol
description: "Otto 로봇의 블루투스/시리얼 통신 프로토콜(명령·응답·텔레메트리·이벤트)을 설계·수정하고, protocol.json에서 펌웨어 protocol.h와 웹 protocol.js를 생성하며, 펌웨어↔웹 계약 일치를 검사한다. 명령 추가, 응답 형식 변경, 센서 값 전송 방식 변경, '프로토콜', '명령어', 'BT 명령', '텔레메트리' 관련 작업에 반드시 사용한다. 펌웨어 내부 로직만 바꾸는 작업이나 웹 화면 디자인만 바꾸는 작업에는 쓰지 않는다."
---

# Otto 통신 프로토콜

## 왜 이렇게 하는가

펌웨어와 웹을 따로 만들면 가장 자주 깨지는 곳이 둘 사이의 약속이다. 명령 글자 하나, 인자 순서 하나만 달라도 컴파일·화면 모두 정상인데 로봇이 반응하지 않는다. 그래서:

1. **`protocol/protocol.json` 하나만 사람이(에이전트가) 편집한다.**
2. `scripts/gen_protocol.py`가 `firmware/otto_fat/protocol.h`와 `web/js/protocol.js`를 만든다. 생성물은 직접 고치지 않는다.
3. `scripts/check_contract.py`가 양쪽이 모든 명령·메시지를 실제로 다루는지 기계적으로 확인한다.

## 처음 만들 때

`references/protocol-baseline.json`을 `protocol/protocol.json`으로 복사한 뒤 요구사항에 맞춰 고친다. 기준안은 Otto 공식 앱(Otto_APP)의 동작·제스처·노래 번호와 호환되게 짜여 있다. 필요 없는 명령을 빼거나 새 명령을 더해도 된다.

## 형식 규칙과 이유

| 규칙 | 이유 |
|------|------|
| 한 줄 = 한 메시지, `\n`으로 끝남. `\r`은 무시 | 시리얼 모니터로도 손으로 시험할 수 있다 |
| 첫 글자 = 토큰(1글자), 이후 공백으로 구분한 인자 | Nano에서 `switch(line[0])` 한 번으로 분기, 파서가 작다 |
| 명령 토큰은 대문자, 메시지 토큰은 소문자 | 로그에서 방향(웹→로봇 / 로봇→웹)이 바로 보인다 |
| 인자·필드는 **정수만**. 문자열 인자는 마지막 하나만 | AVR `sscanf`는 float 미지원, `String` 클래스는 힙 단편화 |
| `max_line` 48바이트 이하 | 펌웨어 줄 버퍼가 고정 크기. SoftwareSerial 버퍼(64B)도 넘지 않게 |
| 뒤쪽 인자에만 `default` | 생략 규칙을 단순하게 유지 |
| 명령마다 ACK를 실행 **전**에 보냄 | Otto 동작은 블로킹이라 실행 후에 응답하면 웹이 수 초 동안 연결이 끊긴 줄 안다 |
| 1회성 명령은 끝나면 DONE | 웹이 다음 명령을 보낼 시점을 안다 |
| 알 수 없는 줄·범위 밖 값은 ERR + 무시 | 잘못된 명령으로 서보가 이상한 각도로 가는 것을 막는다 |
| STOP은 어떤 상태에서도 받는다 | 안전. 연속 동작은 한 주기 사이마다 입력을 확인한다 |

ACK/DONE/ERR의 `cmd` 필드는 명령 토큰의 ASCII 코드(정수)다. 웹은 `cmdNameFromCode()`로 이름을 얻는다.

## 변경 절차

1. `protocol/protocol.json`을 고친다. 하위 호환이 깨지면(토큰 변경, 인자 순서 변경, 필드 삭제) `version`을 1 올린다.
2. 생성: `python .claude/skills/otto-protocol/scripts/gen_protocol.py --root .`
3. `docs/protocol.md`의 표와 예시를 맞춘다(사람이 읽는 문서).
4. 영향받는 쪽(펌웨어/웹)에 무엇이 바뀌었는지 알린다. 생성물만 바뀌고 처리 코드가 없으면 계약 검사가 실패한다.
5. 검사: `python .claude/skills/otto-protocol/scripts/check_contract.py --root .` 와 `node .claude/skills/otto-protocol/scripts/test_protocol_js.mjs .`

## protocol.json 스키마

```jsonc
{
  "version": 1,
  "transport": { "baud": 9600, "line_end": "\n", "max_line": 48 },
  "commands": [ { "name": "MOVE", "token": "M", "desc": "...",
                  "args": [ { "name": "id", "min": 0, "max": 20 },
                            { "name": "period", "min": 400, "max": 3000, "default": 1000 },
                            { "name": "text", "type": "str", "maxlen": 20 } ] } ],
  "messages": [ { "name": "TELEMETRY", "token": "t", "fields": ["dist_cm", "touch"] } ],
  "errors": [ { "name": "BAD_ARG", "code": 2 } ],
  "events": [ { "name": "FALL", "code": 3 } ],
  "states": [ { "name": "IDLE", "code": 0 } ]
}
```

생성기는 다음을 검증하고 실패하면 아무것도 쓰지 않는다: 토큰 1글자·중복 없음, 이름 대문자, int 인자 min≤max, default 범위, str 인자는 마지막, 최악 인코딩 길이 ≤ max_line, 코드 중복 없음.

## 생성물 사용법

**펌웨어 (`protocol.h`)**
```cpp
#include "protocol.h"
switch (line[0]) {
  case CMD_MOVE: /* 인자 수 CMD_MOVE_MIN_ARGC..CMD_MOVE_ARGC, 범위 CMD_MOVE_ID_MIN..MAX */ break;
}
reply(MSG_ACK, CMD_MOVE);            // "a 77"
reply(MSG_ERR, ERR_BAD_ARG, cmd);    // "e 2 77"
```
`case 'M':`처럼 글자를 직접 쓰지 않는다. 계약 검사가 `CMD_MOVE` 참조로 처리 여부를 판단한다.

**웹 (`protocol.js`)**
```js
import { encode, parseLine, CMD, MSG, EVT_NAME, cmdNameFromCode } from './protocol.js';
transport.send(encode('MOVE', 1, 1000));   // "M 1 1000 15\n"  (size는 default)
const m = parseLine(line);                 // { name: 'TELEMETRY', fields: { dist_cm: 23, ... } }
```
명령 문자열을 손으로 조립하지 않는다. `encode()`가 범위 검사를 한다.

## docs/protocol.md 에 들어갈 내용

명령 표(토큰, 인자, 범위, 응답), 메시지 표, 오류·이벤트·상태 코드, 시리얼 모니터로 시험하는 예시 대화(`P` → `a 80`, `i 1 ...`, `d 80`), 버전 변경 이력.
