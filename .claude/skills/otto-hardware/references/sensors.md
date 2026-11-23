# 센서 측정 방법과 판정 기준

## 터치센서 (A0, TTP223 계열)

- `pinMode(A0, INPUT)`. 눌림 = HIGH.
- 디바운스: 상태가 바뀐 뒤 30ms 이상 같은 값이면 확정.
- 이벤트는 "눌림 시작" 순간 한 번만 낸다(누르고 있는 동안 반복 금지).

## 초음파 (HC-SR04, TRIG D8 / ECHO D9)

```cpp
digitalWrite(TRIG, LOW);  delayMicroseconds(2);
digitalWrite(TRIG, HIGH); delayMicroseconds(10);
digitalWrite(TRIG, LOW);
unsigned long us = pulseIn(ECHO, HIGH, 25000UL); // 25ms 타임아웃 ≈ 4.3m
int cm = us ? (int)(us / 58UL) : 0;               // 0 = 측정 실패/범위 밖
```

- 측정 간격 60ms 이상 (이전 펄스 반향 간섭 방지).
- 노이즈: 최근 3회 중앙값을 쓰면 튀는 값이 크게 줄어든다.
- `bl_motion`의 `duration * 0.034 / 2`는 float 연산이다. 정수 `/58`과 결과가 같고 더 가볍다.

## MPU6050 (GY-521, I2C 0x68)

레지스터:

| 레지스터 | 주소 | 용도 |
|----------|------|------|
| PWR_MGMT_1 | 0x6B | 0x00 쓰기 = 슬립 해제 |
| ACCEL_CONFIG | 0x1C | 0x00 = ±2g (16384 LSB/g) |
| CONFIG | 0x1A | 0x03 = DLPF 44Hz (서보 진동 완화) |
| ACCEL_XOUT_H | 0x3B | 6바이트: AX, AY, AZ (big-endian int16) |
| WHO_AM_I | 0x75 | 0x68이 나오면 정상 (일부 클론은 0x70/0x72) |

초기화:

```cpp
Wire.begin();
Wire.setClock(100000);
Wire.setWireTimeout(3000, true);   // 센서가 빠져도 멈추지 않게
// 0x6B ← 0x00, 0x1A ← 0x03, 0x1C ← 0x00
```

기울기 (가속도만 사용):

```cpp
pitch = atan2(ax, sqrt((float)ay*ay + (float)az*az)) * 57.2958;
roll  = atan2(ay, az) * 57.2958;
```

- 결과는 정수 도(°)로 반올림해 전송한다. AVR의 `sscanf`/`printf`는 float을 지원하지 않는다.
- 저역통과: `filtered = filtered * 0.8 + new * 0.2` 정도면 보행 진동에 충분하다.
- 장착 방향을 모르므로 축 선택(`AX/AY/AZ`)과 부호를 `config.h`의 상수로 둔다. 하드웨어 시험 때 "앞으로 기울이면 pitch가 +"가 되도록 사용자와 맞춘다.
- 넘어짐 판정: |pitch| 또는 |roll| > 60°가 300ms 이상 지속. 회복 판정: 둘 다 < 25°가 1초 이상 지속. 히스테리시스가 없으면 경계 근처에서 이벤트가 연속으로 쏟아진다.
- 부팅 직후 WHO_AM_I를 읽어 실패하면 센서 없음으로 표시하고 넘어짐 감지를 끈다. 펌웨어 전체가 멈추면 안 된다.

## 사운드센서 (A6, 선택)

- `analogRead(A6)`. ref 기준 임계값 55. 환경에 따라 조정 가능하도록 설정값으로 둔다.
- 서보 소음에 반응하므로 동작 중에는 무시하는 것이 좋다.
