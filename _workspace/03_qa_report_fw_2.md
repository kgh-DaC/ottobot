# QA 보고 — 2026-11-24 firmware 단계 3 (sensors 모듈)

참고: 이전 보고서 03_qa_report_fw_1.md는 존재함(참고만, 이번에 재판정하지 않음). 지정된 `_workspace/qa_compile_fw2.log`는 검사 시작 시 없었고, 이번 실행에서 생성함.

## 자동 검사
| 검사 | 결과 | 요약 |
|---|---|---|
| gen_protocol --check | 통과 | protocol.h, protocol.js 일치 |
| check_contract | 오류 31 / 경고 27 | 전부 "처리/송신 코드 없음" 또는 "미사용" 유형. motion/face/behavior/comms 명령 처리와 web 미구현 때문이며 **미구현**으로 분류. sensors 관련 계약 오류는 없음 |
| test_protocol_js | 통과 224 / 실패 0 | |
| compile.py (log: _workspace/qa_compile_fw2.log) | 성공, 경고 0 | Flash 16572 B (53%), RAM 1149 B (56%), 남은 899 B |
| node --check web/js/*.js | 오류 출력 없음 | |

## 센서 체크리스트 대조
| 항목 | 판정 | 근거 |
|---|---|---|
| Wire.setWireTimeout | OK | sensors.cpp:69 `Wire.setWireTimeout(3000, true)`, 100kHz(68) |
| IMU 실패 시 비정지 | OK | begin: WHO_AM_I 실패면 SENS_IMU 미설정(70-74). 실행 중: 3회 연속 실패에서 비트 해제, pitch/roll=0, `imuFailedEdge` 1회(91-98). 실패 호출당 최대 3ms |
| pulseIn ≤ 25ms | OK | `US_TIMEOUT_US 25000UL`(config.h:41), sensors.cpp:49 |
| 초음파 부재 시 미측정 | OK | 측정은 `s_present & SENS_US`일 때만(128). 부팅 5회×60ms 후 모두 0이면 부재(78-82). `sensors_distance()`도 부재 시 0(147). 현재 실물(응답 없음)은 부팅 약 0.4초 뒤 sensors=1이 되며 런타임 블로킹은 없음 |
| 초음파 60ms, 3회 중앙값, /58 | OK | median3 로직 검증함(55-59). 정상 |
| 터치 디바운스 30ms, 눌림 시작 1회 | OK | 120-126, 부팅 시 눌려 있어도 에지를 만들지 않음 |
| IMU 0점 보정 | OK | `IMU_PITCH_OFFSET (-6)`, 실측 ax 1850/ay -290/az 17000으로 raw pitch ≈ +6.2°, 보정 후 ≈ 0. roll offset 0(behavior.md 72행과 일치) |
| 사운드 임계값 | OK(상위 모듈 사용) | `SOUND_THRESHOLD 70`은 behavior.md 80행과 일치. sensors는 원시값만 제공 |
| String 미사용, F() | OK | sensors.cpp에 String과 문자열 상수 없음. 전체 grep에서도 String 사용 없음 |
| 핀 번호 | OK | TRIG 8, ECHO 9, TOUCH A0, SOUND A6, pinmap.md와 일치. D9 Timer1 PWM 상실은 ECHO 입력이라 무관 |
| 임계값(넘어짐 60/300ms, 회복 25/1000ms, 장애물 10/15cm) | config.h 값 일치 | 사용하는 behavior 모듈은 미구현 |

## 결함 (심각도순)
치명·주요: 없음.

### [경미] IMU_PITCH_OFFSET이 SIGN 곱한 뒤에 더해짐
- 위치: sensors.cpp:108-109
- 근거: `atan2(...) * 57.2958f * IMU_PITCH_SIGN + IMU_PITCH_OFFSET`. 하드웨어 시험에서 IMU_PITCH_SIGN을 -1로 바꾸면 raw +6.2가 -6.2가 되고 offset -6이 더해져 약 -12°로 0점이 어긋남. ROLL도 같은 구조(현재 offset 0이라 영향 없음).
- 영향: 부호 반전 시 바로 선 상태 pitch가 ±12°로 보이고, 넘어짐 판정 여유가 줄어듦(60° 기준에서 크지는 않음).
- 수정 제안: firmware. `(atan2(...)*57.2958f + 보정전OFFSET) * SIGN` 순서로 하거나, config.h에 "OFFSET은 SIGN 적용 후 값"이라고 명시.

### [경미] 부팅 감지 중 imuReadByte 실패 시 Wire 타임아웃 플래그를 지우지 않음
- 위치: sensors.cpp:37-43, 70
- 근거: imuUpdate는 실패 시 `clearWireTimeoutFlag()`를 호출하지만(92) begin 경로는 호출하지 않음. reset_on_timeout=true라 버스는 복구되므로 동작에는 지장 없음.
- 영향: 사실상 없음(플래그 미참조).
- 수정 제안: firmware, 선택 사항.

## 미구현 (결함 아님)
- 명령 처리(MOVE 등), INFO/TRIMS/TELEMETRY 송신, 자동 반응(넘어짐 > 터치 > 장애물), 서보 detach/attach, 장애물 후퇴 히스테리시스, 이벤트 폭주 방지, 사운드 이벤트: motion/behavior 단계.
- otto_fat.ino는 임시 컴파일 확인용 코드(터치 시 motion_home+face_matrix(g_args)). 최종 loop가 아님.
- web 쪽 계약 오류 전부.
- `sensors_imuFailedEdge`, `sensors_distanceFresh`, `sensors_touchPressedEdge`를 소비해 `e 5 0`, 장애물 판정을 만드는 쪽은 behavior에서 확인해야 함.

## 하드웨어에서만 확인 가능한 항목
- 초음파 부재 시 부팅 약 0.4초 지연 후 INFO sensors=1, auto=5. 센서를 고친 뒤 재부팅하면 sensors=3이 되는지.
- 서보 구동 중 IMU 값 진동(DLPF 44Hz와 0.8/0.2 필터가 충분한지), 서보 전원 노이즈로 I2C 실패(3연속)가 발생해 IMU가 꺼지지 않는지.
- `IMU_PITCH_SIGN`/`IMU_ROLL_SIGN`: 앞으로 기울이면 pitch +, 오른쪽 기울이면 roll 부호. 바로 선 상태 pitch/roll이 ±2° 안인지.
- 터치 눌림 HIGH와 평상시 0, 사운드 배경 51~54 대비 임계값 70.

## 통과 판정: PASS (firmware sensors 모듈 한정, 치명·주요 0건. 전체 계약 검사 오류 31건은 미구현 모듈 때문이라 통합 PASS는 아님)
