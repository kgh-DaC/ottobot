# Otto Fat 로봇 프로젝트 인수인계 문서

- 작성일: 2026-11-24
- 상태: **개발 완료 · 통합 QA 통과 · 하드웨어 시험 진행 중** — 웹은 index.html 더블클릭으로 실행, BLE·USB 둘 다 조종 가능. 왼발목 바깥쪽 꺾임 안 됨 확인 필요. 팔 방향·기울기 축·BT 핀 D11/D12(실물 확인) 펌웨어 업로드 완료, **BLE 양방향 통신 해결(PC 직접 시험으로 확인), 웹 BLE 실물 확인 대기**, 팔·기울기 실물 확인 대기 (2026-11-24 갱신)
- 다음에 할 일: [6. 다음 단계](#6-다음-단계)부터 읽으면 된다.

---

## 1. 프로젝트 개요

Otto DIY 휴머노이드 Fat 버전(printables 225166)을 구동하는 Arduino 펌웨어와, 브라우저에서 블루투스로 조종하는 웹 컨트롤러다.

| 구성 | 위치 | 설명 |
|------|------|------|
| 통신 규약(단일 기준) | `protocol/protocol.json` | 명령 14개, 메시지 7개, 오류·이벤트·상태 코드. 여기서 아래 두 파일이 **자동 생성**된다 |
| 펌웨어 | `firmware/otto_fat/` | Arduino Nano(Optiboot) 스케치. `protocol.h`는 생성물이므로 직접 고치지 않는다 |
| 웹 컨트롤러 | `web/` | 정적 웹앱(빌드 도구·CDN 없음). `js/protocol.js`는 생성물 |
| 명세 문서 | `docs/protocol.md`, `docs/behavior.md` | 명령 표, 상태 머신, 자동 반응 규칙, 타이밍 |
| 하드웨어 시험 절차 | `docs/hardware-test.md` | 로봇 앞에서 순서대로 따라 하는 12단계 시험 |
| 핀 진단 도구 | `tools/pin_check/` | 핀 연결 진단 스케치 + 읽기 스크립트 |
| BLE·USB 진단 | `tools/ble_diag/` | `ble_diag.py`(PC에서 BLE 직접 연결해 양방향 시험), `usb_boot_ping.py`(USB 부팅·PING 확인) |
| 작업 기록 | `_workspace/` | 요구사항, 노트, QA 보고서, 컴파일 로그 (삭제하지 말 것) |
| 개발 하네스 | `.claude/agents/`, `.claude/skills/` | 이후 수정 작업용 에이전트 팀과 스킬 |

---

## 2. 하드웨어 (2026-11-24 실물 진단으로 확정)

| 장치 | 핀 | 상태 |
|------|----|------|
| 왼다리 / 오른다리 서보 | D2 / D3 | 정상 |
| 왼발목 / 오른발목 서보 | D4 / D5 | 정상 |
| 왼팔 / 오른팔 서보 | D6 / D7 | 정상 (좌우 실물 확인) |
| 초음파 TRIG / ECHO | D8 / D9 | **응답 없음** — 4선 연결은 확인됨. 센서 불량 또는 Vcc/Gnd 역결선 의심 |
| 블루투스 (Arduino RX / TX) | D11 / D12 | 2026-11-24 실물 재확인(모듈 TX→D11, 모듈 RX→D12). `ref/블루투스 회로도.jpg`(D10/D11)는 일반 HC-05 예제라 이 로봇과 다름. 양방향 정상 확인 |
| 수동 부저 | D13 | 정상 |
| 터치센서 | A0 | 평상시 0 정상. 누름은 미확인 |
| LED 매트릭스 CLK / CS / DIN | A1 / A2 / A3 | 정상. (0,0) = 정면 왼쪽 위, y=0 = 맨 위 행 |
| MPU6050 기울기 | A4 / A5 (I2C 0x68) | 정상. 바로 선 상태 pitch 약 +6° → 펌웨어에서 −6° 보정 |
| 사운드센서 | A6 | 배경값 51~54 |

**반드시 알아야 할 사실**

1. **블루투스 `otto2`는 BLE 모듈이다.** 광고 이름은 대문자 `OTTO2`, 서비스 `FFE0`에 **FFE1 = notify(수신), FFE2 = write(송신)**. 여러 줄을 몰아 보내면 모듈이 연결을 끊으므로 펌웨어는 BT 줄마다 20ms(`BT_LINE_GAP_MS`) 쉰다. 처음엔 HC-05(클래식)로 알았지만, Windows가 BLE 장치로 등록하는 것을 확인했다(MAC 98:DA:50:03:53:D9). 그래서 웹은 **Web Bluetooth**로 연결한다. PC에 페어링된 `ROBOT10`, `BIKE`는 이 로봇이 아니다.
2. **다리 트림이 EEPROM에 저장돼 있다.** YL(왼다리) −10, 나머지 0. 펌웨어가 부팅 때 자동으로 불러온다. EEPROM 0~3번지는 트림 전용이다.
3. **빌드는 Uno 보드 정의(`arduino:avr:uno`)로 하되, Flash는 30,720B를 넘기면 안 된다.** 넘기면 업로드는 되지만 부팅이 멈춘다(2026-11-24 실측). `compile.py`가 업로드 전에 막는다. 현재 30,588B — 여유 약 130B.
4. **USB 포트 COM10(FTDI 호환칩)은 유휴 시 이전 데이터를 반복해서 돌려주는 드라이버 문제가 있다.** 업로드는 정상이다. USB로 출력을 읽을 때는 `tools/pin_check/read_diag.py`처럼 중복을 걸러야 한다. 로봇 조종의 기본 경로는 BLE다.
5. **완성 펌웨어가 업로드돼 있다(2026-11-24).** 부팅 확인: `# Otto fat fw 1 proto 1 | IMU ok(0x68) | US none | touch 0 | auto 5`, PING 응답 `a 80 / i 1 1 1 5 / c -10 0 0 0 / d 80` 정상. PING 직후 터치 이벤트(`v 1 1`)가 한 번 들어왔는데, 실제로 만진 것인지 확인 필요(오검출이면 하드웨어 시험 6번에서 점검).
6. **업로드가 `not in sync`로 실패하면 USB 케이블을 뽑았다 다시 꽂는다.** FTDI 호환칩 드라이버가 이전 응답을 반복해 동기화가 깨지는 문제로, 2026-11-24에 재연결로 해결됐다. 같은 증상이면 보드 설정(Uno/Nano)은 원인이 아니다(업로드 설정 동일).

---

## 3. 완성된 기능

### 펌웨어 (`firmware/otto_fat`, Flash 94% · RAM 62%, 경고 0)
- USB와 BLE 두 포트에서 같은 명령을 받고, 응답은 명령이 온 포트로 보낸다.
- 동작 21종(Otto 앱 번호와 호환), 제스처 13종, 노래 19종, 부저 단음, 입모양 31종, 8x8 비트맵, 스크롤 텍스트(9자).
- 팔 서보 각도, 다리 서보 직접 각도, 트림 미리보기·저장.
- 텔레메트리(거리·터치·pitch·roll·소리·상태), 이벤트 통지.
- **자동 안전 반응** (우선순위: 넘어짐 > 터치 > 장애물 > 명령)
  - 넘어짐: 서보 전원 차단, 똑바로 세우면 자동 회복. 걷는 중에는 최대 2주기 안에 감지.
  - 터치: 즉시 정지 + 짧은 확인음.
  - 장애물: 전진 중 10cm 이내면 뒤로 2걸음 (초음파가 응답할 때만 켜짐).
  - 통신 끊김(watchdog): 걷는 중 1.5초간 명령이 없으면 스스로 정지.
  - 자동 정지 후 1초 동안 이동 명령 거부 → 버퍼에 남은 명령으로 다시 걷는 일 방지.
- 센서가 없어도 멈추지 않는다(부팅 때 감지해 해당 기능만 끔).

### 웹 (`web/`)
- BLE 연결(기본) + USB 연결(디버그용) + **데모 모드**(로봇 없이 모든 화면 시험).
- 방향 패드·키보드 조작, 큰 STOP 버튼과 스페이스바.
- 제스처·노래·입모양·텍스트·부저·팔 슬라이더, 8x8 매트릭스 편집기.
- 센서 계기판(거리·터치·기울기·소리), 이벤트 로그, 자동 반응 켜고 끄기.
- 보정 화면(로봇의 현재 트림을 받아 표시, 저장 전 확인).
- 한국어 UI, 안드로이드 Chrome에서도 BLE 조종 가능(iPhone 불가).
- 터치 반응(자동 반응 '터치 반응'): 움직이는 중 터치 = 정지, 멈춰 있을 때 터치 = 기쁨 제스처 → HELLO 흐르기 → 원위치(펌웨어, 약 6.5초).
- 화면 맨 아래 **핀 연결** 카드: 나노 핀헤더 그림·범례·표(`web/js/ui-pins.js`의 PINMAP). 핀을 바꾸면 `config.h`와 함께 고친다.

---

## 4. 실행 방법

**펌웨어 업로드** (로봇을 USB로 연결, 시리얼 모니터는 닫는다)
```bash
python .claude/skills/otto-firmware/scripts/compile.py --sketch firmware/otto_fat --upload --port COM10
```

**웹 실행**
```bash
python -m http.server 8000 -d web
```
Chrome 또는 Edge로 `http://localhost:8000` → 연결 → BLE → `otto2` 선택.

**또는 서버 없이 `web/index.html`을 더블클릭**(Chrome/Edge로 열기). 모듈을 묶은 `web/js/bundle.js`를 불러오므로 `file://`에서도 BLE·USB가 동작한다. `web/js/*.js`를 고친 뒤에는 `python tools/build_web_bundle.py`로 번들을 다시 만든다(`--check`로 일치 검사). USB 케이블 연결도 정식 지원: 연결 → USB 케이블 → COM10.

**검사 (코드를 고친 뒤)**
```bash
python .claude/skills/otto-protocol/scripts/gen_protocol.py --root . --check
python .claude/skills/otto-protocol/scripts/check_contract.py --root .
node   .claude/skills/otto-protocol/scripts/test_protocol_js.mjs .
python tools/build_web_bundle.py --check
python .claude/skills/otto-firmware/scripts/compile.py --sketch firmware/otto_fat
```
2026-11-24 마지막 결과: 생성물 일치, 계약 오류 0·경고 0, protocol.js 시험 224/0, 컴파일 성공(Flash 30,590B 94%, RAM 1,281B 62%).

---

## 5. 품질 검증 이력

| 단계 | 결과 | 주요 내용 (모두 수정 완료) |
|------|------|---------------------------|
| 펌웨어 모듈 QA 1~4 | 3회 PASS, 2회 FAIL 후 수정 | 제스처·노래 번호가 라이브러리 상수와 어긋남 / 걷는 중 넘어짐 감지 6~18초 지연 / 터치가 길게 눌러야 인식 |
| 웹 모듈 QA 1 | FAIL 후 수정 | 버튼을 빠르게 다시 누르면 정지 / 제스처 중 STOP 시 거짓 오류 |
| 통합 QA 1차 | FAIL 후 수정 | 방향키를 누른 채 터치하면 멈췄다가 최대 3초 다시 걸음 → 자동 정지 후 1초 이동 잠금 도입 |
| 통합 QA 2차 | **PASS** | 치명 0, 주요 0. 경미 2건도 수정 완료 |

보고서: `_workspace/03_qa_report_*.md`, `_workspace/04_qa_report_r1.md`, `_workspace/04_qa_report_r2.md`

---

## 6. 다음 단계

1. ~~펌웨어 업로드~~ — 2026-11-24 완료.
2. ~~BLE 수신 문제 진단~~ — 2026-11-24 해결(아래 작업 기록). **[지금 할 일] 웹에서 BLE로 연결해 PING 응답(배너 '로봇이 응답하지 않습니다'가 안 뜨는지)과 버튼 동작 확인.** 브라우저는 Ctrl+F5로 새로고침. 다시 문제가 생기면 웹 탭을 닫고 `python tools/ble_diag/ble_diag.py`로 진단:
   - ①에서 부팅 출력이 **깨진 글자**로 오면 보레이트 불일치 → `config.h` `BT_BAUD`를 115200·38400·19200 등으로 바꿔 시험(모듈 쪽 AT 설정 확인).
   - ①에서 **아무것도 안 오면** Arduino TX(D12)→모듈 RX 선·분압·전원 확인. ②만 실패하면 모듈 TX→D11 선 확인.
   - 둘 다 되면 하드웨어는 정상 → 웹 쪽 문제. 출력된 서비스·특성 UUID를 `web/js/ble-transport.js`의 `UART_CANDIDATES`와 비교(웹이 엉뚱한 notify 특성을 고르는지).
   - 실물 배선은 사용자 확인 결과 모듈 TX→D11, 모듈 RX→D12. `ref/블루투스 회로도.jpg`(D10/D11)는 이 로봇과 다르다.
3. **`docs/hardware-test.md`를 순서대로 진행.** 1·2번(업로드·부팅)은 완료(아래 작업 기록 참고), **3번(BLE 연결)부터** 이어서 하면 된다. 로봇을 받침 위에 올려 두고 시작한다. 특히 확인할 것:
   - BLE 서비스 UUID: 연결 후 웹 로그에서 확인. "UART 특성을 찾지 못했습니다"가 나오면 로그의 UUID를 `web/js/ble-transport.js`의 `UART_CANDIDATES`에 추가.
   - 기울기 부호: 앞으로 기울였을 때 pitch가 +가 아니면 `config.h`의 `IMU_PITCH_SIGN`을 −1로.
   - 팔 기본 각도: 90°가 팔을 내린 자세가 아니면 `ARM_REST_L/R` 조정.
   - 매트릭스 방향: 왼쪽 위 점이 다른 곳에 켜지면 `MTX_FLIP_X/Y`.
   - 넘어짐 감지 시간, 걷는 진동으로 75° 오감지가 없는지.
   - 전원: 서보 6개를 동시에 움직일 때 리셋(부팅음 반복)이 나는지.
4. **초음파 센서 점검.** Vcc/Gnd 방향 확인 또는 센서 교체. 응답하면 부팅 때 자동으로 장애물 회피가 켜진다(코드 수정 불필요).
5. 시험 결과에 따라 `config.h` 상수를 조정하고 다시 업로드.

---

## 7. 사용자 결정이 필요한 항목 (현재 기본값으로 동작 중)

| 항목 | 현재 동작 | 바꾸려면 |
|------|-----------|----------|
| 터치 정지 확인음 | 1500Hz 80ms 짧은 삑 | `TOUCH_BEEP_HZ/MS` 또는 해당 코드 한 줄 제거 |
| 정지 상태의 다리 서보 | 전원 해제(Otto 라이브러리 기본), 팔만 각도 유지 | motion 모듈 수정 |
| Flash 여유 | 약 0.7KB 남음 | 기능 추가 시 부족하면 스크롤 텍스트(약 1KB) 또는 부팅 진단 문구 제거 검토 |
| 소리 반응 | 임계값 70, 기본 꺼짐 | `SOUND_THRESHOLD`, 웹 자동 반응 설정 |

---

## 8. 알려진 제약

- Otto 동작 함수는 한 주기(최대 3초) 동안 블로킹된다. 그 사이 STOP·센서 반응은 주기가 끝난 뒤 처리된다. 한 주기 안에 눌렀다 뗀 짧은 터치는 놓칠 수 있다.
- 걷는 중 넘어짐 감지는 최대 2주기(period × 2) 걸린다.
- watchdog의 실제 정지 지연은 최대 period + 1.5초.
- iPhone(Safari)은 Web Bluetooth를 지원하지 않는다.
- USB 경로는 드라이버 문제로 디버그 용도로만 쓴다.

---

## 9. 이후 작업 방법 (Claude Code 하네스)

이 프로젝트에는 개발 하네스가 구성돼 있다. Claude Code에서 다음처럼 요청하면 된다.

| 요청 예 | 동작 |
|---------|------|
| "웹에서 기울기 표시를 더 크게 해줘" | 웹 엔지니어만 실행 → 웹 QA |
| "펌웨어 넘어짐 각도 바꿔줘" | 펌웨어 엔지니어만 실행 → 펌웨어 QA |
| "명령을 하나 추가해줘" | 설계자가 protocol.json 수정 → 펌웨어·웹 동시 수정 → 통합 QA |
| "QA 다시 해줘" | 통합 QA만 실행 |
| "하네스 회고해줘" | 실행 결과를 반영해 하네스 개선 (`harness:evolve`) |

| 구성원 | 역할 | 모델 |
|--------|------|------|
| otto-protocol-architect | 통신 규약·동작 명세 | opus |
| otto-firmware-engineer | 펌웨어 | opus |
| otto-web-engineer | 웹 컨트롤러 | opus |
| otto-integration-qa | 통합 검증(코드 수정 안 함) | sonnet |

스킬: `otto-orchestrator`(조율), `otto-hardware`(하드웨어 사실·진단 결과), `otto-protocol`(규약·생성·계약 검사), `otto-firmware`, `otto-web`, `otto-qa`. 변경 이력은 `CLAUDE.md`.

---

## 10. 작업 기록 (세션별)

| 날짜 | 작업 | 결과 |
|------|------|------|
| 2026-11-24 | 업로드 후 재점검: 생성물 일치, 계약 검사, protocol.js 시험, USB 부팅·PING 확인 | 모두 정상. 생성물 일치, 계약 오류 0·경고 0, protocol.js 224/0. 부팅 `# Otto fat fw 1 proto 1 \| IMU ok(0x68) \| US none \| touch 0 \| auto 5`, PING `a 80 / i 1 1 1 5 / c -10 0 0 0 / d 80`. 이번에는 터치 이벤트가 따로 들어오지 않았다(지난번 `v 1 1`은 실제로 만진 것이었을 가능성이 높다. 6번 시험에서 다시 확인). 하드웨어 시험 1·2번 통과, 3번부터 사람이 로봇 앞에서 진행해야 함 |
| 2026-11-24 | 시험 4번 중 발견: 왼팔은 각도↑=들기, 오른팔은 각도↑=내리기. `config.h`에 `ARM_DIR_L 1`, `ARM_DIR_R -1` 추가, `motion.cpp`의 `armsWrite()`가 반전값(180−각도)을 서보에 씀. 90°(기본 자세)는 그대로. 프로토콜·웹 변경 없음 | 컴파일 성공(Flash 30,596B 94%, RAM 62%, 경고 0), 계약 오류 0. **업로드 실패: COM10 사용 중(웹 USB 연결 등)** → 포트 해제 후 업로드 필요. 업로드 뒤 두 팔 모두 각도↑ = 손 들기인지 확인 |
| 2026-11-24 | 시험 7번 중 발견: 좌우로 기울이면 pitch가 변함(센서 축 90° 회전 장착). `config.h` `IMU_PITCH_AXIS 1`(ay), `IMU_ROLL_AXIS 0`(ax)로 교체. 기존 0점 보정 −6°는 ax축 값이라 `IMU_ROLL_OFFSET -6`, `IMU_PITCH_OFFSET 0`으로 옮김 | 컴파일 성공(Flash 30,596B 94%, 경고 0). **업로드 실패(COM10 사용 중), 팔 수정과 함께 업로드 대기.** 업로드 뒤 확인: 바로 선 상태 pitch·roll ±3°, 앞으로 기울이면 pitch +(아니면 `IMU_PITCH_SIGN -1`), 오른쪽으로 기울일 때 roll 부호 |
| 2026-11-24 | 요청: 동작 중 처음 자세로 돌아가는 버튼. 기존 ● 홈 버튼은 동작 중 꺼져 있었음. `web/js/app.js`: 홈 버튼을 동작 중에도 켜 두고, 동작 중이면 STOP(펌웨어가 다리 홈·팔 90°)을, 대기 중이면 MOVE 0을 보냄. 넘어짐·장애물 후퇴 중에는 꺼짐. `web/index.html` 정지 버튼 부제를 "처음 자세로 · 스페이스바"로 | node 문법 검사 통과, protocol.js 224/0, 계약 오류 0. 프로토콜·펌웨어 변경 없음. 브라우저 새로고침(Ctrl+F5)으로 적용 |
| 2026-11-24 | 블루투스 배선을 `ref/블루투스 회로도.jpg` 기준으로 변경: 모듈 TX→D10(Arduino RX), 모듈 RX→D11(Arduino TX). 회로도의 Key→D9는 초음파 ECHO와 겹쳐 **연결하지 않음**(AT 모드 전용). `config.h` `PIN_BT_RX 10`, `PIN_BT_TX 11`. 웹 무응답 안내 문구, protocol.md·behavior.md·하드웨어/펌웨어 스킬·pinmap 갱신. `tools/pin_check`는 이전 배선(D11/D12) 기준 그대로 | 컴파일 성공(Flash 30,596B 94%, RAM 62%), 계약 오류 0. **업로드 완료**(팔 방향·기울기 축·BT 핀 모두 포함, `_workspace/upload_fw5.log`). USB 부팅 `IMU ok \| US none \| touch 0 \| auto 5`, PING 정상. 실제 BLE 송수신·팔 방향·기울기 부호는 실물 확인 대기 |
| 2026-11-24 | 사용자가 실물 배선 재확인: 모듈 TX→**D11**(Arduino RX), 모듈 RX→**D12**(Arduino TX). 바로 앞의 D10/D11 변경을 되돌림(`PIN_BT_RX 11`, `PIN_BT_TX 12`), 웹 안내 문구·문서·스킬도 원복. 하드웨어 스킬에 'ref/블루투스 회로도.jpg는 일반 HC-05 예제라 이 로봇과 다름' 명시 | 컴파일 성공(Flash 94%, 경고 0), 계약 오류 0, **업로드 완료**(`_workspace/upload_fw6.log`), USB 부팅·PING 정상. 팔 방향·기울기 축 수정은 그대로 포함 |
| 2026-11-24 | **BLE 문제 발견:** 웹에서 otto2 BLE 연결은 되지만 신호(응답)를 받지 못함. 펌웨어 BT 보레이트 9600(bl_motion·HC-08/HM-10 기본값과 같음). 진단 스크립트 `tools/ble_diag/ble_diag.py` 작성(PC에서 bleak로 직접 연결 → ① USB로 보드 리셋 후 부팅 출력이 BLE로 오는지 ② BLE로 `P` 보내 응답 오는지 ③ 서비스·특성 UUID 출력). 첫 실행은 웹이 연결 중이라 otto2가 광고하지 않아 못 찾음 | 다음 줄에서 해결 |
| 2026-11-24 | **BLE 문제 원인 2가지 확인·수정.** ① 광고 이름이 대문자 `OTTO2`라 진단 스크립트가 못 찾았음 → 대소문자 무시. ② 특성: FFE1 = notify 전용, FFE2 = write. **웹이 FFE1에 쓰고 있어 명령이 조용히 버려졌음** → `web/js/ble-transport.js`가 후보 UUID라도 속성(notify/write)을 확인하고 없으면 속성으로 고르게 수정. ③ PC→FFE2 쓰기로 T·L·R·U·C·오류 응답은 모두 정상인데 **PING만 0.1초 뒤 모듈이 연결을 끊음**: 응답 4줄(≈34B)을 연속 송신하면 끊김, 3줄(22B)까지 정상 → 펌웨어 `writeTo()`가 BT로 한 줄 보낸 뒤 `BT_LINE_GAP_MS`(20ms) 쉬도록 수정. ④ 참고: SoftwareSerial 반이중이라 명령 두 줄을 한 번에 보내면 둘째 줄이 깨짐(웹은 ACK 대기·1회 재전송이라 영향 적음) | 컴파일 성공(Flash 30,608B 94%, RAM 62%, 경고 0), 생성물 일치, 계약 오류 0, protocol.js 224/0. **업로드 완료.** PC(bleak)에서 BLE로 PING 2회 연속 `a 80 / i 1 1 1 5 / c -10 0 0 0 / d 80` 정상, 끊김 없음. 시험 중 보낸 트림 미리보기는 저장값(−10)으로 되돌림. **웹 BLE 실물 확인 대기** |
| 2026-11-24 | 웹 BLE 연결 후 **팔이 계속 떨림**. 원인: 팔 서보를 항상 attach해 두어, 텔레메트리(200ms)로 SoftwareSerial이 송수신할 때마다 인터럽트가 막혀 서보 펄스 폭이 흔들림(다리는 Otto 라이브러리가 동작 후 detach하므로 안 떪). `motion_tick()` 추가: 팔 각도를 쓰고 `ARM_DETACH_MS`(500ms) 뒤 detach. 팔을 든 자세는 서보 기어 마찰로만 유지됨 | 컴파일 성공(Flash 30,766B 95%, RAM 62%, 경고 0), **업로드 완료.** 떨림이 멈췄는지, 팔을 든 뒤 처지지 않는지 실물 확인 대기 |
| 2026-11-24 | **로봇 무응답 원인: Flash 30,720B 초과.** 팔 detach를 넣은 30,766B 펌웨어가 부팅 중 멈춤(`# Ott`에서 정지). 기능 없는 패딩으로 30,954B를 만들어도 똑같이 멈추고, 30,626B는 정상 → 크기 한도로 확정. compile.py에 `HARD_FLASH_MAX 30720`, 크기 판정 뒤에만 업로드하도록 변경. bootDiag 문구를 줄이고(`# Otto fat fw 1 \| IMU 0x68 \| US -1`) 팔 detach를 작게 다시 넣음 | Flash 30,588B, 업로드 완료. USB 부팅·PING, BLE PING 정상. 당시 로봇이 누워 있어(pitch −87) FALLEN 상태 — 세우면 회복 |
| 2026-11-24 | **웹: index.html 직접 실행 + USB 정식 지원.** `tools/build_web_bundle.py`가 ES 모듈을 `web/js/bundle.js`(일반 스크립트)로 묶고 index.html이 이를 불러옴. Edge 헤드리스로 file://에서 isSecureContext·Web Bluetooth·Web Serial 사용 가능, 앱 초기화(제스처 버튼 생성) 확인. USB 문구에서 '디버그용' 제거, 포트 열기 후 대기 1.8→3.2초(실측 부팅 3.0초). PC에서 USB PING·명령 응답 정상, FTDI 반복 현상은 이번엔 관찰 안 됨 | 계약 0, protocol.js 224/0, 번들 일치. **실제 브라우저에서 BLE·USB 연결 확인 대기** |
| 2026-11-24 | **BLE로 MATRIX(X)를 보내면 응답 없음 → 연결 끊김.** USB로 Arduino를 보며 진단: X 이후 Arduino에 BLE 바이트가 하나도 안 들어오고 로봇→PC 텔레메트리도 끊김 = 모듈이 연결만 유지한 채 양방향 정지(Arduino 리셋 시 회복). 한 번에 쓰는 길이로 재현: 16B 정상, **17B부터 정지**(내용 무관). 16B 조각으로 나누면 30·34B X도 정상(텔레메트리 동작 중, 조각 간격 0에서도) → `ble-transport.js` `CHUNK` 20→16 | 번들 재생성, protocol.js 224/0, 계약 0. 진단용 펌웨어는 원복·재업로드(30,588B). **웹에서 매트릭스 편집기·긴 명령 확인 대기** |
| 2026-11-24 | **BLE 명령이 가끔 사라짐(MATRIX `e 4`, SING 무응답).** 측정: 텔레메트리 200ms 동작 중 손실 15%, 텔레메트리 끄면 0% → SoftwareSerial 반이중 충돌(건전지 문제 아님, USB 전원 상태에서 측정). 수정 ① 펌웨어 `comms_btRxBusy()`: 덜 받은 BT 줄이 있으면 텔레메트리 미룸 → 6% ② 웹 `_waitQuiet()`: 텔레메트리 직후 조용한 구간에만 송신 → 0/80, 0/100 ③ BLE 텔레메트리 최소 200ms(100ms는 16%) | Flash 30,622B, 업로드 완료. 번들 재생성, protocol.js 224/0, 계약 0. **웹 실사용 확인 대기** |
| 2026-11-24 | 사용자 웹 BLE 확인 "잘 작동". 왼발목 점검: USB로 `G` 시험(RL/RR 60·90·120°) → 양쪽 모두 정상(하드웨어 문제 아님). **두 번째 로봇(BLE 이름 OTTO3, 같은 하드웨어)에 펌웨어 업로드**: 부팅·PING 정상, IMU 정상, 초음파 정상(36cm), 트림 미설정(−1×4) → 사용자가 직접 보정 예정. 웹 안내 문구·`tools/ble_diag/ble_diag.py`가 로봇 이름 인자(기본 otto2)를 받도록 일반화 | Flash 30,622B. bundle --check 일치 |
| 2026-11-26 | 요청: SMARS 제어 웹처럼 하단에 핀 연결 정보. `web/js/ui-pins.js`(PINMAP → 나노 핀헤더 SVG·범례·표) 추가, `index.html` 맨 아래 `#cardPins`, `style.css` 핀 표 스타일, `app.js`에서 `initPins()`. 근거: otto-hardware 핀 표·`config.h` | 번들 재생성·--check 일치, Edge 헤드리스(file://)로 카드 렌더링 확인. 프로토콜·펌웨어 변경 없음 |
| 2026-11-26 | 요청: 터치하면 기쁨 제스처 + HELLO. 펌웨어 `behavior.cpp`: IDLE + AUTO 1에서 터치 확정 시 `commands_greet()`(기쁨 GESTURE 1 → TEXT HELLO, 응답 없음). 움직이는 중 터치는 기존대로 정지. `commands.cpp`를 검증·ACK / `execute(t, port)`로 나눠 인사가 같은 실행 경로를 씀 — 직접 호출은 Flash +250B로 한도 초과. 그래도 46B 넘어 **부팅 진단 줄에서 `\| US` 제거**(초음파 유무는 `v 6`). 웹: `link.js` IDLE 터치 이벤트 뒤 ACK 대기 +6초(텔레메트리 오면 해제), 인사 토스트, 체크박스 '터치 반응', 데모 로봇도 인사 흉내. behavior.md·hardware-test.md·otto-firmware 스킬 갱신 | 컴파일 성공 **Flash 30,706B(한도 30,720B, 여유 14B)**, RAM 63%, 경고 0. protocol.js 224/0, 계약 0, 번들 일치. Node로 데모+link 시험: IDLE 터치 → 인사 5초, 그동안 보낸 MOUTH가 오류 없이 인사 뒤 처리 / 전진 중 터치 → 정지(인사 없음). **업로드·실물 확인 대기** |
| 2026-11-26 | 요청: 동작이 끝나면 발 원위치, 발동작하면서 LED가 흐르게. 인사를 `motion_greet()`로 바꿈: 기쁨 소리 → 글자마다 두 발 ±15° 번갈아(`_moveSingle`, 비블로킹) + 한 글자 흘리기 → `motion_home()`. 기쁨 제스처(OttoHappy)·commands 실행 경로 분리는 되돌림. Flash 초과(30,790B) → 부팅 진단을 `# Otto fat fw 1` 고정 문자열로(−250B). 웹 대기 8초·토스트·데모 6.5초·문서 갱신 | 컴파일 30,538B(여유 182B), **COM10 업로드 완료**, USB 부팅·PING 정상(`i 1 1 3 7`: 초음파도 감지됨). 실물 인사 동작 확인 대기 |
| 2026-11-26 | 사용자: '발 흔들며 HELLO'가 이상함 → 이전처럼 제스처 후 LED, 끝나면 원위치. `commands_greet()`: 기쁨 GESTURE 1 → `face_text(HELLO)` → `motion_rehome()`(라이브러리 rest 상태를 풀고 홈 — '쉬는 중'이면 home()이 건너뛰는 것 방지). `motion_greet`·`GREET_FOOT_DEG` 삭제. 부팅 줄은 `# Otto fat fw 1` 유지 | 컴파일 30,558B(여유 162B), **COM10 업로드 완료**, 부팅·PING 정상. 실물 확인 대기 |

**규칙:** 작업을 마칠 때마다 이 문서의 상태 줄과 작업 기록을 갱신한다.

**규칙:** `protocol.h`와 `web/js/protocol.js`는 직접 고치지 않는다. 명령을 바꿀 때는 `protocol/protocol.json`을 고치고 생성 스크립트를 돌린 뒤 펌웨어와 웹을 **둘 다** 맞춘다.
