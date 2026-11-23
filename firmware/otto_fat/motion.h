// motion.h - Otto 라이브러리 래핑, 연속 MOVE 한 주기 실행, 팔 서보
#pragma once
#include <Arduino.h>
#include <Otto.h>

extern class Otto Otto;   // face.cpp도 이 객체로 매트릭스를 쓴다

void motion_begin();                 // Otto.init(트림 로드), 팔 attach, 홈
void motion_setMove(uint8_t id, int16_t period, int16_t size); // 다음 주기부터 적용
uint8_t motion_moveId();
void motion_cycle();                 // 현재 MOVE 1주기 (블로킹)
void motion_runOnce(uint8_t id, int16_t period, int16_t size); // 임의 id 1주기
void motion_home();                  // 다리 홈 + 팔 기본 각도
void motion_arms(int16_t l, int16_t r);
void motion_servos(const int16_t* t);   // 다리 4개 논리 각도, SERVO_MOVE_MS 보간
void motion_setTrims(const int16_t* t, bool save); // 적용 후 홈
const int16_t* motion_trims();
void motion_gesture(uint8_t id);   // 프로토콜 id 1~13
void motion_sing(uint8_t id);      // 프로토콜 id 1~19 (표로 변환)
void motion_singLib(uint8_t libSong); // 라이브러리 상수 S_* 직접 (내부 신호음)
void motion_backStep();
void motion_detachAll();
void motion_attachAll();             // attach + 홈 (회복)
bool motion_isForward(uint8_t id);   // 장애물 후퇴 대상(전진 계열)
void motion_markEnd();               // 부저 등 동작 외 소리 종료 시각 기록
unsigned long motion_lastEnd();      // 마지막 서보 동작 종료 시각 (소리 쿨다운)
