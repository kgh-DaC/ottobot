#include "comms.h"
#include "config.h"
#include <SoftwareSerial.h>

static SoftwareSerial BT(PIN_BT_RX, PIN_BT_TX);

int16_t g_args[PROTO_MAX_ARGS];
uint8_t g_argc = 0;
const char* g_strArg = 0;
uint8_t g_replyPort = PORT_BT;
uint8_t g_activePort = PORT_BT;
unsigned long g_lastValidRx = 0;

// 포트별 줄 버퍼 (최대 줄 48B = 내용 47B + '\n')
struct LineBuf {
  char buf[PROTO_MAX_LINE + 1];
  uint8_t len;
  bool overflow;
};
static LineBuf s_lb[2];

void comms_begin() {
  Serial.begin(PROTO_BAUD);
  BT.begin(BT_BAUD);
  s_lb[0].len = s_lb[1].len = 0;
  s_lb[0].overflow = s_lb[1].overflow = false;
}

Print& comms_usb() { return Serial; }

static void feed(uint8_t idx, uint8_t portMask, int c, LineHandler h) {
  LineBuf& lb = s_lb[idx];
  if (c == '\r') return;
  if (c == '\n') {
    if (!lb.overflow) {
      lb.buf[lb.len] = '\0';
      if (lb.len > 0) {           // 빈 줄은 무시
        g_replyPort = portMask;
        h(lb.buf);
      }
    }
    lb.len = 0;
    lb.overflow = false;
    return;
  }
  if (lb.overflow) return;        // 다음 '\n'까지 버림
  if (lb.len >= PROTO_MAX_LINE - 1) {
    lb.overflow = true;
    lb.len = 0;
    comms_errTo(portMask, ERR_LINE_TOO_LONG, 0);
    return;
  }
  lb.buf[lb.len++] = (char)c;
}

void comms_poll(LineHandler h) {
  // 도착해 있는 바이트를 모두 읽는다. 블로킹 명령이 끼어도 끝난 뒤 이어서 읽는다.
  // 재진입 금지: 핸들러 안에서 다시 poll하면 같은 줄 버퍼를 덮어쓴다. loop() 한 지점에서만 부른다.
  static bool s_inPoll = false;
  if (s_inPoll) return;
  s_inPoll = true;
  bool any = true;
  while (any) {
    any = false;
    while (BT.available()) { feed(0, PORT_BT, BT.read(), h); any = true; }
    while (Serial.available()) { feed(1, PORT_USB, Serial.read(), h); any = true; }
  }
  s_inPoll = false;
}

static bool parseInt16(const char* s, uint8_t n, int16_t* out) {
  bool neg = false;
  uint8_t i = 0;
  if (n == 0) return false;
  if (s[0] == '-') { neg = true; i = 1; if (n == 1) return false; }
  long v = 0;
  for (; i < n; i++) {
    char ch = s[i];
    if (ch < '0' || ch > '9') return false;
    v = v * 10 + (ch - '0');
    if (v > 32768L) return false;
  }
  if (neg) v = -v;
  if (v > 32767L || v < -32768L) return false;
  *out = (int16_t)v;
  return true;
}

bool comms_parseArgs(char* line, bool strMode) {
  g_argc = 0;
  g_strArg = 0;
  char* p = line + 1;
  if (*p != '\0' && *p != ' ') return false;  // 토큰 뒤에 바로 글자가 붙음
  if (strMode) {
    if (*p == ' ' && p[1] != '\0') { g_strArg = p + 1; g_argc = 1; }
    return true;
  }
  while (*p) {
    while (*p == ' ') p++;
    if (!*p) break;
    char* st = p;
    while (*p && *p != ' ') p++;
    if (g_argc >= PROTO_MAX_ARGS) return false;
    if (!parseInt16(st, (uint8_t)(p - st), &g_args[g_argc])) return false;
    g_argc++;
  }
  return true;
}

static void writeTo(uint8_t dest, const char* s, uint8_t n) {
  if (dest & PORT_BT) BT.write((const uint8_t*)s, n);
  if (dest & PORT_USB) Serial.write((const uint8_t*)s, n);
}

void comms_send(uint8_t dest, char tok, const int16_t* v, uint8_t n) {
  // 마지막 1바이트는 항상 '\n' 자리로 남긴다 (len <= PROTO_MAX_LINE - 1 유지)
  const uint8_t LIM = PROTO_MAX_LINE - 1;
  char out[PROTO_MAX_LINE];
  uint8_t len = 0;
  out[len++] = tok;
  for (uint8_t i = 0; i < n; i++) {
    char tmp[8];
    itoa(v[i], tmp, 10);
    uint8_t tl = (uint8_t)strlen(tmp);
    if (len + 1 + tl > LIM) break;      // 공백+숫자가 다 들어갈 때만 붙인다
    out[len++] = ' ';
    for (uint8_t k = 0; k < tl; k++) out[len++] = tmp[k];
  }
  out[len++] = '\n';
  writeTo(dest, out, len);
}

void comms_ack(char cmd) {
  int16_t v = (uint8_t)cmd;
  g_lastValidRx = millis();
  g_activePort = g_replyPort;
  comms_send(g_replyPort, MSG_ACK, &v, 1);
}

void comms_done(char cmd, uint8_t dest) {
  int16_t v = (uint8_t)cmd;
  comms_send(dest, MSG_DONE, &v, 1);
}

void comms_errTo(uint8_t dest, uint8_t code, int16_t cmd) {
  int16_t v[2] = { (int16_t)code, cmd };
  comms_send(dest, MSG_ERR, v, 2);
}

void comms_err(uint8_t code, int16_t cmd) { comms_errTo(g_replyPort, code, cmd); }

void comms_event(uint8_t kind, int16_t value) {
  int16_t v[2] = { (int16_t)kind, value };
  comms_send(g_activePort, MSG_EVENT, v, 2);
}

void comms_debug(const __FlashStringHelper* s) { Serial.print(s); }
