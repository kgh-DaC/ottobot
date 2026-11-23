// behavior.h - 상태 머신, 자동 반응(넘어짐 > 터치 > 장애물), MOVE watchdog, 텔레메트리
#pragma once
#include <Arduino.h>

extern uint8_t g_state;     // ST_* (protocol.h)
extern uint8_t g_movePort;  // 진행 중 MOVE의 응답 포트 (d 77 대상)

void behavior_begin();               // AUTO 기본값 적용
void behavior_bootReport();          // 두 포트로 i, v 6
void behavior_safety();              // 넘어짐·터치·장애물·소리·IMU 실패 (명령보다 우선)
void behavior_motion();              // watchdog 판정 → MOVE 1주기 또는 AVOID 1걸음
void behavior_telemetry();

uint8_t behavior_auto();
uint8_t behavior_setAuto(uint8_t mask);   // 가용 센서로 걸러 적용, FALLEN 해제 처리 포함
void behavior_setTelem(int16_t ms);
void behavior_sendInfo(uint8_t dest);
bool behavior_moveLocked();          // 자동 정지 직후 MOVE 잠금 중인가 (millis 경과로만 해제)
void behavior_endMove();             // MOVING이면 d 77 + IDLE (홈은 하지 않음)
