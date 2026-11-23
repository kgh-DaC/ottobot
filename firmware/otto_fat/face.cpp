#include "face.h"
#include "config.h"
#include "motion.h"

#define FACE_BITMAP 0xFF
static uint8_t s_faceId = 10;       // 마지막 입모양 id, FACE_BITMAP이면 s_rows
static uint8_t s_rows[8];

static void drawRows() {
  for (uint8_t y = 0; y < 8; y++) {
    uint8_t row = s_rows[y];
    for (uint8_t x = 0; x < 8; x++) {
      uint8_t px = MTX_FLIP_X ? 7 - x : x;
      uint8_t py = MTX_FLIP_Y ? 7 - y : y;
      Otto.setLed(px, py, (row >> (7 - x)) & 1);   // 실물: setLed(0,0)=정면 왼쪽 위
    }
  }
}

void face_begin() {
  Otto.initMATRIX(PIN_MTX_DIN, PIN_MTX_CS, PIN_MTX_CLK, MTX_ORIENTATION);
  Otto.matrixIntensity(MTX_INTENSITY);
}

void face_mouth(uint8_t id) {
  s_faceId = id;
  Otto.putMouth(id);
}

void face_matrix(const int16_t* rows) {
  for (uint8_t i = 0; i < 8; i++) s_rows[i] = (uint8_t)rows[i];
  s_faceId = FACE_BITMAP;
  Otto.clearMouth();
  drawRows();
}

void face_restore() {
  if (s_faceId == FACE_BITMAP) { Otto.clearMouth(); drawRows(); }
  else Otto.putMouth(s_faceId);
}

void face_flash(uint8_t id) { Otto.putMouth(id); }

void face_text(const char* s) {
  char buf[10];   // writeText는 최대 9자
  uint8_t n = 0;
  for (; s[n] && n < 9; n++) {
    char c = s[n];
    buf[n] = (c >= 'a' && c <= 'z') ? c - 32 : c;
  }
  buf[n] = '\0';
  Otto.writeText(buf, TEXT_SCROLL_SPEED);
  face_restore();
}
