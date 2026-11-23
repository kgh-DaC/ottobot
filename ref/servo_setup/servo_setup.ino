#include <Servo.h>

Servo servos[6];

// D2 ~ D7
const byte servoPins[6] = {2, 3, 4, 5, 6, 7};

// 현재 각도 저장
int angles[6] = {90, 90, 90, 90, 90, 90};

String inputBuffer;

void setup() {
  Serial.begin(9600);

  // 서보 초기화
  for (int i = 0; i < 6; i++) {
    servos[i].attach(servoPins[i]);
    servos[i].write(angles[i]);
  }

  Serial.println(F("===== Servo Test ====="));
  Serial.println(F("S1:90  -> D2"));
  Serial.println(F("S2:90  -> D3"));
  Serial.println(F("S3:90  -> D4"));
  Serial.println(F("S4:90  -> D5"));
  Serial.println(F("S5:90  -> D6"));
  Serial.println(F("S6:90  -> D7"));
  Serial.println(F("B:90   -> ALL"));
  Serial.println(F("Angle range: 0~180"));
}

void loop() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        handleCommand(inputBuffer);
        inputBuffer = "";
      }
    }
    else {
      inputBuffer += c;

      if (inputBuffer.length() > 50) {
        inputBuffer = "";
        Serial.println(F("Error: Command too long"));
      }
    }
  }
}

void handleCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  // 전체 서보 제어
  if (cmd.startsWith("B:")) {
    int angle = parseAngle(cmd.substring(2));

    for (int i = 0; i < 6; i++) {
      moveServo(i + 1, angle);
    }
    return;
  }

  // S1~S6 처리
  for (int i = 1; i <= 6; i++) {
    String prefix = "S" + String(i) + ":";

    if (cmd.startsWith(prefix)) {
      int angle = parseAngle(cmd.substring(prefix.length()));
      moveServo(i, angle);
      return;
    }
  }

  Serial.print(F("Unknown command: "));
  Serial.println(cmd);
}

int parseAngle(String s) {
  s.trim();

  int val = s.toInt();

  if (val < 0) val = 0;
  if (val > 180) val = 180;

  return val;
}

void moveServo(uint8_t which, int angle) {
  if (which < 1 || which > 6) return;

  int idx = which - 1;

  angles[idx] = angle;
  servos[idx].write(angle);

  Serial.print(F("[S"));
  Serial.print(which);
  Serial.print(F("] Pin D"));
  Serial.print(servoPins[idx]);
  Serial.print(F(" -> "));
  Serial.print(angle);
  Serial.println(F(" deg"));
}