#define TOUCH_PIN A0       //터치센서 핀
#define BUZZER_PIN 13      //수동부저 핀

void setup() {
  pinMode(TOUCH_PIN, INPUT);        //터치센서 입력
  pinMode(BUZZER_PIN, OUTPUT);      //부저 출력
  Serial.begin(9600);
}

void loop() {

  int touchValue = digitalRead(TOUCH_PIN);   //HIGH or LOW

  Serial.println(touchValue);   //센서값 확인용

  if (touchValue == HIGH) {  
     //터치 눌림 → 부저 소리 (1000Hz)
    tone(BUZZER_PIN, 1000);
  } else {
     //터치 안됨 → 소리 끔
    noTone(BUZZER_PIN);
  }

  delay(20);   //안정화를 위한 작은 지연
}