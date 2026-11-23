// AUTO-GENERATED from protocol/protocol.json by gen_protocol.py - DO NOT EDIT
#pragma once

#define PROTO_VERSION 1
#define PROTO_BAUD 9600
#define PROTO_MAX_LINE 48
#define PROTO_MAX_ARGS 8

// ---- commands (web -> robot) ----
#define CMD_PING 'P'
#define CMD_PING_ARGC 0
#define CMD_PING_MIN_ARGC 0

#define CMD_STOP 'S'
#define CMD_STOP_ARGC 0
#define CMD_STOP_MIN_ARGC 0

#define CMD_MOVE 'M'
#define CMD_MOVE_ARGC 3
#define CMD_MOVE_MIN_ARGC 1
#define CMD_MOVE_ID_MIN 0
#define CMD_MOVE_ID_MAX 20
#define CMD_MOVE_PERIOD_MIN 400
#define CMD_MOVE_PERIOD_MAX 3000
#define CMD_MOVE_PERIOD_DEFAULT 1000
#define CMD_MOVE_SIZE_MIN 5
#define CMD_MOVE_SIZE_MAX 40
#define CMD_MOVE_SIZE_DEFAULT 15

#define CMD_GESTURE 'H'
#define CMD_GESTURE_ARGC 1
#define CMD_GESTURE_MIN_ARGC 1
#define CMD_GESTURE_ID_MIN 1
#define CMD_GESTURE_ID_MAX 13

#define CMD_SING 'K'
#define CMD_SING_ARGC 1
#define CMD_SING_MIN_ARGC 1
#define CMD_SING_ID_MIN 1
#define CMD_SING_ID_MAX 19

#define CMD_TONE 'T'
#define CMD_TONE_ARGC 2
#define CMD_TONE_MIN_ARGC 2
#define CMD_TONE_FREQ_MIN 31
#define CMD_TONE_FREQ_MAX 5000
#define CMD_TONE_MS_MIN 10
#define CMD_TONE_MS_MAX 2000

#define CMD_MOUTH 'L'
#define CMD_MOUTH_ARGC 1
#define CMD_MOUTH_MIN_ARGC 1
#define CMD_MOUTH_ID_MIN 0
#define CMD_MOUTH_ID_MAX 30

#define CMD_MATRIX 'X'
#define CMD_MATRIX_ARGC 8
#define CMD_MATRIX_MIN_ARGC 8
#define CMD_MATRIX_R0_MIN 0
#define CMD_MATRIX_R0_MAX 255
#define CMD_MATRIX_R1_MIN 0
#define CMD_MATRIX_R1_MAX 255
#define CMD_MATRIX_R2_MIN 0
#define CMD_MATRIX_R2_MAX 255
#define CMD_MATRIX_R3_MIN 0
#define CMD_MATRIX_R3_MAX 255
#define CMD_MATRIX_R4_MIN 0
#define CMD_MATRIX_R4_MAX 255
#define CMD_MATRIX_R5_MIN 0
#define CMD_MATRIX_R5_MAX 255
#define CMD_MATRIX_R6_MIN 0
#define CMD_MATRIX_R6_MAX 255
#define CMD_MATRIX_R7_MIN 0
#define CMD_MATRIX_R7_MAX 255

#define CMD_TEXT 'W'
#define CMD_TEXT_ARGC 1
#define CMD_TEXT_MIN_ARGC 1
#define CMD_TEXT_TEXT_MAXLEN 9

#define CMD_ARMS 'A'
#define CMD_ARMS_ARGC 2
#define CMD_ARMS_MIN_ARGC 2
#define CMD_ARMS_LEFT_MIN 0
#define CMD_ARMS_LEFT_MAX 180
#define CMD_ARMS_RIGHT_MIN 0
#define CMD_ARMS_RIGHT_MAX 180

#define CMD_SERVO 'G'
#define CMD_SERVO_ARGC 4
#define CMD_SERVO_MIN_ARGC 4
#define CMD_SERVO_YL_MIN 0
#define CMD_SERVO_YL_MAX 180
#define CMD_SERVO_YR_MIN 0
#define CMD_SERVO_YR_MAX 180
#define CMD_SERVO_RL_MIN 0
#define CMD_SERVO_RL_MAX 180
#define CMD_SERVO_RR_MIN 0
#define CMD_SERVO_RR_MAX 180

#define CMD_TRIM 'C'
#define CMD_TRIM_ARGC 5
#define CMD_TRIM_MIN_ARGC 4
#define CMD_TRIM_YL_MIN -90
#define CMD_TRIM_YL_MAX 90
#define CMD_TRIM_YR_MIN -90
#define CMD_TRIM_YR_MAX 90
#define CMD_TRIM_RL_MIN -90
#define CMD_TRIM_RL_MAX 90
#define CMD_TRIM_RR_MIN -90
#define CMD_TRIM_RR_MAX 90
#define CMD_TRIM_SAVE_MIN 0
#define CMD_TRIM_SAVE_MAX 1
#define CMD_TRIM_SAVE_DEFAULT 1

#define CMD_TELEM 'R'
#define CMD_TELEM_ARGC 1
#define CMD_TELEM_MIN_ARGC 1
#define CMD_TELEM_INTERVAL_MS_MIN 0
#define CMD_TELEM_INTERVAL_MS_MAX 5000

#define CMD_AUTO 'U'
#define CMD_AUTO_ARGC 1
#define CMD_AUTO_MIN_ARGC 1
#define CMD_AUTO_MASK_MIN 0
#define CMD_AUTO_MASK_MAX 15

// ---- messages (robot -> web) ----
#define MSG_INFO 'i'
#define MSG_INFO_FIELDS 4
#define MSG_TRIMS 'c'
#define MSG_TRIMS_FIELDS 4
#define MSG_ACK 'a'
#define MSG_ACK_FIELDS 1
#define MSG_DONE 'd'
#define MSG_DONE_FIELDS 1
#define MSG_ERR 'e'
#define MSG_ERR_FIELDS 2
#define MSG_TELEMETRY 't'
#define MSG_TELEMETRY_FIELDS 6
#define MSG_EVENT 'v'
#define MSG_EVENT_FIELDS 2

// ---- errors ----
#define ERR_UNKNOWN_CMD 1
#define ERR_BAD_ARG 2
#define ERR_BUSY 3
#define ERR_LINE_TOO_LONG 4
#define ERR_SENSOR_FAIL 5
#define ERR_FALLEN 6

// ---- events ----
#define EVT_TOUCH 1
#define EVT_OBSTACLE 2
#define EVT_FALL 3
#define EVT_RECOVER 4
#define EVT_SOUND 5
#define EVT_BOOT 6

// ---- states ----
#define ST_IDLE 0
#define ST_MOVING 1
#define ST_ACTION 2
#define ST_FALLEN 3
#define ST_AVOID 4
