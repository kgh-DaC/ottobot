// face.h - LED 매트릭스 (입모양, 8x8 비트맵, 스크롤 텍스트, 상태 표정)
#pragma once
#include <Arduino.h>

void face_begin();
void face_mouth(uint8_t id);            // 0~30, 현재 얼굴로 기억
void face_matrix(const int16_t* rows);  // r0=맨 위, bit7=왼쪽. 현재 얼굴로 기억
void face_text(const char* s);          // 9자까지 대문자로 복사해 스크롤 (블로킹), 끝나면 이전 얼굴 복원
void face_flash(uint8_t id);            // 잠깐 표시(기억 안 함) - 소리 반응
void face_restore();                    // 기억된 얼굴 다시 그리기
