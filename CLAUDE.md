# ottobot

Otto DIY 휴머노이드(Fat 버전) 로봇 — Arduino Nano 펌웨어 + HC-05 블루투스 웹 컨트롤러. 참고 자료는 `ref/`.

## 하네스: Otto 로봇 펌웨어·웹 개발

**목표:** LED 매트릭스·터치·초음파·MPU6050 기울기·블루투스로 동작하는 Otto 펌웨어와 웹 컨트롤러를 하나의 프로토콜 계약 아래에서 개발·검증한다.

**호출 조건:** 펌웨어, 웹 컨트롤러, 통신 프로토콜, 센서·동작 기능 추가·수정, QA 관련 작업을 요청받으면 `otto-orchestrator` 스킬을 사용한다. 핀 번호 확인 같은 단순 질문에는 직접 답해도 된다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
| --- | --- | --- | --- |
| 2026-11-23 | Harness v2로 처음 구성 | 전체 | - |
| 2026-11-24 | 실물 진단 반영: 블루투스 HC-05→BLE(otto2, Web Bluetooth), 서보·팔 좌우·매트릭스 방향 확정, D2 트림 −10 EEPROM 저장, 초음파 불량, USB(FTDI) 중복 데이터 대응 | otto-hardware, otto-web, otto-firmware, otto-qa, otto-orchestrator, 에이전트 2종 | 핀 진단(tools/pin_check) 결과 |
| 2026-11-24 | 첫 실행 반영: otto-lib-api에 프로토콜 번호↔라이브러리 상수 변환표, QA 체크리스트에 id 변환 항목, 빌드 기본 FQBN uno(Optiboot)+Flash 한도 97% | otto-hardware, otto-qa, otto-firmware(compile.py) | 제스처·노래 번호 오매핑 결함, Nano 정의 Flash 98% |
| 2026-11-24 | BLE 실측(OTTO2 대문자, FFE1 notify·FFE2 write, 연속 송신 시 끊김→줄 간격 20ms, SoftwareSerial 반이중), Flash 실측 한도 30,720B를 compile.py가 업로드 전에 강제, 웹 번들(file:// 실행) | otto-hardware, otto-firmware(compile.py) | BLE 무응답·부팅 멈춤 진단 |
| 2026-11-26 | 웹에 3D 형상 카드(ui-twin.js, three.js 로컬 묶음 web/vendor)와 카드 블록 배치(layout.js) 추가 | otto-web | 사용자 요청(통합 허브 세션) |
