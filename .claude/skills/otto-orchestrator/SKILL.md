---
name: otto-orchestrator
description: "Otto DIY 휴머노이드(Fat) 로봇의 펌웨어와 블루투스 웹 컨트롤러 개발 팀(설계자·펌웨어·웹·QA)을 조율한다. '오토 로봇 펌웨어/웹 만들어줘', '로봇 프로그램 개발', '블루투스 컨트롤러 웹페이지', 'LED 매트릭스·터치·초음파·기울기 센서 기능 추가', '명령 추가' 같은 요청에 사용한다. 재실행, 다시 실행, 업데이트, 수정, 보완, '펌웨어만 다시', '웹만 다시', '이전 결과를 바탕으로', 'QA 다시', '결과 개선', '기능 추가' 같은 후속 요청에도 반드시 사용한다. 단순 질문(핀 번호가 뭐야 등)에는 직접 답한다."
---

# Otto 로봇 개발 오케스트레이터

## 실행 모드: 혼합

| 단계 | 실행 모드 | 선택 이유 |
|------|----------|-----------|
| 0~1 기존 작업 확인·요구사항 | 리더(메인) 직접 | 사용자와 대화하며 범위를 확정해야 한다 |
| 2 프로토콜 설계 | 지속형 에이전트 `arch` | 구현 중 변경 요청이 오면 같은 설계자가 맥락을 유지한 채 판정해야 한다 |
| 3 구현 | 지속형 에이전트 `fw`, `web` 병렬 | QA 피드백을 여러 번 주고받으며 자기 코드를 고쳐야 한다 |
| 3·4 검증 | 서브에이전트 `otto-integration-qa` (단발, 이름 없음) | 매번 독립된 눈으로 한 번 검사하고 결과만 받으면 된다 |

Workflow 도구는 쓰지 않는다. 처리 목록이 고정된 대량 작업이 없고, 핵심은 에이전트 간 반복 피드백이다.

## 에이전트 구성

| 이름 | `subagent_type` | 모델 | 역할 | 스킬 | 주요 산출물 |
|------|-----------------|------|------|------|-------------|
| arch | otto-protocol-architect | opus | 프로토콜·동작 명세 | otto-protocol, otto-hardware | `protocol/protocol.json`, `docs/protocol.md`, `docs/behavior.md` |
| fw | otto-firmware-engineer | opus | 펌웨어 | otto-firmware, otto-hardware, otto-protocol | `firmware/otto_fat/` |
| web | otto-web-engineer | opus | 웹 컨트롤러 | otto-web, otto-protocol, otto-hardware | `web/` |
| (단발) | otto-integration-qa | sonnet | 통합 검증 | otto-qa | `_workspace/*_qa_report.md`, `docs/hardware-test.md` |

## 최종 산출물 위치

```
protocol/protocol.json          단일 기준
docs/protocol.md, behavior.md, hardware-test.md
firmware/otto_fat/              Arduino 스케치 (protocol.h는 생성물)
web/                            정적 웹앱 (js/protocol.js는 생성물)
_workspace/                     중간 산출물·QA 보고서 (삭제하지 않음)
```

## 작업 절차

### 0단계: 기존 작업 확인

| 상황 | 할 일 |
|------|------|
| `protocol/`, `firmware/`, `web/` 모두 없음 | 처음부터 1단계 |
| 있음 + "웹만/펌웨어만 고쳐줘" | 해당 엔지니어만 실행(3단계) → 해당 범위 QA(4단계). 프로토콜은 동결 상태 유지 |
| 있음 + 명령·센서 기능 추가 | 2단계(arch가 기존 protocol.json 수정)부터. 기존 코드는 유지하고 변경분만 |
| 있음 + "QA 다시" | 4단계만 |
| 있음 + 요구사항 전면 변경 | `_workspace/`를 `_workspace_{YYYYMMDD_HHMM}/`로 옮기고 1단계부터. 기존 코드는 git이 없으므로 덮어쓰기 전에 사용자에게 확인 |

부분 재실행 시 에이전트 프롬프트에 기존 산출물 경로와 "지시된 부분만 수정" 원칙을 넣는다.

### 1단계: 요구사항 확정 (리더 직접)

1. `_workspace/00_input/requirements.md`를 만든다. 포함할 것:
   - 하드웨어: `otto-hardware` 스킬의 핀 표. 사용자 확인 사항 — 블루투스 **BLE 모듈 `otto2`**(→ Web Bluetooth, 실측 확인), 기울기 센서 **MPU6050(GY-521)**, 업로드 포트 COM10, 다리 트림 EEPROM 저장 완료, 초음파 불량(점검 대기). 상세는 `otto-hardware`의 「실물 진단 결과」.
   - 기능: 이동·동작, 제스처·노래, LED 매트릭스(입모양+8x8), 팔 서보, 터치 정지, 초음파 장애물 후퇴, 넘어짐 감지, (선택) 소리 반응, 텔레메트리, 트림 보정, 데모 모드.
   - 사용자가 이번에 추가로 말한 요구.
2. 모호한 점이 결과를 크게 바꾸면 사용자에게 묻는다. 기본값으로 충분하면 가정으로 적고 진행한다.

### 2단계: 프로토콜 설계

**실행 모드:** 지속형 에이전트

1. `Agent(name: "arch", subagent_type: "otto-protocol-architect", prompt: "요구사항 _workspace/00_input/requirements.md를 읽고 otto-protocol 스킬 절차대로 protocol/protocol.json, 생성물, docs/protocol.md, docs/behavior.md, _workspace/01_architect_summary.md를 만들어라. 완료 후 check는 gen_protocol.py --check로 확인하고 보고하라.")`
2. 완료 보고를 받으면 리더가 `_workspace/01_architect_summary.md`를 읽고 요구사항 누락이 없는지 확인한다.
3. **동결**: `sha256sum protocol/protocol.json firmware/otto_fat/protocol.h web/js/protocol.js > _workspace/freeze_protocol.sha`
   arch에게 "프로토콜을 동결한다. 이후 변경은 리더의 요청이 있을 때만 하라"고 알린다.

### 3단계: 구현

**실행 모드:** 지속형 에이전트 2명 병렬 + 모듈별 단발 QA

1. 한 메시지에서 두 에이전트를 실행한다.
   - `Agent(name: "fw", subagent_type: "otto-firmware-engineer", prompt: "docs/protocol.md, docs/behavior.md, firmware/otto_fat/protocol.h를 기준으로 otto-firmware 스킬대로 firmware/otto_fat을 구현하라. 모듈(comms → sensors → motion/face → behavior)을 하나 끝낼 때마다 컴파일하고 결과와 함께 보고하라. 프로토콜 변경이 필요하면 직접 고치지 말고 리더에게 요청하라.")`
   - `Agent(name: "web", subagent_type: "otto-web-engineer", prompt: "docs/protocol.md와 web/js/protocol.js를 기준으로 otto-web 스킬대로 web/을 구현하라. transport+demo-robot → 이동·STOP → 센서·이벤트 → 표현·매트릭스 → 보정 순으로 만들고, 단계마다 node --check와 protocol.js 시험을 돌려 보고하라. 프로토콜 변경이 필요하면 리더에게 요청하라.")`
2. 작업 목록을 등록한다(도구가 없으면 리더가 진행 상황을 직접 추적):
   - fw: comms / sensors / motion+face / behavior / 노트 작성
   - web: transport+demo / 이동·STOP / 센서·이벤트 / 표현·매트릭스 / 보정·노트
3. **모듈 완료 보고마다 단발 QA**: `Agent(subagent_type: "otto-integration-qa", prompt: "범위: firmware(또는 web), 단계 3, 방금 완료된 모듈: {모듈}. otto-qa 자동 검사를 돌리고 해당 모듈 관련 체크리스트를 확인해 _workspace/03_qa_report_{fw|web}_{n}.md로 보고하라. 계약 검사의 '처리 코드 없음' 오류는 아직 구현 안 된 모듈 것이면 '미구현'으로만 분류하라.")`
   - 치명·주요 결함은 SendMessage로 해당 엔지니어에게 보고서 경로와 결함 제목을 전달한다. 엔지니어는 대화 맥락이 있으므로 "방금 만든 comms의 2번 결함만" 식으로 좁혀 지시한다.
4. **프로토콜 변경 요청 처리**: fw/web이 요청하면 리더가 arch에게 SendMessage로 중계 → arch가 판정·반영 → 리더가 동결 해시를 다시 만들고, 변경 내용을 fw와 web **양쪽**에 SendMessage로 알린다. 한쪽에만 알리면 계약이 깨진다.

### 4단계: 통합 검증

**실행 모드:** 서브에이전트 (단발)

1. fw, web이 모두 완료를 보고하면 `sha256sum -c _workspace/freeze_protocol.sha`로 프로토콜이 몰래 바뀌지 않았는지 확인한다. 다르면 누가 왜 바꿨는지 확인한 뒤 진행한다.
2. `Agent(subagent_type: "otto-integration-qa", prompt: "범위: 통합, 단계 4, 라운드 {k}. otto-qa 스킬 전체(자동 검사 + 경계 대조 체크리스트)를 수행하고 _workspace/04_qa_report_r{k}.md를 써라. 이전 라운드 보고서가 있으면 해결 여부를 표시하라. PASS면 docs/hardware-test.md도 작성하라.")`
3. FAIL이면 결함을 담당별로 나눠 fw/web(프로토콜 문제는 arch)에게 SendMessage로 전달 → 수정 완료 보고 → 라운드 k+1. **최대 3라운드.** 3라운드 후에도 FAIL이면 남은 결함 목록과 함께 사용자에게 보고하고 계속할지 묻는다.

### 5단계: 마무리 (리더 직접)

1. 사용자에게 보고: 무엇을 만들었는지, 실행 방법(업로드 명령, `python -m http.server 8000 -d web`), 데모 모드, 하드웨어 확인이 필요한 항목(`docs/hardware-test.md`), 남은 경고.
2. 업로드는 사용자가 원할 때만. 포트(COMx)를 확인받고 fw에게 `compile.py --upload --port COMx`를 지시하거나 리더가 직접 실행한다.
3. `_workspace/`는 남긴다. 에이전트는 작업이 끝나면 자동 종료되며, 필요하면 TaskStop으로 중지한다.

## 데이터 전달 요약

| 경로 | 방법 |
|------|------|
| 리더 → arch | `_workspace/00_input/requirements.md` + 프롬프트 |
| arch → fw, web | `protocol/protocol.json` 생성물, `docs/protocol.md`, `docs/behavior.md` (동결 해시로 보호) |
| fw/web → QA | 코드 파일 자체 + `_workspace/03_*_notes.md` |
| QA → 리더 | 반환 메시지(판정·결함 제목) + `_workspace/*_qa_report*.md` |
| 리더 → fw/web/arch | SendMessage(보고서 경로 + 결함 제목) |
| fw/web → arch | 직접 보내지 않고 리더가 중계 (변경 사실을 양쪽에 알리는 책임을 한 곳에 둔다) |

## 오류 처리

| 상황 | 대응 |
|------|------|
| 지속형 에이전트 무응답 | SendMessage로 상태 확인 후 재지시. 그래도 실패하면 같은 유형을 새 이름(`fw2`)으로 실행하고 기존 코드·노트·QA 보고서 경로를 넘긴다 |
| 사용량 한도·인증 만료·권한 거부 | 재시도하지 않는다. 산출물을 직접 열어 어디까지 됐는지 확인하고 `_workspace/incomplete.md`에 기록, 사용자에게 보고(한도면 풀리는 시각 포함). 에이전트의 판단을 추측해 채우지 않는다 |
| QA 에이전트 실패 | 1회 재시도. 다시 실패하면 리더가 자동 검사 스크립트 4개만 직접 돌려 결과를 보고하고, 체크리스트 대조는 미수행으로 명시 |
| 컴파일 반복 실패(같은 오류 3회) | fw 보고를 받아 리더가 오류 원문을 보고 방향을 정하거나 사용자에게 알린다 |
| arduino-cli/라이브러리 없음 | 설치하지 않고 사용자에게 알린다(환경 변경) |
| 동결 해시 불일치 | 변경 주체·이유 확인 → arch 승인 없는 변경이면 되돌리게 하고, 정당하면 양쪽에 공지 후 해시 갱신 |
| 펌웨어와 웹의 해석 충돌 | 지우지 말고 양쪽 근거를 적어 arch에게 판정 요청 |

## 테스트 시나리오

### 정상 흐름
1. 사용자: "오토 로봇 펌웨어랑 웹 만들어줘" → 0단계: 산출물 없음 → 1단계 requirements.md 작성.
2. 2단계 arch가 기준안을 바탕으로 protocol.json(명령 14개, 메시지 6개) 확정, 동결.
3. 3단계 fw·web 병렬 구현, 모듈마다 단발 QA 총 8~10회, 결함은 해당 엔지니어에게만 전달.
4. 4단계 통합 QA 라운드 1 FAIL(예: 웹 ACK 타임아웃 < 펌웨어 블로킹) → web 수정 → 라운드 2 PASS, docs/hardware-test.md 생성.
5. 결과: `firmware/otto_fat` 컴파일 통과(RAM ≤ 75%), 계약 오류 0, protocol.js 시험 통과, 사용자 보고.

### 오류 흐름 — 구현 중 프로토콜 변경
1. web이 "팔 동작 프리셋 명령이 필요하다"고 요청 → 리더가 arch에 중계.
2. arch가 `ARMPOSE` 추가 판정·반영, version 유지(하위 호환 추가) → 리더가 해시 갱신 후 fw·web 양쪽에 공지.
3. fw가 처리를 늦게 구현해 계약 검사 "[펌웨어] 명령 ARMPOSE 처리 코드 없음" → QA가 담당 firmware 치명으로 보고 → fw 수정 → 재검사 통과.

### 오류 흐름 — 부분 재실행
1. 사용자: "웹 화면에서 기울기 표시를 더 크게 해줘" → 0단계: 산출물 있음, 웹만.
2. web만 실행(기존 코드 수정 지시) → QA 범위 web → 사용자 보고. arch·fw는 실행하지 않는다.
