// sensors.h - 터치 디바운스, 초음파(부팅 감지), MPU6050, 사운드
#pragma once
#include <Arduino.h>

#define SENS_IMU 1   // INFO sensors 비트 1
#define SENS_US  2   // INFO sensors 비트 2

void sensors_begin();             // IMU WHO_AM_I + 초음파 5회 감지
void sensors_update();            // 주기가 된 센서만 측정
uint8_t sensors_present();        // SENS_* 비트
uint8_t sensors_imuWhoAmI();      // 진단 출력용 (0 = 응답 없음)

bool sensors_touch();             // 디바운스된 현재 상태
bool sensors_touchPressedEdge();  // 눌림 시작 1회 (읽으면 지워짐)
int16_t sensors_distance();       // 중앙값 cm, 0 = 실패/부재
bool sensors_distanceFresh();     // 새 중앙값이 나왔는가 (읽으면 지워짐)
int16_t sensors_pitch();          // 보정 후 정수 도, IMU 없으면 0
int16_t sensors_roll();
int16_t sensors_pitchRaw();       // 필터 전 최근 샘플 (MOVING/AVOID 중 넘어짐 판정용)
int16_t sensors_rollRaw();
uint8_t sensors_imuSeq();         // 새 IMU 샘플마다 증가
int16_t sensors_sound();          // A6 원시값
bool sensors_imuFailedEdge();     // 실행 중 IMU 연속 실패로 비활성화된 순간 1회
