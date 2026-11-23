#define BUZZER 13   // 수동부저 핀

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  // 1kHz 톤을 500ms 재생
  tone(BUZZER, 1000);
  delay(500);

  // 소리 끄기
  noTone(BUZZER);
  delay(500);
}