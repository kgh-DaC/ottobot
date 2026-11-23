# OttoDIYLib v13 API 요약

원본: `ref/OttoDIYLib-main/OttoDIYLib-main/src/Otto.h`, 예제 `examples/Otto_APP/Otto_APP.ino`.

## 초기화

```cpp
#include <Otto.h>
Otto Otto;
Otto.init(YL=2, YR=3, RL=4, RR=5, load_calibration=true, Buzzer=13);
Otto.initMATRIX(DIN=A3, CS=A2, CLK=A1, Orientation=1);
Otto.matrixIntensity(0..15);
Otto.home();
```

## 동작 (모두 블로킹: 대략 steps × T ms 동안 반환하지 않음)

`Otto_APP`의 move id 표를 그대로 쓰면 공식 앱과 호환된다.

| id | 호출 | 의미 |
|----|------|------|
| 0 | `home()` | 기본 자세 |
| 1 | `walk(1, T, 1)` | 앞으로 |
| 2 | `walk(1, T, -1)` | 뒤로 |
| 3 | `turn(1, T, 1)` | 왼쪽 회전 |
| 4 | `turn(1, T, -1)` | 오른쪽 회전 |
| 5 | `updown(1, T, h)` | 위아래 |
| 6 | `moonwalker(1, T, h, 1)` | 문워크 왼쪽 |
| 7 | `moonwalker(1, T, h, -1)` | 문워크 오른쪽 |
| 8 | `swing(1, T, h)` | 스윙 |
| 9 | `crusaito(1, T, h, 1)` | 크루사이토 앞 |
| 10 | `crusaito(1, T, h, -1)` | 크루사이토 뒤 |
| 11 | `jump(1, T)` | 점프 |
| 12 | `flapping(1, T, h, 1)` | 날갯짓 앞 |
| 13 | `flapping(1, T, h, -1)` | 날갯짓 뒤 |
| 14 | `tiptoeSwing(1, T, h)` | 까치발 스윙 |
| 15 | `bend(1, T, 1)` | 왼쪽 굽히기 |
| 16 | `bend(1, T, -1)` | 오른쪽 굽히기 |
| 17 | `shakeLeg(1, T, 1)` | 왼다리 흔들기 |
| 18 | `shakeLeg(1, T, -1)` | 오른다리 흔들기 |
| 19 | `jitter(1, T, h)` | 떨기 |
| 20 | `ascendingTurn(1, T, h)` | 상승 회전 |

T 기본 1000, h(size) 기본 15.

> **주의: 아래 번호는 Otto_APP/프로토콜 번호(1부터)이며 라이브러리 상수 값이 아니다.** 라이브러리 상수는 0부터이고 노래는 순서도 다르다. `playGesture()`/`sing()`에 프로토콜 번호를 그대로 넘기면 엉뚱한 동작·무음이 된다. 반드시 상수 이름으로 변환 표를 만든다(Otto_APP의 switch문과 같은 방식).

## 제스처 `playGesture(x)` (블로킹, 수 초)

프로토콜 번호 → 상수(값): 1 OttoHappy(0), 2 OttoSuperHappy(1), 3 OttoSad(2), 4 OttoSleeping(3), 5 OttoFart(4), 6 OttoConfused(5), 7 OttoLove(6), 8 OttoAngry(7), 9 OttoFretful(8), 10 OttoMagic(9), 11 OttoWave(10), 12 OttoVictory(11), 13 OttoFail(12) → 순서가 같으므로 `id - 1`.

## 노래 `sing(x)`

프로토콜 번호 → 상수(값): 1 S_connection(0), 2 S_disconnection(1), 3 S_surprise(6), 4 S_OhOoh(7), 5 S_OhOoh2(8), 6 S_cuddly(9), 7 S_sleeping(10), 8 S_happy(11), 9 S_superHappy(12), 10 S_happy_short(13), 11 S_sad(14), 12 S_confused(15), 13 S_fart1(16), 14 S_fart2(17), 15 S_fart3(18), 16 S_mode1(3), 17 S_mode2(4), 18 S_mode3(5), 19 S_buttonPushed(2) → 순서가 달라 변환 표 필요.

## 소리

- `_tone(freq, ms, silentMs)` — 블로킹
- `bendTones(f0, f1, prop, ms, silentMs)`

## LED 매트릭스 (8x8, MAX7219)

- `putMouth(id)` — 미리 정의된 입모양 id 0~30 (`Otto_mouths.h`): 0~9 숫자, 10 smile, 11 happyOpen, 12 happyClosed, 13 heart, 14 bigSurprise, 15 smallSurprise, 16 tongueOut, 17 vamp1, 18 vamp2, 19 lineMouth, 20 confused, 21 diagonal, 22 sad, 23 sadOpen, 24 sadClosed, 25 okMouth, 26 xMouth, 27 interrogation, 28 thunder, 29 culito, 30 angry
- `putMouth(bits, false)` — 사용자 비트맵. `writeFull()`은 **30비트 = 6열×5행**만 그린다(비트 r*6+c). 8x8 전체를 쓰지 못한다.
- `setLed(x, y, 0|1)` — 픽셀 단위. 8x8 전체 그리기는 이것으로 64번 호출한다.
- `writeText(str, speed)` — 스크롤 텍스트 (블로킹, 대문자·숫자 위주)
- `clearMouth()`

## 서보 직접 제어

- `_moveServos(time, int target[4])` — 4개 다리 서보를 time ms 동안 보간 이동 (블로킹)
- `_moveSingle(pos, servo_number)`
- `setTrims(YL, YR, RL, RR)`, `saveTrimsOnEEPROM()`
- `attachServos()`, `detachServos()` — 넘어졌을 때 detach하면 서보 과열을 막는다
- `getRestState()`, `setRestState(bool)`

## 팔 서보 (라이브러리 밖)

`Servo armL, armR; armL.attach(6); armR.attach(7);` — Timer1 하나로 최대 12개까지 가능하므로 다리 4 + 팔 2 = 6개는 문제없다.
