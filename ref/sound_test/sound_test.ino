#define SOUND_PIN A6
#define THRESHOLD 55   // 조정 가능

void setup() {
  Serial.begin(9600);
}

void loop() {
  int soundValue = analogRead(SOUND_PIN);

  if (soundValue > THRESHOLD) {
    Serial.println("Loud Sound Detected!");
  }

  delay(10);
}