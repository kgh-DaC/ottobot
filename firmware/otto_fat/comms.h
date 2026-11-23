// comms.h - 줄 수신(BT + USB), 파싱, 응답 송신
#pragma once
#include <Arduino.h>
#include "protocol.h"

// 포트는 비트마스크로 다룬다
#define PORT_BT   1
#define PORT_USB  2
#define PORT_BOTH 3

// 파싱 결과 (commands.cpp가 읽음)
extern int16_t g_args[PROTO_MAX_ARGS];
extern uint8_t g_argc;
extern const char* g_strArg;     // TEXT 문자열 인자 (줄 버퍼 안을 가리킴)
extern uint8_t g_replyPort;      // 지금 처리 중인 줄이 들어온 포트
extern uint8_t g_activePort;     // 텔레메트리·이벤트 대상 (마지막 올바른 줄)
extern unsigned long g_lastValidRx; // 마지막 올바른 줄(ACK) 수신 시각 - MOVE watchdog

typedef void (*LineHandler)(char* line);

void comms_begin();
void comms_poll(LineHandler h);   // 쌓인 바이트를 모두 읽고 완성된 줄마다 h 호출

// 인자 파싱: line[0] 뒤의 공백 구분 정수. 성공 시 true. strMode면 나머지를 문자열로.
bool comms_parseArgs(char* line, bool strMode);

// 송신
void comms_send(uint8_t dest, char tok, const int16_t* v, uint8_t n);
void comms_ack(char cmd);                   // 응답 포트, 수신 시각 갱신
void comms_done(char cmd, uint8_t dest);
void comms_err(uint8_t code, int16_t cmd);  // 응답 포트
void comms_errTo(uint8_t dest, uint8_t code, int16_t cmd);
void comms_event(uint8_t kind, int16_t value); // 활성 포트
void comms_debug(const __FlashStringHelper* s); // USB 전용, '#' 시작 줄 일부
Print& comms_usb();
