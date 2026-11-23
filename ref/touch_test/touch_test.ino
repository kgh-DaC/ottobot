const int touchPin = A0;  // 터치센서 핀 (아날로그 또는 디지털 타입 모두 가능)

void setup() {
  Serial.begin(9600);
  pinMode(touchPin, INPUT);
}

void loop() {
  int touchValue = digitalRead(touchPin);  // HIGH 또는 LOW 읽기

  if (touchValue == HIGH) {
    Serial.println("Touch Sensor Pressed!");  // 눌림 상태
  } else {
    Serial.println("Not Pressed");            // 평상시 상태
  }

  delay(100); // 디바운스(노이즈 필터)
}