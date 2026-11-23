// AUTO-GENERATED from protocol/protocol.json by gen_protocol.py - DO NOT EDIT
export const PROTO_VERSION = 1;
export const BAUD = 9600;
export const LINE_END = "\n";
export const MAX_LINE = 48;

export const CMD = Object.freeze({
  "PING": {
    "token": "P",
    "args": [],
    "desc": "연결 확인. ACK 뒤에 INFO와 TRIMS를 보내고 DONE."
  },
  "STOP": {
    "token": "S",
    "args": [],
    "desc": "진행 중 동작을 멈추고 홈 자세. 다른 어떤 명령보다 우선한다. FALLEN 상태는 풀지 않는다."
  },
  "MOVE": {
    "token": "M",
    "args": [
      {
        "name": "id",
        "min": 0,
        "max": 20
      },
      {
        "name": "period",
        "min": 400,
        "max": 3000,
        "default": 1000
      },
      {
        "name": "size",
        "min": 5,
        "max": 40,
        "default": 15
      }
    ],
    "desc": "연속 동작. STOP이나 다른 MOVE·1회성 동작 명령이 올 때까지 한 주기씩 반복한다. id는 Otto_APP move 표(0=home은 1회성)."
  },
  "GESTURE": {
    "token": "H",
    "args": [
      {
        "name": "id",
        "min": 1,
        "max": 13
      }
    ],
    "desc": "Otto 제스처 1회(블로킹)."
  },
  "SING": {
    "token": "K",
    "args": [
      {
        "name": "id",
        "min": 1,
        "max": 19
      }
    ],
    "desc": "Otto 노래 1회(블로킹)."
  },
  "TONE": {
    "token": "T",
    "args": [
      {
        "name": "freq",
        "min": 31,
        "max": 5000
      },
      {
        "name": "ms",
        "min": 10,
        "max": 2000
      }
    ],
    "desc": "부저 단음. 비블로킹, 재생이 끝나면 DONE."
  },
  "MOUTH": {
    "token": "L",
    "args": [
      {
        "name": "id",
        "min": 0,
        "max": 30
      }
    ],
    "desc": "미리 정의된 입모양."
  },
  "MATRIX": {
    "token": "X",
    "args": [
      {
        "name": "r0",
        "min": 0,
        "max": 255
      },
      {
        "name": "r1",
        "min": 0,
        "max": 255
      },
      {
        "name": "r2",
        "min": 0,
        "max": 255
      },
      {
        "name": "r3",
        "min": 0,
        "max": 255
      },
      {
        "name": "r4",
        "min": 0,
        "max": 255
      },
      {
        "name": "r5",
        "min": 0,
        "max": 255
      },
      {
        "name": "r6",
        "min": 0,
        "max": 255
      },
      {
        "name": "r7",
        "min": 0,
        "max": 255
      }
    ],
    "desc": "8x8 전체 비트맵. row0이 맨 위, 각 행의 bit7이 왼쪽(정면에서 본 왼쪽)."
  },
  "TEXT": {
    "token": "W",
    "args": [
      {
        "name": "text",
        "type": "str",
        "maxlen": 9
      }
    ],
    "desc": "스크롤 텍스트(대문자·숫자·공백, 최대 9자 — Otto writeText 한도). 블로킹."
  },
  "ARMS": {
    "token": "A",
    "args": [
      {
        "name": "left",
        "min": 0,
        "max": 180
      },
      {
        "name": "right",
        "min": 0,
        "max": 180
      }
    ],
    "desc": "팔 서보 각도(D6 왼팔, D7 오른팔). 90 = 내린 기본 자세(가정)."
  },
  "SERVO": {
    "token": "G",
    "args": [
      {
        "name": "yl",
        "min": 0,
        "max": 180
      },
      {
        "name": "yr",
        "min": 0,
        "max": 180
      },
      {
        "name": "rl",
        "min": 0,
        "max": 180
      },
      {
        "name": "rr",
        "min": 0,
        "max": 180
      }
    ],
    "desc": "다리 서보 4개 직접 각도(트림 적용 전 논리 각도, 90 = 홈)."
  },
  "TRIM": {
    "token": "C",
    "args": [
      {
        "name": "yl",
        "min": -90,
        "max": 90
      },
      {
        "name": "yr",
        "min": -90,
        "max": 90
      },
      {
        "name": "rl",
        "min": -90,
        "max": 90
      },
      {
        "name": "rr",
        "min": -90,
        "max": 90
      },
      {
        "name": "save",
        "min": 0,
        "max": 1,
        "default": 1
      }
    ],
    "desc": "다리 트림 설정 후 홈 자세. save=1이면 EEPROM 0~3에 저장, 0이면 미리보기(재부팅 시 사라짐). 응답에 TRIMS 포함."
  },
  "TELEM": {
    "token": "R",
    "args": [
      {
        "name": "interval_ms",
        "min": 0,
        "max": 5000
      }
    ],
    "desc": "주기 텔레메트리. 0이면 끈다. 100 미만(0 제외)은 100으로 올린다. MOVING 중에는 최소 500ms로 늦춘다."
  },
  "AUTO": {
    "token": "U",
    "args": [
      {
        "name": "mask",
        "min": 0,
        "max": 15
      }
    ],
    "desc": "자동 반응 비트: 1 터치 정지, 2 장애물 후퇴, 4 넘어짐 감지, 8 소리 반응. 센서가 없는 비트는 무시되며 실제 적용값을 INFO로 다시 알린다."
  }
});

export const MSG = Object.freeze({
  "INFO": {
    "token": "i",
    "fields": [
      "proto",
      "fw_build",
      "sensors",
      "auto"
    ]
  },
  "TRIMS": {
    "token": "c",
    "fields": [
      "yl",
      "yr",
      "rl",
      "rr"
    ]
  },
  "ACK": {
    "token": "a",
    "fields": [
      "cmd"
    ]
  },
  "DONE": {
    "token": "d",
    "fields": [
      "cmd"
    ]
  },
  "ERR": {
    "token": "e",
    "fields": [
      "code",
      "cmd"
    ]
  },
  "TELEMETRY": {
    "token": "t",
    "fields": [
      "dist_cm",
      "touch",
      "pitch",
      "roll",
      "sound",
      "state"
    ]
  },
  "EVENT": {
    "token": "v",
    "fields": [
      "kind",
      "value"
    ]
  }
});

export const ERR = Object.freeze({
  "UNKNOWN_CMD": 1,
  "BAD_ARG": 2,
  "BUSY": 3,
  "LINE_TOO_LONG": 4,
  "SENSOR_FAIL": 5,
  "FALLEN": 6
});
export const EVT = Object.freeze({
  "TOUCH": 1,
  "OBSTACLE": 2,
  "FALL": 3,
  "RECOVER": 4,
  "SOUND": 5,
  "BOOT": 6
});
export const ST = Object.freeze({
  "IDLE": 0,
  "MOVING": 1,
  "ACTION": 2,
  "FALLEN": 3,
  "AVOID": 4
});

const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
export const ERR_NAME = invert(ERR);
export const EVT_NAME = invert(EVT);
export const ST_NAME = invert(ST);
const MSG_BY_TOKEN = Object.fromEntries(Object.entries(MSG).map(([k, v]) => [v.token, k]));
const CMD_BY_CODE = Object.fromEntries(Object.entries(CMD).map(([k, v]) => [v.token.charCodeAt(0), k]));

/** 명령 이름(ASCII 코드)으로 CMD 이름을 찾는다. ACK/DONE/ERR의 cmd 필드 해석용. */
export function cmdNameFromCode(code) {
  return CMD_BY_CODE[code] ?? null;
}

/**
 * 명령을 한 줄 문자열로 인코딩한다. 범위를 벗어나거나 필수 인자가 없으면 Error를 던진다.
 * 뒤쪽 인자를 생략하면 default를 채운다.
 */
export function encode(name, ...values) {
  const c = CMD[name];
  if (!c) throw new Error(`알 수 없는 명령: ${name}`);
  const parts = [c.token];
  c.args.forEach((a, i) => {
    let v = values[i];
    if (v === undefined || v === null || v === '') {
      if (a.type === 'str') throw new Error(`${name}.${a.name} 필요`);
      if (a.default === undefined) throw new Error(`${name}.${a.name} 필요`);
      v = a.default;
    }
    if (a.type === 'str') {
      v = String(v).replace(/[\r\n]/g, ' ');
      if (v.length > a.maxlen) throw new Error(`${name}.${a.name} 길이 초과 (${a.maxlen})`);
      if (/[^\x20-\x7e]/.test(v)) throw new Error(`${name}.${a.name}: ASCII만 허용`);
    } else {
      v = Number(v);
      if (!Number.isInteger(v)) throw new Error(`${name}.${a.name}: 정수 필요`);
      if (v < a.min || v > a.max) throw new Error(`${name}.${a.name} 범위 ${a.min}~${a.max}`);
    }
    parts.push(String(v));
  });
  if (values.length > c.args.length) throw new Error(`${name}: 인자 개수 초과`);
  const line = parts.join(' ') + LINE_END;
  if (line.length > MAX_LINE) throw new Error(`${name}: 줄 길이 초과`);
  return line;
}

/**
 * 로봇이 보낸 한 줄을 해석한다.
 * 반환: { name, fields: {필드명: 정수} } 또는 { name: 'RAW', text } (디버그 출력 등)
 */
export function parseLine(line) {
  const text = String(line).replace(/[\r\n]+$/, '');
  const parts = text.trim().split(/\s+/);
  const name = MSG_BY_TOKEN[parts[0]];
  if (!name || parts[0].length !== 1) return { name: 'RAW', text };
  const spec = MSG[name];
  const nums = parts.slice(1).map(Number);
  if (nums.length !== spec.fields.length || nums.some((n) => !Number.isInteger(n))) {
    return { name: 'RAW', text };
  }
  const fields = Object.fromEntries(spec.fields.map((f, i) => [f, nums[i]]));
  return { name, fields };
}
