// commands.h - 명령 검증 → ACK → 실행 → DONE (switch(CMD_*))
#pragma once
#include <Arduino.h>

void commands_handle(char* line);   // comms_poll 핸들러
void commands_tick();
void commands_greet();              // 터치 인사: 기쁨 제스처 + HELLO (응답 없음, 블로킹)               // 비블로킹 TONE 종료 확인
