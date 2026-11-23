//----------------------------------------------------------------
//-- Otto Bluetooth Control + Touch Stop + Ultrasonic Backward
//-----------------------------------------------------------------

#include <Otto.h>
Otto Otto;

#include <Servo.h>
#include <SoftwareSerial.h>

#define LeftLeg 2 
#define RightLeg 3
#define LeftFoot 4 
#define RightFoot 5 
#define Buzzer  13 
#define DIN A3 
#define CS A2  
#define CLK A1 
#define Orientation 1

#define TOUCH_PIN A0     // 터치센서

// ✅ 초음파 센서 핀
#define TRIG 8
#define ECHO 9

SoftwareSerial BT(11, 12);   // Bluetooth module

///////////////////////////////////////////////////////////////////
//-- Setup ------------------------------------------------------//
///////////////////////////////////////////////////////////////////
void setup(){
  BT.begin(9600);
  Serial.begin(9600);

  pinMode(TOUCH_PIN, INPUT);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  Otto.init(LeftLeg, RightLeg, LeftFoot, RightFoot, true, Buzzer);
  Otto.initMATRIX(DIN, CS, CLK, Orientation);

  Otto.sing(S_connection);
  Otto.home();
  delay(50);
}

// ✅ 초음파 센서 거리 측정 함수
long getDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duration = pulseIn(ECHO, HIGH, 20000); // timeout 20ms
  long distance = duration * 0.034 / 2;       // cm 단위
  return distance;
}

///////////////////////////////////////////////////////////////////
//-- Loop -------------------------------------------------------//
///////////////////////////////////////////////////////////////////
void loop() {

  // ✅ 터치센서 눌리면 즉시 정지
  if (digitalRead(TOUCH_PIN) == HIGH) {
    Serial.println("Touch detected! STOP!");
    Otto.home();
    Otto.sing(S_buttonPushed);
    return;
  }

  // ✅ 초음파 센서로 손 감지 → 즉시 후퇴
  long dist = getDistance();
  if (dist > 0 && dist < 10) {
    Serial.println("Hand detected! Moving Backward!");
    Otto.walk(1, 900, -1);  // 뒤로 한 스텝
    return;                 // Bluetooth 명령보다 우선 실행
  }

  // ✅ Bluetooth 명령 처리
  if (BT.available()) {
    char cmd = BT.read();
    Serial.println(cmd);

    switch (cmd) {
      case 'F': walkForward(); break;
      case 'B': walkBackward(); break;
      case 'L': turnLeft(); break;
      case 'R': turnRight(); break;
      case 'D': dance(); break;
      case 'C': centerPosition(); break;
      case 'H': helloMove(); break;
      case 'S': sing(); break;
    }
  }
}

///////////////////////////////////////////////////////////////////
//-- Movement Functions -----------------------------------------//
///////////////////////////////////////////////////////////////////

void centerPosition() {
  Otto.home();
  delay(100);
}

void walkForward() {
  Otto.walk(2,1000,1);
}

void walkBackward() {
  Otto.walk(2,1000,-1);
}

void turnLeft() {
  Otto.moonwalker(3,1000,25,1);
}

void turnRight() {
  Otto.moonwalker(3,1000,25,-1);
}

void dance() {
  Otto.turn(2,1000,1);
  Otto._tone(10, 3, 1);
  Otto.bendTones(100, 200, 1.04, 10, 10);
  Otto.home(); delay(100);

  Otto.turn(2,1000,-1);
  Otto.bend(1,500,1);
  Otto.bend(1,2000,-1);
  Otto.shakeLeg(1,1500,1);
  Otto.home(); delay(100);
  Otto.shakeLeg(1,2000,-1);
}

void helloMove() {
  Otto.playGesture(OttoHappy);
  Otto.playGesture(OttoSuperHappy);
  Otto.playGesture(OttoSad);
  Otto.playGesture(OttoVictory);
  Otto.playGesture(OttoAngry);
  Otto.playGesture(OttoSleeping);
  Otto.playGesture(OttoFretful);
  Otto.playGesture(OttoLove);
  Otto.playGesture(OttoConfused);
  Otto.playGesture(OttoFart);
  Otto.playGesture(OttoWave);
  Otto.playGesture(OttoMagic);
  Otto.playGesture(OttoFail);
  Otto.home();
  delay(100);
}

void sing() {
  Otto.sing(S_happy);
}