---
name: otto-web
description: "Otto 로봇을 BLE 블루투스 모듈 otto2(Web Bluetooth API, 보조로 USB Web Serial)로 조종하는 웹 컨트롤러(web/)를 작성·수정한다. 연결 화면, 방향 이동, 제스처·노래, 8x8 LED 매트릭스 편집기, 팔 슬라이더, 센서 텔레메트리(거리·터치·기울기) 표시, 이벤트 로그, 자동 반응 설정, 트림 보정, 가상 로봇(데모) 모드를 다룬다. '웹페이지', '컨트롤러 화면', '웹 앱', 'UI', '버튼 추가', '연결이 안 돼' 요청에 사용한다. 프로토콜 변경은 otto-protocol, 로봇 쪽 코드는 otto-firmware를 쓴다."
---

# Otto 웹 컨트롤러 작성법

먼저 `otto-protocol` 스킬을 읽는다. 웹은 `web/js/protocol.js`(생성물)의 `encode()`/`parseLine()`만으로 통신한다.

## 연결 방식이 정해진 이유

- 로봇의 블루투스 모듈 `otto2`는 **BLE UART 모듈**이다(2026-11-24 실측, `otto-hardware` 참고). 클래식 SPP가 아니므로 COM 포트가 생기지 않는다. ref의 OttoWebAppControl과 같은 방식이다.
- 기본 연결은 **Web Bluetooth API**: `navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'otto' }, { namePrefix: 'OTTO' }], optionalServices: [0xFFE0, ...후보] })` → GATT 연결 → UART 특성에 `startNotifications()` + `writeValueWithoutResponse()`.
  - HM-10/CC2541 계열은 서비스 `0xFFE0` / 특성 `0xFFE1` 하나로 송수신한다. 다른 계열(HC-08 등, Nordic UART `6e400001-b5a3-f393-e0a9-e50e24dcca9e`)도 후보로 넣고, 연결 후 실제 서비스·특성 목록을 로그에 남긴다.
  - 쓰기는 **16바이트 단위로 나눠** 순서대로 보낸다(otto2 모듈은 17B 이상 한 번에 쓰면 멈춤 — otto-hardware 참고). 수신 notify는 조각이므로 버퍼에 이어 붙여 `\n`으로 자른다.
  - `gattserverdisconnected` 이벤트로 끊김을 감지하고 재연결 버튼을 보여준다.
  - 지원: 데스크톱 Chrome/Edge, 안드로이드 Chrome. iOS Safari 미지원. `'bluetooth' in navigator`로 기능 감지하고, 없으면 안내 문구와 함께 **데모 모드**를 권한다.
- 보조 연결: **USB Web Serial**(디버그용). 이 로봇의 FTDI 호환칩은 유휴 시 이전 데이터를 반복 전달하는 드라이버 문제가 있다 → USB 경로에서는 같은 줄이 짧은 시간에 반복되면 무시하는 방어 로직을 두고, 화면에 "USB는 디버그용"이라고 안내한다.
- 두 경로 모두 같은 transport 인터페이스를 구현한다.
- Web Bluetooth/Web Serial과 ES 모듈은 `file://`에서 막힌다. **로컬 서버로 연다**: `python -m http.server 8000 -d web` → `http://localhost:8000` (localhost는 보안 컨텍스트로 인정됨).

## 파일 구조 (빌드 도구 없음, 순수 HTML/CSS/ES 모듈)

```
web/
├── index.html
├── css/style.css
└── js/
    ├── protocol.js        생성물 — 직접 수정 금지
    ├── ble-transport.js   Web Bluetooth(BLE UART) 연결, 16B 분할 쓰기, notify 조각 조립
    ├── serial-transport.js  USB Web Serial (디버그용, 중복 줄 방어)
    ├── link.js            공통: 줄 단위 송수신, 명령 큐·ACK 대기
    ├── demo-robot.js      가상 로봇: transport와 같은 인터페이스, 프로토콜대로 응답·텔레메트리 생성
    ├── app.js             UI 상태와 이벤트 연결
    ├── matrix-editor.js   8x8 편집기 (행 바이트 ↔ 픽셀)
    ├── ui-twin.js         3D 형상(three.js): link 'tx'(보낸 명령)로 다리·팔·LED, 텔레메트리로 기울기·거리·터치·넘어짐
    └── layout.js          카드 블록(메이슨리) 배치: 카드마다 grid-row-end: span N, 빈칸은 dense로 채움
web/vendor/three-r160-bundle.js   three.js r160 + OrbitControls 로컬 묶음(SMARS 트윈과 같은 파일, window.SMARS_THREE). 외부 CDN 금지 원칙의 예외가 아니라 로컬 파일
```

- 3D 형상의 다리 움직임은 근사다: 로봇은 서보 각도를 보내지 않으므로 MOVE 번호별로 Otto.cpp의 진동자 값(A·O·위상차)을 웹에서 재현한다. 입모양 비트맵은 Otto_mouths.h Mouthtable(6x5, 행렬 y 3~7·x 1~6)을 쓴다. 팔은 명령 각도↑ = 들기, 90 = 내림(펌웨어 ARM_DIR 반영 뒤 의미)을 옆으로 드는 모습으로 그린다.
- `web/js/*.js`를 고치면 `python tools/build_web_bundle.py`로 bundle.js를 다시 만든다.

외부 CDN·프레임워크를 쓰지 않는다. 로봇 앞에서 인터넷이 없어도 열려야 하기 때문이다.

## transport 계약

```js
// 공통 인터페이스 (ble-transport.js, serial-transport.js, demo-robot.js 모두 구현)
connect(): Promise<void>
disconnect(): Promise<void>
send(line: string): Promise<void>         // encode() 결과만 받는다
onLine(cb: (line: string) => void)        // 수신 한 줄
onStatus(cb: (s: 'connected'|'disconnected'|'error', detail?) => void)
```

- 수신: BLE notify(또는 Serial readable) 조각 → `TextDecoder` → 버퍼에 모아 `\n` 단위로 자른다. 줄이 조각나 도착하는 것이 정상이다(BLE는 20B 단위).
- 송신: 한 번에 명령 하나. **ACK(또는 ERR)를 받은 뒤 다음 명령**을 보낸다. ACK 대기 1.5초 초과 시 재전송 1회 후 오류 표시. 예외: STOP은 큐를 비우고 즉시 보낸다.
- 연속 MOVE 중 방향을 바꾸면 새 MOVE만 보내면 된다(펌웨어가 교체). 버튼에서 손을 떼면 STOP.
- 연결 끊김(BLE `gattserverdisconnected`, Serial `disconnect`/read 예외)을 감지해 UI를 끊김 상태로 돌린다.
- 연결 직후 `PING` → `INFO`의 proto 버전을 `PROTO_VERSION`과 비교해 다르면 경고(펌웨어 다시 올리라고 안내).

## 화면 구성 (한국어 UI)

| 영역 | 내용 |
|------|------|
| 연결 바 | 연결/해제 버튼, 상태 표시, 연결 방식(BLE 기본 / USB 디버그), 데모 모드 토글, 연결 도움말(접기: 로봇 전원, 'otto2' 선택, 휴대폰 등 다른 기기와 연결돼 있으면 해제) |
| 긴급 정지 | 항상 보이는 큰 STOP 버튼, **스페이스바** |
| 이동 | 방향 패드 (누르는 동안 MOVE, 떼면 STOP), 키보드 화살표/WASD, 속도(period)·크기(size) 슬라이더, 기타 동작(id 5~20) 버튼 |
| 표현 | 제스처 13종, 노래 19종, 입모양 0~30, 텍스트 스크롤 입력 |
| LED 매트릭스 | 8x8 클릭 편집, 지우기/반전/프리셋, 보내기 |
| 팔 | 좌·우 슬라이더 (보낼 때 쓰로틀링 150ms 이상) |
| 센서 | 거리 게이지(cm), 터치 표시, 기울기 시각화(pitch/roll 로봇 실루엣 회전), 사운드 레벨, 상태(IDLE/MOVING/...) |
| 자동 반응 | 터치 정지·장애물 후퇴·넘어짐 감지·소리 반응 체크박스 → AUTO mask |
| 보정 | 다리 트림 4개 입력, 서보 직접 각도(SERVO), 저장 버튼(확인 대화상자) |
| 로그 | 송수신 원문 + 해석, 이벤트는 강조, 지우기 |

이름 표(제스처·노래·입모양·동작)는 `otto-hardware/references/otto-lib-api.md`의 번호를 따른다. 한국어 이름과 함께 원래 이름을 작은 글씨로 보여주면 Otto 자료와 대조하기 쉽다.

## 구현 원칙

- 명령은 **반드시 `encode()`**로 만든다. 범위 오류는 사용자에게 토스트로 보여준다.
- 수신은 `parseLine()` 결과의 `name`으로 분기한다. `RAW`는 로그에만 남긴다(부팅 진단 문자열 등).
- 연결 전에는 조작 버튼을 비활성화한다. FALLEN 상태에서는 이동 버튼을 비활성화하고 이유를 보여준다.
- 텔레메트리는 연결 시 `TELEM 200`으로 켜고, 탭이 숨겨지면(`visibilitychange`) 끈다(BT 대역 절약).
- 슬라이더처럼 연속으로 바뀌는 입력은 쓰로틀링한다. 9600bps는 초당 약 960바이트다.
- 휴대폰 화면에서도 깨지지 않게 반응형으로(조작은 터치 이벤트 지원), 안드로이드 Chrome에서는 BLE로 실제 조종이 가능하다. iOS는 미지원 안내를 띄운다.
- 접근성: 버튼에 텍스트 라벨, 색만으로 상태를 표시하지 않는다.

## 데모 모드(가상 로봇)

`demo-robot.js`는 `protocol.js`의 정의만 보고 동작한다: 명령 검증 → ACK → (지연) → DONE, 범위 밖이면 ERR, `TELEM` 주기로 그럴듯한 센서 값, 임의 시점 이벤트 버튼(터치/장애물/넘어짐 흉내). 하드웨어 없이 UI 전체를 시험할 수 있게 하는 것이 목적이다.

## 검증

```bash
node .claude/skills/otto-protocol/scripts/test_protocol_js.mjs .
python .claude/skills/otto-protocol/scripts/check_contract.py --root .
python -m http.server 8000 -d web   # 브라우저에서 데모 모드로 모든 버튼 확인
```
