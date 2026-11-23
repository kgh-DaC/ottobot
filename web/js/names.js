// 번호표: otto-hardware/references/otto-lib-api.md (Otto_APP move 표, playGesture, sing, putMouth)
// [번호, 한국어 이름, 원래 이름]

export const MOVES = [
  [1, '전진', 'walk +1'], [2, '후진', 'walk -1'], [3, '좌회전', 'turn +1'], [4, '우회전', 'turn -1'],
  [5, '위아래', 'updown'], [6, '문워크 왼쪽', 'moonwalker +1'], [7, '문워크 오른쪽', 'moonwalker -1'],
  [8, '스윙', 'swing'], [9, '크루사이토 앞', 'crusaito +1'], [10, '크루사이토 뒤', 'crusaito -1'],
  [11, '점프', 'jump'], [12, '날갯짓 앞', 'flapping +1'], [13, '날갯짓 뒤', 'flapping -1'],
  [14, '까치발 스윙', 'tiptoeSwing'], [15, '왼쪽 굽히기', 'bend +1'], [16, '오른쪽 굽히기', 'bend -1'],
  [17, '왼다리 흔들기', 'shakeLeg +1'], [18, '오른다리 흔들기', 'shakeLeg -1'], [19, '떨기', 'jitter'],
  [20, '상승 회전', 'ascendingTurn'],
];

export const GESTURES = [
  [1, '기쁨', 'OttoHappy'], [2, '아주 기쁨', 'OttoSuperHappy'], [3, '슬픔', 'OttoSad'],
  [4, '잠자기', 'OttoSleeping'], [5, '방귀', 'OttoFart'], [6, '혼란', 'OttoConfused'],
  [7, '사랑', 'OttoLove'], [8, '화남', 'OttoAngry'], [9, '초조', 'OttoFretful'],
  [10, '마법', 'OttoMagic'], [11, '손 흔들기', 'OttoWave'], [12, '승리', 'OttoVictory'], [13, '실패', 'OttoFail'],
];

export const SONGS = [
  [1, '연결', 'S_connection'], [2, '연결 끊김', 'S_disconnection'], [3, '놀람', 'S_surprise'],
  [4, '오오', 'S_OhOoh'], [5, '오오 2', 'S_OhOoh2'], [6, '귀여움', 'S_cuddly'], [7, '잠', 'S_sleeping'],
  [8, '기쁨', 'S_happy'], [9, '아주 기쁨', 'S_superHappy'], [10, '짧은 기쁨', 'S_happy_short'],
  [11, '슬픔', 'S_sad'], [12, '혼란', 'S_confused'], [13, '방귀 1', 'S_fart1'], [14, '방귀 2', 'S_fart2'],
  [15, '방귀 3', 'S_fart3'], [16, '모드 1', 'S_mode1'], [17, '모드 2', 'S_mode2'], [18, '모드 3', 'S_mode3'],
  [19, '버튼', 'S_buttonPushed'],
];

export const MOUTHS = [
  ...Array.from({ length: 10 }, (_, i) => [i, `숫자 ${i}`, `zero..nine`]),
  [10, '웃음', 'smile'], [11, '활짝(벌림)', 'happyOpen'], [12, '활짝(다묾)', 'happyClosed'],
  [13, '하트', 'heart'], [14, '크게 놀람', 'bigSurprise'], [15, '조금 놀람', 'smallSurprise'],
  [16, '메롱', 'tongueOut'], [17, '뱀파이어 1', 'vamp1'], [18, '뱀파이어 2', 'vamp2'],
  [19, '일자 입', 'lineMouth'], [20, '갸우뚱', 'confused'], [21, '사선', 'diagonal'],
  [22, '슬픔', 'sad'], [23, '슬픔(벌림)', 'sadOpen'], [24, '슬픔(다묾)', 'sadClosed'],
  [25, 'OK', 'okMouth'], [26, 'X', 'xMouth'], [27, '물음표', 'interrogation'], [28, '번개', 'thunder'],
  [29, '엉덩이', 'culito'], [30, '화남', 'angry'],
];
MOUTHS.forEach((m, i) => { if (i < 10) m[2] = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][i]; });

export const STATE_KO = { IDLE: '대기', MOVING: '이동 중', ACTION: '동작 중', FALLEN: '넘어짐', AVOID: '장애물 후퇴' };

export const EVENT_KO = { TOUCH: '터치', OBSTACLE: '장애물', FALL: '넘어짐', RECOVER: '회복', SOUND: '소리', BOOT: '부팅' };

// 로봇 오류 코드 → "무엇을 하면 되는지"
export const ERR_HELP = {
  UNKNOWN_CMD: '로봇이 모르는 명령입니다. 로봇 펌웨어가 이 웹과 같은 버전인지 확인하고, 다르면 펌웨어를 다시 올리세요.',
  BAD_ARG: '값이 로봇이 받는 범위를 벗어났습니다. 웹과 펌웨어 버전이 같은지 확인하세요.',
  BUSY: '로봇이 장애물을 피해 뒤로 가는 중이라 거부했습니다. 후퇴가 끝난 뒤(약 2초) 다시 시도하세요.',
  LINE_TOO_LONG: '명령 줄이 너무 깁니다(48바이트 초과). 통신 잡음일 수 있으니 다시 시도하세요.',
  SENSOR_FAIL: '기울기 센서(MPU6050) 통신이 끊겨 넘어짐 감지를 껐습니다. A4/A5 배선을 확인하고 로봇을 다시 켜세요.',
  FALLEN: '로봇이 넘어진 상태라 서보를 쓰는 명령을 거부했습니다. 로봇을 바로 세우면 1초 뒤 자동으로 회복됩니다(또는 자동 반응에서 넘어짐 감지를 끄세요).',
};
