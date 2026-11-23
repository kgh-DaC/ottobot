# 설계자 요약 — protocol version 1 (2026-11-24)

## 산출물
- protocol/protocol.json (기준)
- firmware/otto_fat/protocol.h, web/js/protocol.js (gen_protocol.py 생성물)
- docs/protocol.md (명령·메시지·코드 표, 예시 대화, 대역 계산, 변경 이력)
- docs/behavior.md (상태 머신, 우선순위, 타이밍, 센서 부재, ACK/DONE, 응답 경로, 가정)

## 규모
명령 14개, 메시지 7개, 오류 6, 이벤트 6, 상태 5. 형식 규칙(1글자 토큰, 정수, max_line 48)은 그대로.

## 기준안 대비 변경점
1. TEXT maxlen 20 → 9: Otto writeText()가 9자까지만 표시.
2. TRIM에 save 인자(0~1, 기본 1): EEPROM 쓰기 없는 미리보기. 생략 시 기준안과 같음. 최악 20B = BLE 1패킷.
3. 메시지 TRIMS `c yl yr rl rr` 추가: PING·TRIM 응답에 포함. 웹이 YL −10을 모른 채 덮어쓰는 사고 방지.
4. INFO에 auto 필드 추가 (`i proto fw_build sensors auto`): 센서 부재로 빠진 AUTO 비트와 재연결 시 토글 동기화. AUTO 응답에도 INFO 재전송.
5. 규칙 명확화(형식 변경 없음): ACK 받은 명령은 DONE 정확히 1회, ERR = 거부(ACK·DONE 없음), 모든 명령이 DONE을 보냄, MOVING 중 텔레메트리 ≥500ms, TONE 비블로킹.
토큰·인자 순서 변경 없음 → 배포 전이므로 version 1 유지.

## 핵심 결정 (behavior.md)
- 우선순위: 넘어짐 > 터치 > 장애물 > 명령. STOP은 FALLEN을 풀지 않음.
- FALLEN 중 서보 명령(M H G A C) → e 6, AVOID 중 동작 명령(M H K W G A C) → e 3.
- 연속 MOVE 교체 시 d 77 없음, 실제로 멈출 때 1회. 1회성 명령이 MOVE를 끝냄: a xx → d 77 → d xx.
- 응답은 명령이 온 포트로, 텔레메트리·이벤트는 활성 포트(마지막 유효 줄을 받은 포트, 기본 BT)로, 부팅 메시지는 두 포트로.
- 센서 부재: 초음파 없음 → dist 0, AUTO 2 제외, 측정 안 함. MPU 없음/실행 중 실패 → pitch·roll 0, AUTO 4 제외, e 5 0.
- 부팅 기본: AUTO = 7 & 가용 센서(현재 실물 예상 sensors=1, auto=5), TELEM = 0.
- 대역: 텔레메트리 최악 24B × 10Hz = 25% (< 30%). 웹 권장 250ms.

## 가정 (하드웨어 시험 때 확인)
IMU pitch 부호, 팔 기본 90°, 소리 임계값 70·쿨다운 2s, 장애물 후퇴 = 뒤로 2걸음, 전진 계열 id 1/9/12, 넘어짐 입모양 26, SERVO 보간 300ms, 초음파 재감지는 재부팅 때만, BLE UUID FFE0/FFE1.

## 위험
- 통신 끊김: 리더 결정으로 v1에 MOVE watchdog 추가(형식 변경 없음, behavior.md 6절). MOVING 중 1500ms 넘게 올바른 줄이 없으면 STOP처럼 처리(홈, d 77, IDLE). 남은 위험: 실효 정지 지연 ≤ period + 1500ms(최악 4.5초).
- keepalive와 64B 수신 버퍼: period 3000에서 500ms keepalive면 주기당 78B로 버퍼가 넘쳐 STOP이 잘릴 수 있음 → 웹 keepalive 간격 = max(500, ceil(period/3))ms로 명시.

## 펌웨어/웹에 특히 전할 것
- 펌웨어: TRIMS 메시지 송신(PING·TRIM), INFO 4필드, TEXT 9자·대문자 변환, TRIM save 인자, `case CMD_xxx:` 사용(글자 직접 금지).
- 펌웨어(추가): MOVE_WATCHDOG_MS 1500, 주기 종료 후 판정, 같은 MOVE 재수신은 a 77만·주기 유지.
- 웹(추가): MOVE 유지 중 keepalive 재전송(500ms, period>1500이면 ceil(period/3)), STOP 시 중단, 요청 안 한 d 77 = 감시 정지.
- 웹: BLE 20B 분할 송신(MATRIX 34B는 2패킷), TRIMS로 보정 화면 초기화, INFO.auto로 토글 동기화, MOVE는 keydown 1회·keyup STOP, 블로킹 명령 DONE 전 STOP 외 송신 금지.

## 갱신 (펌웨어 QA 4차 반영, 형식 변경 없음)
- 넘어짐: 정지 상태는 필터 + 60°/300ms, MOVING·AVOID는 주기 끝 원시 샘플 60° 2회 연속 또는 75° 1회 → 즉시 FALLEN(최악 ≈ period × 2).
- 터치: 첫 HIGH에서 10ms × 3 재샘플로 확정. 한 주기 안의 짧은 터치는 놓칠 수 있음(물리적 한계).
- 터치 정지 확인음 1500Hz 80ms 비블로킹.
- loop 순서: 수신(STOP 즉시) → 센서 갱신 → 안전 판정 → 명령 실행 → motion.
- PING(첫 연결 포함)은 얼굴을 바꾸지 않음.

## 갱신 (통합 QA r1 반영, 형식 변경 없음)
- 자동 정지(터치 정지, 장애물 후퇴 종료, watchdog 정지) 직후 MOVE_LOCKOUT_MS 1000ms 동안 MOVE → e 3 77. 시간 만료로만 해제. STOP·비이동 명령 정상.
- 웹: TOUCH 이벤트·요청하지 않은 d 77 수신 시 hold·keepalive 중단, 잠금 중 e 3 77 무시.
