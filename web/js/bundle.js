// 생성물 — 직접 고치지 말 것. 원본: web/js/*.js, 생성: python tools/build_web_bundle.py
// index.html을 file://로 열어도 동작하도록 ES 모듈을 일반 스크립트 하나로 묶은 것.
'use strict';

// ---- protocol.js ----
const __m_protocol = (() => {
  // AUTO-GENERATED from protocol/protocol.json by gen_protocol.py - DO NOT EDIT
  const PROTO_VERSION = 1;
  const BAUD = 9600;
  const LINE_END = "\n";
  const MAX_LINE = 48;

  const CMD = Object.freeze({
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

  const MSG = Object.freeze({
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

  const ERR = Object.freeze({
    "UNKNOWN_CMD": 1,
    "BAD_ARG": 2,
    "BUSY": 3,
    "LINE_TOO_LONG": 4,
    "SENSOR_FAIL": 5,
    "FALLEN": 6
  });
  const EVT = Object.freeze({
    "TOUCH": 1,
    "OBSTACLE": 2,
    "FALL": 3,
    "RECOVER": 4,
    "SOUND": 5,
    "BOOT": 6
  });
  const ST = Object.freeze({
    "IDLE": 0,
    "MOVING": 1,
    "ACTION": 2,
    "FALLEN": 3,
    "AVOID": 4
  });

  const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
  const ERR_NAME = invert(ERR);
  const EVT_NAME = invert(EVT);
  const ST_NAME = invert(ST);
  const MSG_BY_TOKEN = Object.fromEntries(Object.entries(MSG).map(([k, v]) => [v.token, k]));
  const CMD_BY_CODE = Object.fromEntries(Object.entries(CMD).map(([k, v]) => [v.token.charCodeAt(0), k]));

  /** 명령 이름(ASCII 코드)으로 CMD 이름을 찾는다. ACK/DONE/ERR의 cmd 필드 해석용. */
  function cmdNameFromCode(code) {
    return CMD_BY_CODE[code] ?? null;
  }

  /**
   * 명령을 한 줄 문자열로 인코딩한다. 범위를 벗어나거나 필수 인자가 없으면 Error를 던진다.
   * 뒤쪽 인자를 생략하면 default를 채운다.
   */
  function encode(name, ...values) {
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
  function parseLine(line) {
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
  return { PROTO_VERSION, BAUD, LINE_END, MAX_LINE, CMD, MSG, ERR, EVT, ST, ERR_NAME, EVT_NAME, ST_NAME, cmdNameFromCode, encode, parseLine };
})();

// ---- link.js ----
const __m_link = (() => {
  // 공통 링크 계층: transport(BLE/Serial/데모) 위에서 줄 단위 송수신, 명령 큐, ACK/DONE 대기, MOVE keepalive.
  //
  // 규칙 (docs/protocol.md, docs/behavior.md 6절):
  //  - 명령은 encode()로만 만든다. 한 번에 하나만 보내고 ACK(또는 ERR)를 받은 뒤 다음 명령을 보낸다.
  //  - ACK 대기 1.5초(로봇이 MOVE 한 주기를 도는 중이면 + period) 초과 시 1회 재전송, 그래도 없으면 오류.
  //  - 블로킹 명령(GESTURE SING TEXT SERVO TRIM, MOVE 0)은 DONE을 받기 전까지 STOP 외에는 보내지 않는다.
  //  - STOP은 큐를 비우고 즉시 보낸다(블로킹 대기 중에도 — 로봇은 동작이 끝난 뒤 처리한다).
  //  - 연속 MOVE 유지 중에는 같은 MOVE를 max(500, ceil(period/3))ms마다 다시 보낸다(펌웨어 1500ms 감시 대응).
  //
  // d 77 귀속 규칙 (펌웨어는 줄을 받은 순서대로 처리하고 응답도 그 순서로 보낸다):
  //  - 현재 hold의 MOVE가 a 77을 받기 전(hold.acked=false)에 온 d 77은 이전 동작(STOP·교체 전 MOVE·자동 정지) 몫이다.
  //  - hold.acked 이후에 온 d 77만 "현재 이동이 로봇 쪽에서 끝남"(감시·터치·장애물·넘어짐)으로 본다.
  //  - moveLive: 지금까지 받은 응답 기준으로 로봇이 연속 MOVE 중인지(a 77 → true, d 77 → false).
  //  - 이동 중 MOVE 0: a 77 → d 77(MOVE 중단) → 홈 → d 77. 이 경우 DONE을 2개 기다린다.
  //
  // 자동 정지 후 MOVE 잠금 (behavior.md, 통합 QA r1):
  //  - 펌웨어는 자동 정지(터치 정지, 장애물 후퇴 종료(후퇴 끝·터치), 통신 감시) 뒤 홈 완료(IDLE) 시점부터
  //    MOVE_LOCK_MS 동안 MOVE(id 0 포함)를 e 3 77로 거부한다. 사용자 STOP과 넘어짐은 잠금이 없다.
  //  - 웹은 TOUCH 이벤트(AUTO 1 켜짐 + 이동 중) 또는 요청하지 않은 d 77을 받으면 hold를 즉시 풀고 keepalive를 멈춘다.
  //    사용자가 다시 눌러야 재개한다. 잠금 중의 e 3 77은 조용히 넘기고, 잠금 중에 다시 누르면 잠금이 끝난 뒤 1회 보낸다.
  const { encode, parseLine, CMD, ST, ERR, EVT, cmdNameFromCode } = __m_protocol;
  const MOVE_LOCK_MS = 1000;
  const LOCK_MARGIN_MS = 200;   // 로봇 쪽 잠금 시작 시각과 웹 수신 시각의 차이 여유
  const FORWARD_IDS = new Set([1, 9, 12]);

  const ACK_TIMEOUT_MS = 1500;
  const DONE_TIMEOUT_MS = 30000;
  // 멈춰 있을 때 터치 → 로봇이 인사(기쁨 제스처 → HELLO 흐르기 → 원위치, 약 6.5초 블로킹). 그동안 보낸 줄은 늦게 읽힌다
  const TOUCH_GREET_MS = 8000;
  const BLOCKING = new Set(['GESTURE', 'SING', 'TEXT', 'SERVO', 'TRIM']);
  const code = (name) => CMD[name].token.charCodeAt(0);
  const CODE_MOVE = code('MOVE');
  const CODE_STOP = code('STOP');

  function keepaliveInterval(period) {
    return Math.min(1000, Math.max(500, Math.ceil(period / 3)));
  }

  class Link {
    constructor() {
      this.transport = null;
      this.connected = false;
      this.queue = [];
      this.inflight = null;
      this.waitDone = null;
      this.stopPending = null;
      this.hold = null;
      this.kaTimer = null;
      this.moveLive = false;
      this.robotState = ST.IDLE;
      this.movePeriod = 1000;
      this.lastRxAt = 0;
      this.lockUntil = 0;   // 이 시각 전까지 로봇이 MOVE를 거부한다고 본다
      this.autoMask = null; // INFO.auto
      this.deferTimer = null;
      this.wantHold = null; // 잠금 때문에 미뤄 둔 이동 요청
      this.lockRetried = false; // 잠금 거부 후 자동 재시도는 자동 정지 1회당 한 번
      this.avoidActive = false; // 장애물 후퇴 중으로 보임(끝나면 잠금 시작)
      this.fallStop = false;    // 다음 d 77은 넘어짐 정지(잠금 없음)
      this.seq = 0; // 송신 순번: STOP 이후에 보낸 줄의 응답은 a 83 이후에만 온다
      this._h = {};
    }

    on(ev, cb) { (this._h[ev] ??= []).push(cb); return this; }
    _emit(ev, ...a) { for (const cb of this._h[ev] ?? []) { try { cb(...a); } catch (e) { console.error(e); } } }

    get busy() { return !!this.waitDone; }
    get busyName() { return this.waitDone?.name ?? null; }

    async connect(transport, opts) {
      if (this.transport && this.transport !== transport) {
        this.transport.onLine(() => {});
        this.transport.onStatus(() => {});
        this.transport.onLog?.(() => {});
      }
      this.transport = transport;
      transport.onLine((l) => this._onLine(l));
      transport.onStatus((s, d) => this._onStatus(s, d));
      transport.onLog?.((t) => this._emit('log', t));
      await transport.connect(opts);
    }

    async disconnect() {
      if (!this.transport) return;
      if (this.connected && (this.hold || this.moveLive)) {
        // 끊기 전에 STOP을 써 둔다(응답은 기다리지 않음). 못 가도 펌웨어 감시가 멈춘다.
        try { this._write(encode('STOP'), '연결 끊기 전'); } catch { /* 무시 */ }
        await new Promise((r) => setTimeout(r, 60));
      }
      await this.transport.disconnect();
    }

    _onStatus(s, detail) {
      const was = this.connected;
      this.connected = s === 'connected';
      if (!this.connected) this._reset(new Error('연결이 끊겼습니다'));
      if (was !== this.connected || s === 'error') this._emit('status', s, detail);
    }

    _reset(err) {
      clearTimeout(this.inflight?.timer);
      clearTimeout(this.waitDone?.timer);
      clearTimeout(this.stopPending?.timer);
      this.inflight?.reject(err);
      for (const q of this.queue) q.reject(err);
      this.stopPending?.reject(err);
      this.queue = [];
      this.inflight = null;
      this.stopPending = null;
      if (this.waitDone) { this.waitDone = null; this._emit('busy', false, null); }
      this._setHold(null);
      this._cancelDeferred();
      this.moveLive = false;
      this.robotState = ST.IDLE;
    }

    // ---------- 송신 ----------

    /**
     * 명령을 큐에 넣는다. ACK를 받으면 resolve, ERR이면 reject(err.robotErr = {code, name}).
     * opts.coalesce: 같은 키의 아직 안 보낸 명령을 이 명령으로 바꾼다(슬라이더용).
     */
    command(name, args = [], opts = {}) {
      if (typeof name !== 'string') name = Object.keys(CMD).find((k) => CMD[k] === name) ?? String(name); // CMD.X도 받는다
      let line;
      try {
        line = encode(name, ...args);
      } catch (e) {
        return Promise.reject(Object.assign(new Error(`값이 잘못되었습니다: ${e.message}`), { encodeErr: true }));
      }
      if (!this.connected) return Promise.reject(new Error('로봇이 연결되어 있지 않습니다. 먼저 "연결"을 누르세요.'));
      if (name === 'STOP') return this.stop();
      const blocking = BLOCKING.has(name) || (name === 'MOVE' && Number(args[0]) === 0);
      if (name === 'MOVE' && !blocking) {
        return Promise.reject(new Error('연속 MOVE는 holdMove()로 보낸다'));
      }
      // 자동 정지 직후 잠금 중의 home(MOVE 0): 이동 버튼과 같게 잠금이 끝난 뒤 1회 보낸다
      if (name === 'MOVE' && blocking && performance.now() < this.lockUntil && !opts.deferred) {
        this._emit('notice', '로봇이 방금 스스로 멈춰 잠시(1초) 이동을 받지 않습니다. 잠금이 끝나면 홈 자세로 갑니다.');
        const wait = this.lockUntil - performance.now();
        return new Promise((res) => setTimeout(res, wait))
          .then(() => this.command(name, args, { ...opts, deferred: true }));
      }
      // 1회성 동작은 연속 MOVE를 끝낸다(펌웨어가 a xx → d 77 → 실행 → d xx). keepalive도 멈춘다.
      if (blocking && this.hold) this._setHold(null);
      return new Promise((resolve, reject) => {
        const item = { name, line, code: code(name), blocking, tries: 0, resolve, reject, coalesce: opts.coalesce };
        if (opts.coalesce) {
          const i = this.queue.findIndex((q) => q.coalesce === opts.coalesce);
          if (i >= 0) { this.queue[i].resolve({ replaced: true }); this.queue.splice(i, 1, item); this._pump(); return; }
        }
        this.queue.push(item);
        this._pump();
      });
    }

    /** 연속 MOVE 시작/교체. 같은 MOVE를 주기적으로 다시 보낸다. */
    holdMove(id, period, size) {
      const line = encode('MOVE', id, period, size); // 범위 오류는 예외로 올라간다
      if (!this.connected) throw new Error('로봇이 연결되어 있지 않습니다. 먼저 "연결"을 누르세요.');
      if (id === 0) throw new Error('MOVE 0(home)은 command()로 보낸다');
      if (this.hold && this.hold.line === line) return; // 같은 이동 유지 중
      const now = performance.now();
      if (now < this.lockUntil) {
        // 자동 정지 직후 잠금 구간: 끝난 뒤 1회 보낸다(그 사이 손을 떼면 취소)
        const first = !this.wantHold;
        this.wantHold = { id, period, size };
        clearTimeout(this.deferTimer);
        this.deferTimer = setTimeout(() => {
          const w = this.wantHold;
          this.wantHold = null;
          this.deferTimer = null;
          if (w && this.connected) { try { this.holdMove(w.id, w.period, w.size); } catch (e) { this._emit('warn', e.message); } }
        }, this.lockUntil - now);
        if (first) this._emit('notice', '로봇이 방금 스스로 멈춰 잠시(1초) 이동을 받지 않습니다. 잠금이 끝나면 바로 움직입니다.');
        return;
      }
      this.movePeriod = period;
      this._setHold({ id, period, size, line, acked: false });
      const item = { name: 'MOVE', line, code: CODE_MOVE, blocking: false, tries: 0, hold: true,
        resolve: () => {}, reject: () => {} };
      const i = this.queue.findIndex((q) => q.name === 'MOVE' && !q.blocking);
      if (i >= 0) this.queue.splice(i, 1, item); else this.queue.push(item);
      clearInterval(this.kaTimer);
      this.kaTimer = setInterval(() => this._keepalive(), keepaliveInterval(period));
      this._pump();
    }

    /** 버튼에서 손을 뗐을 때. 유지 중인 MOVE가 있으면 STOP. */
    releaseMove() {
      this._cancelDeferred();
      if (this.hold) return this.stop();
      return Promise.resolve();
    }

    _keepalive() {
      if (!this.hold || !this.connected) return;
      if (this.inflight || this.waitDone || this.queue.length) return; // 다른 올바른 줄도 감시를 갱신한다
      this.queue.push({ name: 'MOVE', line: this.hold.line, code: CODE_MOVE, blocking: false, tries: 0,
        keepalive: true, resolve: () => {}, reject: () => {} });
      this._pump();
    }

    _startLock(extra = 0) {
      this.lockUntil = Math.max(this.lockUntil, performance.now() + MOVE_LOCK_MS + LOCK_MARGIN_MS + extra);
    }

    _cancelDeferred() {
      clearTimeout(this.deferTimer);
      this.deferTimer = null;
      this.wantHold = null;
    }

    /** 로봇이 스스로 멈췄다: hold·keepalive를 즉시 끊고 잠금 구간을 시작한다. */
    _autoStopped(reason) {
      this._startLock();
      this.lockRetried = false;
      this._cancelDeferred();
      this.queue = this.queue.filter((q) => !(q.name === 'MOVE' && !q.blocking)); // 아직 안 보낸 MOVE 버림
      if (this.hold) { this._setHold(null); this._emit('autoStop', reason); }
    }

    _setHold(h) {
      if (!h) { clearInterval(this.kaTimer); this.kaTimer = null; }
      const changed = (this.hold ? this.hold.line : null) !== (h ? h.line : null);
      this.hold = h;
      if (changed) this._emit('hold', h);
    }

    /** 로봇이 블로킹 동작 중이라 지금 보낸 줄을 바로 읽지 못하는가 */
    _robotBlocked() {
      return !!this.waitDone || !!this.inflight?.blocking;
    }

    /** 긴급 정지: 큐를 비우고 즉시 보낸다. */
    stop() {
      if (!this.connected) return Promise.reject(new Error('로봇이 연결되어 있지 않습니다.'));
      const cancelled = Object.assign(new Error('STOP으로 취소됨'), { cancelled: true });
      this._cancelDeferred();
      // 장애물 후퇴를 사용자 STOP으로 끝내면 잠금 없음(behavior.md: 사용자 STOP은 잠금 제외).
      // 로봇은 STOP을 먼저 처리하므로 이 뒤에 보내는 MOVE는 받아들여진다 → 후퇴용 추정 잠금을 바로 지운다.
      if (this.avoidActive) { this.avoidActive = false; this.lockUntil = 0; }
      for (const q of this.queue) q.reject(cancelled);
      this.queue = [];
      // ACK를 기다리던 비블로킹 명령(MOVE 등)은 취소한다: 재전송이 STOP 뒤에 나가 로봇을 다시 움직이지 않게.
      // 늦게 온 그 ACK는 _onAck에서 무시된다. 블로킹 명령은 이미 로봇에 닿았으므로 DONE까지 계속 추적한다.
      if (this.inflight && !this.inflight.blocking) {
        clearTimeout(this.inflight.timer);
        this.inflight.reject(cancelled);
        this.inflight = null;
      }
      this._setHold(null);
      const blocked = this._robotBlocked();
      if (blocked) this._emit('notice', `로봇이 "${this.busyName ?? this.inflight?.name}" 동작을 하는 중입니다. 동작이 끝나면 바로 정지합니다.`);
      const line = encode('STOP');
      return new Promise((resolve, reject) => {
        if (this.stopPending) { // 이미 보낸 STOP이 응답을 기다리는 중이면 하나 더 보내지 않는다
          const prev = this.stopPending;
          const pr = prev.resolve, pj = prev.reject;
          prev.resolve = (v) => { pr(v); resolve(v); };
          prev.reject = (e) => { pj(e); reject(e); };
          return;
        }
        const sp = { tries: 0, resolve, reject };
        this.stopPending = sp;
        const fire = () => {
          sp.seq = ++this.seq;
          this._write(line, sp.tries ? 'STOP 재전송' : '');
          const blockedNow = this._robotBlocked();
          const wait = blockedNow ? this._blockingRemain() + ACK_TIMEOUT_MS : this._ackTimeout();
          sp.timer = setTimeout(() => {
            if (this.stopPending !== sp) return;
            // 블로킹 중에는 재전송하지 않는다(로봇 버퍼에 이미 들어 있음, 두 번 처리됨).
            if (sp.tries++ < 1 && !this._robotBlocked()) { fire(); return; }
            if (this._robotBlocked()) { // 아직 동작 중 — 계속 기다린다
              sp.timer = setTimeout(() => this._stopGiveUp(sp), this._blockingRemain() + ACK_TIMEOUT_MS);
              return;
            }
            this._stopGiveUp(sp);
          }, wait);
        };
        fire();
      });
    }

    _stopGiveUp(sp) {
      if (this.stopPending !== sp) return;
      this.stopPending = null;
      sp.reject(new Error('정지(STOP) 응답이 늦습니다. 연결 상태를 확인하세요. 로봇이 계속 움직이면 전원 스위치를 끄세요.'));
      this._emit('warn', 'STOP 응답 지연');
    }

    _blockingRemain() {
      if (this.waitDone) return Math.max(0, this.waitDone.deadline - performance.now());
      return DONE_TIMEOUT_MS;
    }

    _ackTimeout() {
      // MOVE 한 주기 동안 펌웨어는 줄을 읽지 못한다 → 주기만큼 더 기다린다.
      const moving = this.hold || this.moveLive || this.robotState === ST.MOVING || this.robotState === ST.AVOID;
      const greet = Math.max(0, (this.greetUntil ?? 0) - performance.now());
      return ACK_TIMEOUT_MS + greet + (moving ? Math.max(this.movePeriod, this.robotState === ST.AVOID ? 1000 : 0) : 0);
    }

    _pump() {
      if (!this.connected || this.inflight || this.waitDone || !this.queue.length) return;
      this._transmit(this.queue.shift());
    }

    _transmit(item) {
      this.inflight = item;
      item.seq = ++this.seq;
      this._write(item.line, item.keepalive ? 'keepalive' : item.tries ? '재전송' : '');
      item.timer = setTimeout(() => this._ackTimedOut(item), this._ackTimeout());
    }

    _write(line, note) {
      this._emit('tx', line, note);
      this.transport.send(line).catch((e) => {
        this._emit('warn', `송신 실패: ${e.message}`);
      });
    }

    _ackTimedOut(item) {
      if (this.inflight !== item) return;
      if (item.keepalive) { // keepalive 하나 놓친 것은 다음 주기에 다시 보낸다
        this.inflight = null;
        this._pump();
        return;
      }
      if (item.tries++ < 1) { this._transmit(item); return; }
      this.inflight = null;
      item.reject(new Error(`로봇이 ${item.name} 명령에 응답하지 않습니다. 로봇 전원과 블루투스 연결을 확인하세요.`));
      this._emit('warn', `${item.name} 응답 없음`);
      if (item.hold) this._setHold(null);
      this._pump();
    }

    // ---------- 수신 ----------

    _onLine(line) {
      this.lastRxAt = performance.now();
      const msg = parseLine(line);
      this._emit('rx', line, msg);
      switch (msg.name) {
        case 'ACK': this._onAck(msg.fields.cmd); break;
        case 'DONE': this._onDone(msg.fields.cmd); break;
        case 'ERR': this._onErr(msg.fields.code, msg.fields.cmd); break;
        case 'TELEMETRY':
          this.greetUntil = 0;
          if (this.avoidActive && msg.fields.state !== ST.AVOID) { this.avoidActive = false; this._startLock(); }
          this.robotState = msg.fields.state;
          break;
        case 'INFO': this.autoMask = msg.fields.auto; break;
        case 'EVENT':
          // 터치 정지: 뒤따르는 d 77을 기다리지 않고 keepalive부터 끊는다(블로킹 주기 동안 버퍼에 쌓이지 않게)
          if (msg.fields.kind === EVT.TOUCH && (this.autoMask == null || (this.autoMask & 1)) &&
            (this.hold || this.moveLive || this.avoidActive)) {
            this.avoidActive = false;
            this._autoStopped('TOUCH');
          } else if (msg.fields.kind === EVT.TOUCH && (this.autoMask == null || (this.autoMask & 1)) &&
            !this.fallStop && !this._robotBlocked() && (this.robotState == null || this.robotState === ST.IDLE)) {
            this.greetUntil = performance.now() + TOUCH_GREET_MS; // 인사가 끝나 텔레메트리가 오면 지운다
            this._emit('greet');
          }
          // 장애물 후퇴 진입: 뒤따르는 d 77 전에 keepalive를 끊고, 후퇴(2걸음+홈) 끝까지 잠금으로 본다
          if (msg.fields.kind === EVT.OBSTACLE && this.autoMask != null && (this.autoMask & 2) && this.moveLive &&
            this.hold && FORWARD_IDS.has(this.hold.id)) {
            this.avoidActive = true;
            this._autoStopped('OBSTACLE');
            this._startLock(2 * 1000 + 600); // 텔레메트리로 후퇴 종료를 보면 그때부터 다시 1초
          }
          if (msg.fields.kind === EVT.FALL) this.fallStop = true;
          if (msg.fields.kind === EVT.RECOVER) this.fallStop = false;
          break;
        default: break;
      }
      this._emit('message', msg, line);
    }

    _onAck(c) {
      if (c === CODE_STOP) this.stopWindow = true; // a 83 ~ d 83 사이의 d 77은 사용자 STOP 몫(잠금 없음)
      if (c === CODE_STOP && this.stopPending) {
        clearTimeout(this.stopPending.timer);
        this.stopPending.resolve({ ok: true });
        this.stopPending = null;
        return;
      }
      // STOP의 a 83을 받기 전에 온 ACK는 STOP보다 먼저 보낸 줄의 것이다. STOP 뒤에 보낸 inflight와 짝짓지 않는다.
      const it = this._matchInflight(c);
      if (c === CODE_MOVE && !(it && it.blocking)) {
        // 연속 MOVE의 ACK(취소된 inflight의 늦은 ACK 포함) → 로봇은 지금 MOVING
        this.moveLive = true;
        if (it && this.hold && it.line === this.hold.line) this.hold.acked = true;
        if (!it && !this.hold && !this.stopPending && !this._oneShotQueued()) {
          // 로봇 쪽 자동 정지 직후 이미 떠난 MOVE가 로봇을 다시 움직였다 → 멈춘다.
          this._emit('warn', '자동 정지 뒤 늦게 도착한 MOVE를 STOP으로 취소합니다');
          this.stop().catch(() => {});
        }
      }
      if (!it) return; // 취소된 명령·재전송으로 늦게 온 중복 ACK
      clearTimeout(it.timer);
      this.inflight = null;
      if (it.name === 'MOVE' && !it.blocking) {
        this.robotState = ST.MOVING;
        if (!this.hold && !this.stopPending && !this._oneShotQueued()) {
          this._emit('warn', '이동 유지가 끝난 뒤 도착한 MOVE를 STOP으로 취소합니다');
          this.stop().catch(() => {});
        }
      }
      if (it.blocking) {
        // 이동 중 MOVE 0이면 d 77이 두 번 온다(MOVE 중단 + home 완료). 다른 1회성 명령은 코드가 달라 구분된다.
        const dones = it.code === CODE_MOVE && this.moveLive ? 2 : 1;
        this.robotState = ST.ACTION;
        this.waitDone = { name: it.name, code: c, left: dones, deadline: performance.now() + DONE_TIMEOUT_MS,
          timer: setTimeout(() => {
            this.waitDone = null;
            this._emit('busy', false, null);
            this._emit('warn', `${it.name} 완료(DONE) 응답이 30초 넘게 없습니다. 계속 진행합니다.`);
            this._pump();
          }, DONE_TIMEOUT_MS) };
        this._emit('busy', true, it.name);
      }
      it.resolve({ ok: true });
      this._pump();
    }

    _matchInflight(c) {
      const it = this.inflight;
      if (!it || it.code !== c) return null;
      if (this.stopPending && it.seq > this.stopPending.seq) return null;
      return it;
    }

    _oneShotQueued() {
      return !!this.waitDone || this.queue.some((q) => q.blocking) || !!this.inflight?.blocking;
    }

    _onDone(c) {
      if (c === CODE_MOVE) {
        const wasLive = this.moveLive;
        this.moveLive = false;
        if (this.robotState === ST.MOVING) this.robotState = ST.IDLE;
        // 현재 hold가 ACK를 받은 뒤의 d 77만 "로봇이 스스로 멈춤"이다. 그 전의 d 77은 이전 동작 몫.
        const unexpected = !!this.hold && this.hold.acked && wasLive &&
          !(this.waitDone && this.waitDone.code === CODE_MOVE);
        const selfStop = wasLive && !this.stopPending && !this.stopWindow && !this.waitDone &&
          !this.queue.some((q) => q.blocking) && !this.inflight?.blocking;
        if (this.fallStop) {
          this.fallStop = false; // 넘어짐 정지: 잠금 없음, hold만 푼다
          if (unexpected) { this._setHold(null); this._emit('autoStop', 'FALL'); }
        } else if (unexpected) this._autoStopped('MOVE_DONE');
        else if (selfStop && !this.avoidActive) {
          // 터치 이벤트로 hold를 먼저 푼 경우 등: 로봇은 홈을 마친 뒤 d 77을 보내므로 여기서 잠금을 다시 잰다
          this._startLock();
        }
        this._emit('moveDone', { unexpected });
      }
      if (c === CODE_STOP) this.stopWindow = false;
      if (this.waitDone && this.waitDone.code === c) {
        if (--this.waitDone.left > 0) return;
        clearTimeout(this.waitDone.timer);
        this.waitDone = null;
        if (this.robotState === ST.ACTION) this.robotState = ST.IDLE;
        this._emit('busy', false, cmdNameFromCode(c));
        this._pump();
      }
    }

    _onErr(errCode, c) {
      const name = cmdNameFromCode(c);
      const it = errCode === ERR.LINE_TOO_LONG ? this.inflight : this._matchInflight(c);
      // 자동 정지 직후 잠금 구간의 MOVE 거부(e 3 77)는 예상된 응답이다 → 조용히 넘긴다
      const lockReject = errCode === ERR.BUSY && c === CODE_MOVE && performance.now() < this.lockUntil + 1500;
      if (lockReject && it && it.hold && this.hold && it.line === this.hold.line) {
        // 사용자가 잠금 중에 누른 이동: 잠금이 끝난 뒤 1회 다시 보낸다
        clearTimeout(it.timer);
        this.inflight = null;
        const h = this.hold;
        this._setHold(null);
        if (!this.lockRetried) {
          this.lockRetried = true;
          this.lockUntil = Math.max(this.lockUntil, performance.now() + 300);
          this.holdMove(h.id, h.period, h.size); // 잠금 구간이라 끝난 뒤 1회 보낸다
        } else {
          this._emit('notice', '로봇이 아직 이동을 받지 않습니다(자동 정지 직후 또는 장애물 후퇴 중). 잠시 후 다시 누르세요.');
        }
        this._pump();
        this._emit('robotError', { code: errCode, cmd: c, name, silent: true });
        return;
      }
      if (lockReject && it && it.blocking) {
        this._emit('notice', '로봇이 아직 이동을 받지 않습니다(자동 정지 직후). 잠시 후 다시 누르세요.');
      }
      if (it) {
        clearTimeout(it.timer);
        this.inflight = null;
        if (it.hold || it.keepalive) this._setHold(null);
        it.reject(Object.assign(new Error(`로봇이 ${it.name}을(를) 거부했습니다 (코드 ${errCode})`),
          { robotErr: { code: errCode, name: it.name } }));
        this._pump();
      }
      this._emit('robotError', { code: errCode, cmd: c, name, silent: lockReject });
    }
  }
  return { MOVE_LOCK_MS, ACK_TIMEOUT_MS, keepaliveInterval, Link };
})();

// ---- line-splitter.js ----
const __m_line_splitter = (() => {
  // 수신 바이트 조각을 '\n' 단위 줄로 조립한다. BLE notify(20B)·Serial 조각 모두 같은 방식.
  const { MAX_LINE } = __m_protocol;
  class LineSplitter {
    constructor(onLine) {
      this.onLine = onLine;
      this.decoder = new TextDecoder();
      this.buf = '';
    }

    /** @param {Uint8Array|ArrayBuffer|DataView|string} chunk */
    push(chunk) {
      if (typeof chunk === 'string') this.buf += chunk;
      else {
        const bytes = chunk instanceof DataView
          ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
          : new Uint8Array(chunk.buffer ?? chunk, chunk.byteOffset ?? 0, chunk.byteLength);
        this.buf += this.decoder.decode(bytes, { stream: true });
      }
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).replace(/\r/g, '');
        this.buf = this.buf.slice(i + 1);
        if (line.length) this.onLine(line);
      }
      // 줄 끝이 오지 않는 쓰레기가 쌓이지 않게 한다(디버그 출력 등은 이보다 길 수 있어 넉넉히).
      if (this.buf.length > MAX_LINE * 8) {
        this.onLine(this.buf.replace(/\r/g, ''));
        this.buf = '';
      }
    }

    reset() {
      this.buf = '';
      this.decoder = new TextDecoder();
    }
  }
  return { LineSplitter };
})();

// ---- ble-transport.js ----
const __m_ble_transport = (() => {
  // Web Bluetooth(BLE UART) transport — 로봇 블루투스 모듈 'otto2'(HM-10/HC-08 계열 추정)의 기본 연결 경로.
  // 계약: connect() / disconnect() / send(line) / onLine(cb) / onStatus(cb) / onLog(cb)
  const { LineSplitter } = __m_line_splitter;
  // otto2 모듈은 한 번에 17바이트 이상 쓰면 연결은 유지한 채 양방향 전달을 멈춘다(Arduino 리셋 전까지).
  // 16바이트 이하로 나눠 쓰면 30·34바이트 줄도 정상(2026-11-24 실측). 20(BLE 기본 한도)으로 되돌리지 말 것.
  const CHUNK = 16;
  const QUIET_MARGIN_MS = 90; // 다음 텔레메트리 예상 시각 이만큼 전부터는 송신을 미룬다(줄 송신 시간 + BLE 지연 여유)

  // UART 서비스 후보. 첫 번째가 HM-10/CC2541 계열 기본값(프로토콜 문서 가정).
  const UART_CANDIDATES = [
    { service: 0xffe0, rx: 0xffe1, tx: 0xffe1, label: 'HM-10/CC2541 (FFE0/FFE1)' }, // otto2 실물은 쓰기가 FFE2 → 속성으로 자동 선택
    { service: 0xfff0, rx: 0xfff1, tx: 0xfff2, label: 'BT05/AT-09 변형 (FFF0)' },
    { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      rx: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // notify (로봇 → 웹)
      tx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // write  (웹 → 로봇)
      label: 'Nordic UART' },
    { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', rx: null, tx: null, label: 'Microchip ISSC' },
  ];
  const OPTIONAL_SERVICES = UART_CANDIDATES.map((c) => c.service);

  const toUuid = (v) => (typeof v === 'number' ? BluetoothUUID.getService(v) : v);
  const toCharUuid = (v) => (typeof v === 'number' ? BluetoothUUID.getCharacteristic(v) : v);

  function bleSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  class BleTransport {
    constructor() {
      this.kind = 'ble';
      this.device = null;
      this.rxChar = null;
      this.txChar = null;
      this._line = () => {};
      this._status = () => {};
      this._log = () => {};
      this.splitter = new LineSplitter((l) => { this._watchTelem(l); this._line(l); });
      // 텔레메트리 주기 추적 (송신 타이밍 조정용, _waitQuiet 참고)
      this._tLast = 0;        // 마지막 텔레메트리 줄 수신 시각
      this._tPeriod = 0;      // 최근 수신 간격(ms)
      this._tWaiters = [];
      this._writeChain = Promise.resolve();
      this._onNotify = (e) => this.splitter.push(e.target.value);
      this._onGattDisconnect = () => this._handleDisconnect();
      this.showAll = false; // true면 이름 필터 없이 모든 기기 표시
    }

    onLine(cb) { this._line = cb; }
    onStatus(cb) { this._status = cb; }
    onLog(cb) { this._log = cb; }

    get deviceName() { return this.device?.name ?? ''; }
    get canReconnect() { return !!this.device; }

    async connect({ reuse = false } = {}) {
      if (!bleSupported()) {
        throw new Error('이 브라우저는 Web Bluetooth를 지원하지 않습니다. 데스크톱 Chrome/Edge 또는 안드로이드 Chrome을 쓰거나 데모 모드로 시험하세요.');
      }
      this._manual = false;
      if (!reuse || !this.device) {
        try {
          this.device = await navigator.bluetooth.requestDevice(
            this.showAll
              ? { acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES }
              : { filters: [{ namePrefix: 'otto' }, { namePrefix: 'OTTO' }, { namePrefix: 'Otto' }],
                  optionalServices: OPTIONAL_SERVICES });
        } catch (e) {
          throw friendlyBleError(e, 'select');
        }
        this.device.removeEventListener('gattserverdisconnected', this._onGattDisconnect);
        this.device.addEventListener('gattserverdisconnected', this._onGattDisconnect);
      }
      this._log(`BLE 기기 선택: ${this.device.name ?? '(이름 없음)'} id=${this.device.id}`);
      let server;
      try {
        server = await this.device.gatt.connect();
      } catch (e) {
        throw friendlyBleError(e, 'gatt');
      }
      await this._pickUart(server);
      this.splitter.reset();
      this._tLast = 0; this._tPeriod = 0;   // 이전 연결의 텔레메트리 주기는 버린다
      // 리스너를 먼저 붙인다(startNotifications 직후 첫 notify를 놓치지 않게)
      this.rxChar.addEventListener('characteristicvaluechanged', this._onNotify);
      await this.rxChar.startNotifications();
      this._status('connected', this.device.name);
    }

    async _pickUart(server) {
      let services = [];
      try {
        services = await server.getPrimaryServices();
      } catch (e) {
        this._log(`서비스 목록 읽기 실패: ${e.message}`);
      }
      // 실제 서비스·특성 목록을 로그로 남긴다(모듈 종류 확인용).
      for (const s of services) {
        let chars = [];
        try { chars = await s.getCharacteristics(); } catch { /* 권한 없는 서비스 */ }
        const desc = chars.map((c) => `${c.uuid}[${propsText(c.properties)}]`);
        this._log(`서비스 ${s.uuid}: ${desc.join(', ') || '(특성 없음)'}`);
      }
      const found = new Map(services.map((s) => [s.uuid, s]));
      for (const cand of UART_CANDIDATES) {
        const svc = found.get(toUuid(cand.service));
        if (!svc) continue;
        const chars = await svc.getCharacteristics().catch(() => []);
        const canRx = (c) => c.properties.notify || c.properties.indicate;
        const canTx = (c) => c.properties.writeWithoutResponse || c.properties.write;
        // 후보 UUID가 있어도 필요한 속성이 없으면 버리고 속성으로 고른다.
        // (otto2 실물: FFE1 = notify 전용, FFE2 = write. FFE1에 쓰면 오류 없이 버려진다 — 2026-11-24 진단)
        let rx = cand.rx ? chars.find((c) => c.uuid === toCharUuid(cand.rx) && canRx(c)) : null;
        let tx = cand.tx ? chars.find((c) => c.uuid === toCharUuid(cand.tx) && canTx(c)) : null;
        rx = rx ?? chars.find(canRx);
        tx = tx ?? chars.find(canTx);
        if (rx && tx) {
          this.rxChar = rx;
          this.txChar = tx;
          this._log(`UART 사용: ${cand.label} — 수신 ${rx.uuid}, 송신 ${tx.uuid}`);
          return;
        }
      }
      try { server.disconnect(); } catch { /* 무시 */ }
      throw new Error('BLE UART 특성을 찾지 못했습니다. 로그에 찍힌 서비스 목록을 개발자에게 알려 주세요(모듈 종류가 예상과 다름).');
    }

    async disconnect() {
      // gattserverdisconnected는 비동기로 늦게 온다 → 플래그는 다음 connect() 전까지 유지한다.
      this._manual = true;
      try {
        await this._writeChain; // 마지막 쓰기(STOP 등)를 마친 뒤 끊는다
        if (this.rxChar) {
          this.rxChar.removeEventListener('characteristicvaluechanged', this._onNotify);
          await this.rxChar.stopNotifications().catch(() => {});
        }
        if (this.device?.gatt?.connected) this.device.gatt.disconnect();
      } finally {
        this.rxChar = this.txChar = null;
        this._status('disconnected', '사용자가 연결을 끊었습니다');
      }
    }

    _handleDisconnect() {
      if (this._manual) return; // 사용자가 끊은 것: 이미 상태를 알렸다
      this.rxChar?.removeEventListener('characteristicvaluechanged', this._onNotify);
      this.rxChar = this.txChar = null;
      this._status('disconnected', '블루투스 연결이 끊겼습니다. 로봇 전원과 거리를 확인하고 "다시 연결"을 누르세요.');
    }

    _watchTelem(l) {
      if (!l.startsWith('t ')) return;
      const now = performance.now();
      const gap = now - this._tLast;
      if (gap > 50 && gap < 6000) this._tPeriod = gap;
      this._tLast = now;
      const w = this._tWaiters; this._tWaiters = [];
      w.forEach((r) => r());
    }

    // 로봇(SoftwareSerial)은 반이중이라 로봇이 텔레메트리를 보내는 ~16ms 동안 들어온 바이트가 깨진다
    // (2026-11-24 실측: 텔레메트리 200ms일 때 명령 15% 손실). 텔레메트리 직후는 로봇이 조용한 구간이므로,
    // 다음 텔레메트리가 곧 나올 시점이면 그 줄이 도착할 때까지 기다렸다가 보낸다(최대 한 주기).
    async _waitQuiet() {
      const p = this._tPeriod;
      if (!p) return;
      const since = performance.now() - this._tLast;
      if (since > p * 2.5) return;                    // 텔레메트리가 멈춤
      if (since < p - QUIET_MARGIN_MS) return;        // 아직 조용한 구간
      await new Promise((r) => {
        this._tWaiters.push(r);
        setTimeout(r, p + QUIET_MARGIN_MS);          // 텔레메트리가 안 오면 그냥 보낸다
      });
      await new Promise((r) => setTimeout(r, 5));
    }

    /** 한 줄(encode() 결과)을 CHUNK(16)바이트 단위로 나눠 순서대로 쓴다. */
    send(line) {
      const bytes = new TextEncoder().encode(line);
      const job = this._writeChain.then(async () => {
        if (!this.txChar) throw new Error('연결되어 있지 않습니다');
        await this._waitQuiet();
        for (let i = 0; i < bytes.length; i += CHUNK) {
          const part = bytes.slice(i, i + CHUNK);
          if (this.txChar.properties.writeWithoutResponse && this.txChar.writeValueWithoutResponse) {
            await this.txChar.writeValueWithoutResponse(part);
          } else if (this.txChar.writeValueWithResponse) {
            await this.txChar.writeValueWithResponse(part);
          } else {
            await this.txChar.writeValue(part);
          }
        }
      });
      this._writeChain = job.catch(() => {});
      return job;
    }
  }

  function propsText(p) {
    return ['read', 'write', 'writeWithoutResponse', 'notify', 'indicate'].filter((k) => p[k])
      .map((k) => ({ read: 'R', write: 'W', writeWithoutResponse: 'Wn', notify: 'N', indicate: 'I' }[k])).join('');
  }

  function friendlyBleError(e, phase) {
    const n = e?.name ?? '';
    if (n === 'NotFoundError') {
      return new Error(phase === 'select'
        ? '기기 선택이 취소되었거나 기기를 찾지 못했습니다. 로봇 전원을 켜고, 목록에서 로봇 이름(OTTO2, OTTO3 등)을 고르세요. 목록에 없으면 휴대폰 등 다른 기기와의 연결을 끊고 "모든 기기 보기"를 켜 보세요.'
        : '로봇의 BLE 서비스를 찾지 못했습니다. 로봇을 껐다 켠 뒤 다시 연결하세요.');
    }
    if (n === 'SecurityError') return new Error('보안 제한으로 블루투스를 쓸 수 없습니다. Chrome/Edge에서 web/index.html을 직접 열거나 http://localhost 로 여세요.');
    if (n === 'NotAllowedError') return new Error('블루투스 권한이 거부되었습니다. 브라우저 주소창의 사이트 설정에서 블루투스를 허용하세요.');
    if (n === 'NetworkError') return new Error('로봇과 연결하지 못했습니다. 다른 기기(휴대폰 등)가 이 로봇에 연결돼 있지 않은지 확인하고, 로봇 전원을 껐다 켠 뒤 다시 시도하세요.');
    return new Error(`블루투스 오류: ${e?.message ?? e}. 로봇 전원과 PC 블루투스가 켜져 있는지 확인하세요.`);
  }
  return { bleSupported, BleTransport };
})();

// ---- serial-transport.js ----
const __m_serial_transport = (() => {
  // USB Web Serial transport — BLE와 같은 프로토콜로 조종하는 USB 케이블 경로.
  // 이 로봇의 FTDI 호환칩은 로봇이 조용할 때 드라이버가 마지막 데이터를 반복해서 돌려준다(otto-hardware 참고).
  // 그래서 같은 줄이 짧은 간격으로 반복되면 버리고, 9600bps로 불가능한 수신량이면 경고한다.
  const { BAUD } = __m_protocol;
  const { LineSplitter } = __m_line_splitter;
  const DUP_WINDOW_MS = 80;       // 같은 줄이 이 시간 안에 다시 오면 중복으로 본다(9600bps에서 24B 줄 ≈ 25ms)
  const MAX_REAL_BPS = 1100;      // 9600bps 8N1 이론값 960B/s + 여유
  const BOOT_WAIT_MS = 3200;      // 포트를 열면 Nano가 리셋된다(DTR). 실측 부팅(부트로더+홈+부팅음) 약 3.0초

  function serialSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  class SerialTransport {
    constructor() {
      this.kind = 'serial';
      this.port = null;
      this.reader = null;
      this._line = () => {};
      this._status = () => {};
      this._log = () => {};
      this._last = { text: '', at: 0 };
      this._dupCount = 0;
      this._bytesWindow = { start: 0, n: 0 };
      this._floodWarned = false;
      this.splitter = new LineSplitter((l) => this._accept(l));
      this._writeChain = Promise.resolve();
      this._onUsbDisconnect = (e) => {
        if (e.target === this.port || e.port === this.port) {
          this._unplugged = true; // 분리된 port 객체로는 다시 열 수 없다 → 재연결 때 새로 고르게 한다
          this._lost('USB 케이블이 분리되었습니다. 다시 꽂은 뒤 "연결"을 눌러 포트를 다시 고르세요.');
        }
      };
    }

    onLine(cb) { this._line = cb; }
    onStatus(cb) { this._status = cb; }
    onLog(cb) { this._log = cb; }
    get bootWaitMs() { return BOOT_WAIT_MS; }
    get canReconnect() { return !!this.port && !this._unplugged; }

    async connect({ reuse = false } = {}) {
      if (!serialSupported()) {
        throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다. 데스크톱 Chrome/Edge를 쓰세요.');
      }
      if (!reuse || !this.port || this._unplugged) {
        this._unplugged = false;
        try {
          this.port = await navigator.serial.requestPort();
        } catch (e) {
          throw new Error('포트 선택이 취소되었습니다. 목록에 COM 포트가 없으면 USB 케이블과 드라이버(FTDI)를 확인하세요.');
        }
      }
      try {
        await this.port.open({ baudRate: BAUD, dataBits: 8, stopBits: 1, parity: 'none' });
      } catch (e) {
        throw new Error('COM 포트가 열리지 않습니다. 다른 프로그램(Arduino 시리얼 모니터, 업로드 중인 IDE)이 포트를 쓰고 있지 않은지 확인하세요.');
      }
      navigator.serial.addEventListener('disconnect', this._onUsbDisconnect);
      this.splitter.reset();
      this._closing = false;
      this._status('connected', 'USB 시리얼');
      this._readLoop();
    }

    async _readLoop() {
      while (this.port?.readable && !this._closing) {
        this.reader = this.port.readable.getReader();
        try {
          for (;;) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value) {
              this._meter(value.length);
              this.splitter.push(value);
            }
          }
        } catch (e) {
          if (!this._closing) {
            try { this.reader.releaseLock(); } catch { /* 무시 */ }
            this.reader = null;
            this._lost(`USB 읽기 오류: ${e.message}. 케이블을 확인하고 다시 연결하세요.`);
            return;
          }
        } finally {
          try { this.reader?.releaseLock(); } catch { /* 무시 */ }
          this.reader = null;
        }
      }
    }

    _meter(n) {
      const now = performance.now();
      const w = this._bytesWindow;
      if (now - w.start > 1000) {
        if (w.n > MAX_REAL_BPS && !this._floodWarned) {
          this._floodWarned = true;
          this._log(`USB 수신량 ${w.n}B/s — 9600bps로는 불가능한 양입니다. FTDI 드라이버의 반복 데이터 문제로 보입니다. 같은 줄 반복은 무시합니다. 실제 조종은 BLE를 쓰세요.`);
        }
        w.start = now;
        w.n = 0;
      }
      w.n += n;
    }

    _accept(line) {
      const now = performance.now();
      if (line === this._last.text && now - this._last.at < DUP_WINDOW_MS) {
        this._last.at = now; // 반복이 이어지는 동안 창을 연장
        this._dupCount++;
        if (this._dupCount === 50) this._log('USB: 같은 줄 반복을 50회 무시했습니다(드라이버 반복 데이터).');
        return;
      }
      this._last = { text: line, at: now };
      this._line(line);
    }

    async disconnect() {
      this._closing = true;
      navigator.serial?.removeEventListener('disconnect', this._onUsbDisconnect);
      try {
        if (this.reader) await this.reader.cancel().catch(() => {});
        await this.port?.close().catch(() => {});
      } finally {
        this._status('disconnected', 'USB 연결을 끊었습니다');
      }
    }

    _lost(detail) {
      if (this._closing) return;
      this._closing = true;
      navigator.serial?.removeEventListener('disconnect', this._onUsbDisconnect);
      // reader 락이 풀린 뒤(호출 전 releaseLock) 닫는다. 쓰기 중이면 그 뒤에 닫는다.
      this._writeChain.finally(() => this.port?.close().catch(() => {}));
      this._status('disconnected', detail);
    }

    /** 쓰기를 직렬화한다(STOP이 앞 쓰기와 겹쳐 writer 락 오류가 나지 않게). */
    send(line) {
      const job = this._writeChain.then(async () => {
        if (!this.port?.writable || this._closing) throw new Error('연결되어 있지 않습니다');
        const w = this.port.writable.getWriter();
        try {
          await w.write(new TextEncoder().encode(line));
        } finally {
          w.releaseLock();
        }
      });
      this._writeChain = job.catch(() => {});
      return job;
    }
  }
  return { serialSupported, SerialTransport };
})();

// ---- demo-robot.js ----
const __m_demo_robot = (() => {
  // 가상 로봇(데모 모드). transport와 같은 인터페이스를 구현하고, 펌웨어 규칙(docs/behavior.md)을 그대로 흉내 낸다:
  //  - 검증 → ACK → 실행 → DONE, 검증 실패는 ERR만
  //  - 블로킹 동작(제스처·노래·텍스트·home·SERVO·TRIM)과 MOVE 한 주기 동안은 입력을 읽지 않고 64바이트 버퍼에 쌓음(넘치면 버림)
  //  - 연속 MOVE 교체·keepalive(a 77만), 1회성 명령이 MOVE를 끝냄(a xx → d 77 → d xx)
  //  - MOVE 감시: MOVING 중 1500ms 넘게 올바른 줄이 없으면 주기 종료 후 정지(d 77)
  //  - 상태별 거부: AVOID → e 3, FALLEN → e 6, STOP은 FALLEN을 풀지 않음
  //  - 자동 반응 우선순위: 넘어짐 > 터치 > 장애물, AUTO 마스크·센서 부재 반영
  const { CMD, MSG, ERR, EVT, ST, MAX_LINE, PROTO_VERSION } = __m_protocol;
  const FW_BUILD = 0; // 데모 표시용
  const RX_BUF = 64;
  const TICK = 20;
  const WATCHDOG_MS = 1500;
  const MOVE_LOCK_MS = 1000; // 자동 정지 후 MOVE 잠금(behavior.md 4절)
  const FORWARD_IDS = new Set([1, 9, 12]);
  const TOKEN_TO_CMD = Object.fromEntries(Object.entries(CMD).map(([n, c]) => [c.token, n]));
  const codeOf = (name) => CMD[name].token.charCodeAt(0);
  const ALLOW_AVOID = new Set(['PING', 'STOP', 'TONE', 'MOUTH', 'MATRIX', 'TELEM', 'AUTO']);
  const ALLOW_FALLEN = new Set(['PING', 'STOP', 'TONE', 'SING', 'MOUTH', 'MATRIX', 'TEXT', 'TELEM', 'AUTO']);
  // 터치 인사(기쁨 제스처 ≈ 2.5초 + HELLO 흐르기 ≈ 3.5초 + 원위치 0.5초) — 펌웨어 commands_greet
  const TOUCH_GREET_MS = 6500;
  const BLOCK_MS = { GESTURE: 3000, SING: 1500, HOME: 600, SERVO: 300, TRIM: 600 };

  class DemoRobot {
    constructor() {
      this.kind = 'demo';
      this._line = () => {};
      this._status = () => {};
      this._log = () => {};
      this._view = () => {};
      // 데모 하드웨어 구성: 실물과 같게 초음파 없음, MPU 있음
      this.hw = { mpu: true, ultra: false };
      // 데모 조작 패널이 바꾸는 "물리 세계"
      this.world = { touch: false, distance: 120, tilt: { pitch: 0, roll: 0 }, loud: 0, radioCut: false };
      this.timer = null;
      this.connected = false;
      this.rxFreeAt = 0;      // UART는 순서를 지킨다: 다음 줄은 앞 줄이 다 도착한 뒤에 도착
      this.bootPending = true; // 전원을 켠 뒤 첫 연결 때만 부팅 메시지를 보여 준다(BLE 재연결은 재부팅이 아님)
      this._boot();
    }

    onLine(cb) { this._line = cb; }
    onStatus(cb) { this._status = cb; }
    onLog(cb) { this._log = cb; }
    /** 데모 화면용: 로봇 내부 상태(입모양·매트릭스·팔 등) 변경 알림 */
    onView(cb) { this._view = cb; }

    _boot() {
      this.sensors = (this.hw.mpu ? 1 : 0) | (this.hw.ultra ? 2 : 0);
      this.available = 1 | 8 | (this.hw.ultra ? 2 : 0) | (this.hw.mpu ? 4 : 0);
      this.auto = 7 & this.available;
      this.telem = 0;
      this.lastTelem = 0;
      this.state = ST.IDLE;
      this.move = null;
      this.busyUntil = 0;
      this.busyDone = null;
      this.rxBuf = '';
      this.discarding = false;
      this.lastValid = 0;
      this.tone = null;
      this.avoidSteps = 0;
      this.moveLockUntil = 0;
      this.trimsEeprom = this.trimsEeprom ?? [-10, 0, 0, 0];
      this.trims = [...this.trimsEeprom];
      this.f = { pitch: 0, roll: 0 };
      this.fallSince = 0;
      this.recoverSince = 0;
      this.touchStable = false;
      this.touchRawSince = 0;
      this.touchRaw = false;
      this.obstacleArmed = true;
      this.soundCooldownUntil = 0;
      this.actionEndAt = 0;
      this.view = { mouth: 10, matrix: null, text: '', arms: [90, 90], legs: [90, 90, 90, 90], action: '' };
      this._emitView();
    }

    async connect() {
      await delay(300);
      this.connected = true;
      this._status('connected', '데모 로봇');
      this._log('데모 로봇에 연결했습니다(가상). 실물 펌웨어 규칙대로 응답합니다.');
      if (!this.timer) this.timer = setInterval(() => this._tick(), TICK);
      if (this.bootPending) { this.bootPending = false; this._bootMessages(); }
    }

    async disconnect() {
      this.connected = false;
      // 연결이 끊긴 로봇은 계속 돈다(감시가 MOVE를 멈춤) — 실물과 같게 루프는 유지
      this._status('disconnected', '데모 로봇 연결을 끊었습니다');
    }

    /** 데모 패널: 재부팅(센서 재감지) */
    reboot() {
      this._log(`데모 로봇 재부팅 (MPU ${this.hw.mpu ? '있음' : '없음'}, 초음파 ${this.hw.ultra ? '있음' : '없음'})`);
      this._boot();
      this._bootMessages();
    }

    _bootMessages() {
      this._out('INFO', PROTO_VERSION, FW_BUILD, this.sensors, this.auto);
      this._out('EVENT', EVT.BOOT, this.sensors);
    }

    // ---------- transport 계약 ----------

    send(line) {
      if (!this.connected) return Promise.reject(new Error('연결되어 있지 않습니다'));
      if (this.world.radioCut) return Promise.resolve(); // 전파 끊김 흉내: 로봇에 닿지 않음
      // 9600bps: 바이트당 약 1ms. 앞 줄 뒤에 이어서 도착(순서 유지).
      const now = performance.now();
      this.rxFreeAt = Math.max(now, this.rxFreeAt) + Math.max(1, line.length);
      setTimeout(() => this._rxBytes(line), this.rxFreeAt - now);
      return Promise.resolve();
    }

    _rxBytes(s) {
      for (const ch of s) {
        if (this.rxBuf.length >= RX_BUF) {
          this._log(`(데모) 로봇 수신 버퍼 64바이트 넘침 — 바이트를 버렸습니다`);
          return;
        }
        this.rxBuf += ch;
      }
    }

    _out(name, ...vals) {
      const spec = MSG[name];
      if (vals.length !== spec.fields.length) throw new Error(`demo: ${name} 필드 수`);
      const line = [spec.token, ...vals.map((v) => Math.round(v))].join(' ');
      if (!this.connected || this.world.radioCut) return;
      setTimeout(() => this.connected && this._line(line), 4);
    }

    _emitView() { this._view({ ...this.view, state: this.state, auto: this.auto, sensors: this.sensors, trims: this.trims }); }

    // ---------- 펌웨어 loop() 흉내 ----------

    _tick() {
      const now = performance.now();
      if (now < this.busyUntil) return; // 블로킹 중: 입력·센서 처리 없음
      if (this.busyDone) { const f = this.busyDone; this.busyDone = null; f(now); if (now < this.busyUntil) return; }

      // 펌웨어와 같은 순서: 센서·안전 판정(넘어짐 > 터치 > 장애물) → 입력 처리 → 감시 → 동작
      // (주기 동안 버퍼에 쌓인 keepalive가 터치 정지보다 먼저 처리되어 로봇을 다시 움직이는 일이 없게)
      this._sense(now);

      this._readInput(now);
      if (now < this.busyUntil) return;

      // 감시: 주기 종료 후, 입력을 다 읽은 뒤 판정
      if (this.state === ST.MOVING && now - this.lastValid > WATCHDOG_MS) {
        this._log('(데모) 통신 감시: 1500ms 넘게 올바른 줄이 없어 MOVE를 멈춥니다');
        this._endMove();
        this._home();
        this._lockMoves(now);
      }

      // 5. MOVE 다음 주기 / AVOID 다음 걸음
      if (this.state === ST.MOVING && this.move) {
        this.view.action = `MOVE ${this.move.id}`;
        this.busyUntil = now + this.move.period;
      } else if (this.state === ST.AVOID) {
        if (this.avoidSteps > 0) { this.avoidSteps--; this.busyUntil = now + 1000; }
        else { this._home(); this.state = ST.IDLE; this.actionEndAt = now; this._lockMoves(now); this._emitView(); }
      }

      // 6. 텔레메트리, TONE 종료
      if (this.tone && now >= this.tone.end) { this.tone = null; this._out('DONE', codeOf('TONE')); }
      if (this.telem) {
        const iv = this.state === ST.MOVING ? Math.max(500, this.telem) : this.telem;
        if (now - this.lastTelem >= iv) { this.lastTelem = now; this._sendTelemetry(); }
      }
    }

    _readInput(now) {
      let i;
      while (now >= this.busyUntil && (i = this.rxBuf.indexOf('\n')) >= 0) {
        const raw = this.rxBuf.slice(0, i);
        this.rxBuf = this.rxBuf.slice(i + 1);
        if (this.discarding) { this.discarding = false; continue; }
        if (raw.length + 1 > MAX_LINE) { this._out('ERR', ERR.LINE_TOO_LONG, 0); continue; }
        this._handle(raw.replace(/\r/g, ''), now);
      }
      if (this.rxBuf.length >= MAX_LINE && this.rxBuf.indexOf('\n') < 0) {
        this._out('ERR', ERR.LINE_TOO_LONG, 0);
        this.rxBuf = '';
        this.discarding = true;
      }
    }

    _validate(line) {
      const name = TOKEN_TO_CMD[line[0]];
      if (!name) return { err: ERR.UNKNOWN_CMD, code: line.charCodeAt(0) };
      const spec = CMD[name];
      const c = codeOf(name);
      const rest = line.slice(1);
      const vals = [];
      const strArg = spec.args.find((a) => a.type === 'str');
      if (strArg) {
        if (rest[0] !== ' ' || rest.length < 2) return { err: ERR.BAD_ARG, code: c };
        const text = rest.slice(1).toUpperCase();
        if (text.length > strArg.maxlen) return { err: ERR.BAD_ARG, code: c };
        vals.push(text);
      } else {
        if (rest.length && rest[0] !== ' ') return { err: ERR.BAD_ARG, code: c };
        const parts = rest.trim() ? rest.trim().split(/\s+/) : [];
        const required = spec.args.filter((a) => a.default === undefined).length;
        if (parts.length < required || parts.length > spec.args.length) return { err: ERR.BAD_ARG, code: c };
        for (let k = 0; k < spec.args.length; k++) {
          const a = spec.args[k];
          if (k >= parts.length) { vals.push(a.default); continue; }
          if (!/^-?\d+$/.test(parts[k])) return { err: ERR.BAD_ARG, code: c };
          const v = Number(parts[k]);
          if (v < a.min || v > a.max) return { err: ERR.BAD_ARG, code: c };
          vals.push(v);
        }
      }
      if (this.state === ST.AVOID && !ALLOW_AVOID.has(name)) return { err: ERR.BUSY, code: c };
      if (name === 'MOVE' && this.state !== ST.FALLEN && performance.now() < (this.moveLockUntil ?? 0)) return { err: ERR.BUSY, code: c };
      if (this.state === ST.FALLEN && !ALLOW_FALLEN.has(name)) return { err: ERR.FALLEN, code: c };
      return { name, code: c, vals };
    }

    _handle(line, now) {
      if (!line.trim()) return; // 빈 줄 무시
      const r = this._validate(line);
      if (r.err) { this._out('ERR', r.err, r.code); return; }
      this.lastValid = now;
      const { name, code, vals } = r;
      this._out('ACK', code);

      const endMoveFirst = () => { if (this.state === ST.MOVING) this._endMove(); };
      const block = (ms, label, after) => {
        endMoveFirst();
        this.state = ST.ACTION;
        this.view.action = label;
        this._emitView();
        this.busyUntil = now + ms;
        this.busyDone = (t) => {
          after?.();
          this.state = ST.IDLE;
          this.view.action = '';
          this.actionEndAt = t;
          this._out('DONE', code);
          this._emitView();
        };
      };

      switch (name) {
        case 'PING':
          this._out('INFO', PROTO_VERSION, FW_BUILD, this.sensors, this.auto);
          this._out('TRIMS', ...this.trims);
          this._out('DONE', code);
          break;
        case 'STOP':
          if (this.state === ST.MOVING) this._endMove();
          if (this.tone) { this.tone = null; this._out('DONE', codeOf('TONE')); }
          if (this.state === ST.FALLEN) { this._out('DONE', code); break; } // FALLEN은 풀지 않음
          this.state = ST.IDLE; // 사용자 STOP은 잠금 없음(후퇴 중이었어도). 이미 걸린 잠금은 풀지 않음
          this.avoidSteps = 0;
          this._home();
          this._out('DONE', code);
          this._emitView();
          break;
        case 'MOVE': {
          const [id, period, size] = vals;
          if (id === 0) { block(BLOCK_MS.HOME, 'home', () => this._home()); break; }
          this.move = { id, period, size };
          if (this.state !== ST.MOVING) { this.state = ST.MOVING; this.lastValid = now; }
          this._emitView();
          break;
        }
        case 'GESTURE': block(BLOCK_MS.GESTURE, `제스처 ${vals[0]}`); break;
        case 'SING': block(BLOCK_MS.SING, `노래 ${vals[0]}`); break;
        case 'TEXT':
          this.view.text = vals[0];
          block(500 + vals[0].length * 450, `텍스트 "${vals[0]}"`);
          break;
        case 'SERVO':
          block(BLOCK_MS.SERVO, '서보 이동', () => { this.view.legs = [...vals]; });
          break;
        case 'TRIM': {
          const [yl, yr, rl, rr, save] = vals;
          endMoveFirst(); // 순서: a 67 → d 77 → c ... → d 67
          this.trims = [yl, yr, rl, rr];
          if (save) this.trimsEeprom = [...this.trims];
          this._out('TRIMS', ...this.trims);
          block(BLOCK_MS.TRIM, save ? '트림 저장' : '트림 미리보기', () => this._home());
          break;
        }
        case 'TONE':
          if (this.tone) { this._out('DONE', code); } // 앞 소리를 끊고 앞 T의 DONE (새 ACK 다음)
          this.tone = { end: now + vals[1] };
          break;
        case 'MOUTH':
          this.view.mouth = vals[0]; this.view.matrix = null;
          this._out('DONE', code); this._emitView();
          break;
        case 'MATRIX':
          this.view.matrix = [...vals]; this.view.mouth = null;
          this._out('DONE', code); this._emitView();
          break;
        case 'ARMS':
          this.view.arms = [...vals];
          this._out('DONE', code); this._emitView();
          break;
        case 'TELEM':
          this.telem = vals[0] === 0 ? 0 : Math.max(100, vals[0]);
          this._out('DONE', code);
          break;
        case 'AUTO': {
          this.auto = vals[0] & this.available;
          if (this.state === ST.FALLEN && !(this.auto & 4)) {
            this._recover(1);
          }
          this._out('INFO', PROTO_VERSION, FW_BUILD, this.sensors, this.auto);
          this._out('DONE', code);
          this._emitView();
          break;
        }
        default: break;
      }
    }

    /** 자동 정지 뒤 홈 완료(IDLE) 시점부터 MOVE_LOCK_MS 동안 MOVE(id 0 포함)를 e 3 77로 거부한다. */
    _lockMoves(now) {
      this.moveLockUntil = now + MOVE_LOCK_MS;
    }

    _endMove() {
      this.move = null;
      this.state = ST.IDLE;
      this.view.action = '';
      this._out('DONE', codeOf('MOVE'));
      this._emitView();
    }

    _home() {
      this.view.legs = [90, 90, 90, 90];
      this.view.arms = [90, 90];
    }

    _recover(value) {
      this.state = ST.IDLE;
      this._home();
      this.view.mouth = 10; this.view.matrix = null;
      this._out('EVENT', EVT.RECOVER, value);
      this._emitView();
    }

    // ---------- 센서 ----------

    _sense(now) {
      const w = this.world;
      // IMU (필터 f = f*0.8 + new*0.2)
      if (this.hw.mpu) {
        const n = () => (Math.random() - 0.5) * 1.6;
        const moveWobble = this.state === ST.MOVING ? Math.sin(now / 200) * 6 : 0;
        this.f.pitch = this.f.pitch * 0.8 + (w.tilt.pitch + n()) * 0.2;
        this.f.roll = this.f.roll * 0.8 + (w.tilt.roll + moveWobble + n()) * 0.2;
      } else {
        this.f.pitch = this.f.roll = 0;
      }
      const p = this.f.pitch, r = this.f.roll;
      const fallOn = this.hw.mpu && (this.auto & 4);
      const walking = this.state === ST.MOVING || this.state === ST.AVOID;

      // 2. 넘어짐
      //  - IDLE 등: 필터값 60° 초과가 300ms 지속
      //  - MOVING·AVOID: 주기(걸음) 끝 원시 샘플 1개로 판정 — 60° 초과 2회 연속 또는 단일 75° 초과 (behavior.md 3·4절)
      let fallenNow = false;
      let fallAngle = null;
      if (fallOn && this.state !== ST.FALLEN) {
        if (walking) {
          this.fallSince = 0;
          const rp = this.hw.mpu ? w.tilt.pitch + (Math.random() - 0.5) * 1.6 : 0;
          const rr = this.hw.mpu ? w.tilt.roll + Math.sin(now / 200) * 6 + (Math.random() - 0.5) * 1.6 : 0;
          const m = Math.max(Math.abs(rp), Math.abs(rr));
          const ang = Math.abs(rp) >= Math.abs(rr) ? rp : rr;
          if (m > 75 || (m > 60 && this.walkOver60)) fallAngle = ang;
          this.walkOver60 = m > 60;
        } else {
          this.walkOver60 = false;
          if (Math.abs(p) > 60 || Math.abs(r) > 60) {
            if (!this.fallSince) this.fallSince = now;
            if (now - this.fallSince >= 300) fallAngle = Math.abs(p) >= Math.abs(r) ? p : r;
          } else this.fallSince = 0;
        }
        if (fallAngle != null) {
          {
            const angle = fallAngle;
            this.fallSince = 0;
            this.walkOver60 = false;
            const wasMoving = this.state === ST.MOVING;
            this.move = null;
            this.avoidSteps = 0;
            this.state = ST.FALLEN;
            this.view.mouth = 26; this.view.matrix = null; this.view.action = '서보 해제';
            this._out('EVENT', EVT.FALL, angle);
            if (wasMoving) this._out('DONE', codeOf('MOVE'));
            this._emitView();
            fallenNow = true;
          }
        }
      } else { this.fallSince = 0; this.walkOver60 = false; }
      if (this.state === ST.FALLEN && !fallenNow) {
        if (Math.abs(p) < 25 && Math.abs(r) < 25) {
          if (!this.recoverSince) this.recoverSince = now;
          if (now - this.recoverSince >= 1000) { this.recoverSince = 0; this.view.action = ''; this._recover(0); }
        } else this.recoverSince = 0;
      } else this.recoverSince = 0;

      // 3. 터치 (30ms 디바운스, 눌림 시작마다 이벤트)
      let touchStopped = false;
      if (w.touch !== this.touchRaw) { this.touchRaw = w.touch; this.touchRawSince = now; }
      if (this.touchRaw !== this.touchStable && now - this.touchRawSince >= 30) {
        this.touchStable = this.touchRaw;
        if (this.touchStable) {
          this._out('EVENT', EVT.TOUCH, 1);
          if ((this.auto & 1) && (this.state === ST.MOVING || this.state === ST.AVOID)) {
            // 순서: 중단 → 확인음(1500Hz 80ms, 비블로킹, DONE 없음) → 홈 → d 77(MOVING일 때만) → IDLE
            const wasMoving = this.state === ST.MOVING;
            this.move = null;
            this.view.action = '터치 정지 (확인음)';
            this.state = ST.IDLE; this.avoidSteps = 0; this._home();
            if (wasMoving) this._out('DONE', codeOf('MOVE'));
            this._lockMoves(now);
            this._emitView();
            setTimeout(() => { if (this.view.action === '터치 정지 (확인음)') { this.view.action = ''; this._emitView(); } }, 300);
            touchStopped = true;
          } else if ((this.auto & 1) && this.state === ST.IDLE) {
            // 멈춰 있을 때 터치 → 인사: 기쁨 제스처 + HELLO 흐르기 (블로킹, 응답 없음)
            this.state = ST.ACTION;
            this.view.action = '터치 인사 (기쁨 → HELLO)';
            this.view.text = 'HELLO';
            this._emitView();
            this.busyUntil = now + TOUCH_GREET_MS;
            this.busyDone = (t) => {
              if (this.state === ST.ACTION) this.state = ST.IDLE;
              this.view.action = '';
              this.actionEndAt = t;
              this._emitView();
            };
          }
        }
      }

      // 4. 장애물 (초음파 있을 때만 측정)
      this.dist = 0;
      if (this.hw.ultra) {
        this.dist = Math.max(0, Math.min(400, Math.round(w.distance + (Math.random() - 0.5) * 2)));
        const d = this.dist;
        if (this.obstacleArmed && d >= 1 && d <= 10 && this.state !== ST.FALLEN) {
          this.obstacleArmed = false;
          this._out('EVENT', EVT.OBSTACLE, d);
          if (!touchStopped && (this.auto & 2) && this.state === ST.MOVING && this.move && FORWARD_IDS.has(this.move.id)) {
            this.move = null;
            this._out('DONE', codeOf('MOVE'));
            this.state = ST.AVOID;
            this.avoidSteps = 2;
            this.view.action = '장애물 후퇴';
            this._emitView();
          }
        } else if (!this.obstacleArmed && (d > 15 || d === 0)) this.obstacleArmed = true;
      }

      // 소리 (AUTO 8, IDLE에서만)
      this.sound = Math.round(52 + (Math.random() - 0.5) * 3 + w.loud);
      if ((this.auto & 8) && this.state === ST.IDLE && this.sound > 70 && now > this.soundCooldownUntil && now - this.actionEndAt > 500) {
        this.soundCooldownUntil = now + 2000;
        this._out('EVENT', EVT.SOUND, this.sound);
        const prev = this.view.mouth;
        this.view.mouth = 14; this._emitView();
        setTimeout(() => { if (this.view.mouth === 14) { this.view.mouth = prev; this._emitView(); } }, 1000);
      }
    }

    _sendTelemetry() {
      const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));
      this._out('TELEMETRY', this.dist ?? 0, this.touchStable ? 1 : 0,
        clamp(this.f.pitch, -90, 90), clamp(this.f.roll, -180, 180), clamp(this.sound ?? 52, 0, 1023), this.state);
    }
  }

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  return { DemoRobot };
})();

// ---- names.js ----
const __m_names = (() => {
  // 번호표: otto-hardware/references/otto-lib-api.md (Otto_APP move 표, playGesture, sing, putMouth)
  // [번호, 한국어 이름, 원래 이름]

  const MOVES = [
    [1, '전진', 'walk +1'], [2, '후진', 'walk -1'], [3, '좌회전', 'turn +1'], [4, '우회전', 'turn -1'],
    [5, '위아래', 'updown'], [6, '문워크 왼쪽', 'moonwalker +1'], [7, '문워크 오른쪽', 'moonwalker -1'],
    [8, '스윙', 'swing'], [9, '크루사이토 앞', 'crusaito +1'], [10, '크루사이토 뒤', 'crusaito -1'],
    [11, '점프', 'jump'], [12, '날갯짓 앞', 'flapping +1'], [13, '날갯짓 뒤', 'flapping -1'],
    [14, '까치발 스윙', 'tiptoeSwing'], [15, '왼쪽 굽히기', 'bend +1'], [16, '오른쪽 굽히기', 'bend -1'],
    [17, '왼다리 흔들기', 'shakeLeg +1'], [18, '오른다리 흔들기', 'shakeLeg -1'], [19, '떨기', 'jitter'],
    [20, '상승 회전', 'ascendingTurn'],
  ];

  const GESTURES = [
    [1, '기쁨', 'OttoHappy'], [2, '아주 기쁨', 'OttoSuperHappy'], [3, '슬픔', 'OttoSad'],
    [4, '잠자기', 'OttoSleeping'], [5, '방귀', 'OttoFart'], [6, '혼란', 'OttoConfused'],
    [7, '사랑', 'OttoLove'], [8, '화남', 'OttoAngry'], [9, '초조', 'OttoFretful'],
    [10, '마법', 'OttoMagic'], [11, '손 흔들기', 'OttoWave'], [12, '승리', 'OttoVictory'], [13, '실패', 'OttoFail'],
  ];

  const SONGS = [
    [1, '연결', 'S_connection'], [2, '연결 끊김', 'S_disconnection'], [3, '놀람', 'S_surprise'],
    [4, '오오', 'S_OhOoh'], [5, '오오 2', 'S_OhOoh2'], [6, '귀여움', 'S_cuddly'], [7, '잠', 'S_sleeping'],
    [8, '기쁨', 'S_happy'], [9, '아주 기쁨', 'S_superHappy'], [10, '짧은 기쁨', 'S_happy_short'],
    [11, '슬픔', 'S_sad'], [12, '혼란', 'S_confused'], [13, '방귀 1', 'S_fart1'], [14, '방귀 2', 'S_fart2'],
    [15, '방귀 3', 'S_fart3'], [16, '모드 1', 'S_mode1'], [17, '모드 2', 'S_mode2'], [18, '모드 3', 'S_mode3'],
    [19, '버튼', 'S_buttonPushed'],
  ];

  const MOUTHS = [
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

  const STATE_KO = { IDLE: '대기', MOVING: '이동 중', ACTION: '동작 중', FALLEN: '넘어짐', AVOID: '장애물 후퇴' };

  const EVENT_KO = { TOUCH: '터치', OBSTACLE: '장애물', FALL: '넘어짐', RECOVER: '회복', SOUND: '소리', BOOT: '부팅' };

  // 로봇 오류 코드 → "무엇을 하면 되는지"
  const ERR_HELP = {
    UNKNOWN_CMD: '로봇이 모르는 명령입니다. 로봇 펌웨어가 이 웹과 같은 버전인지 확인하고, 다르면 펌웨어를 다시 올리세요.',
    BAD_ARG: '값이 로봇이 받는 범위를 벗어났습니다. 웹과 펌웨어 버전이 같은지 확인하세요.',
    BUSY: '로봇이 장애물을 피해 뒤로 가는 중이라 거부했습니다. 후퇴가 끝난 뒤(약 2초) 다시 시도하세요.',
    LINE_TOO_LONG: '명령 줄이 너무 깁니다(48바이트 초과). 통신 잡음일 수 있으니 다시 시도하세요.',
    SENSOR_FAIL: '기울기 센서(MPU6050) 통신이 끊겨 넘어짐 감지를 껐습니다. A4/A5 배선을 확인하고 로봇을 다시 켜세요.',
    FALLEN: '로봇이 넘어진 상태라 서보를 쓰는 명령을 거부했습니다. 로봇을 바로 세우면 1초 뒤 자동으로 회복됩니다(또는 자동 반응에서 넘어짐 감지를 끄세요).',
  };
  return { MOVES, GESTURES, SONGS, MOUTHS, STATE_KO, EVENT_KO, ERR_HELP };
})();

// ---- util.js ----
const __m_util = (() => {
  // 작은 공용 도구
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /** 앞쪽 즉시 + 끝 값 보장 쓰로틀. 연속 입력(슬라이더)의 마지막 값은 반드시 보낸다. */
  function throttle(fn, ms) {
    let last = 0, timer = null, pending = null;
    return (...args) => {
      pending = args;
      const now = performance.now();
      const wait = ms - (now - last);
      if (wait <= 0 && !timer) {
        last = now;
        fn(...pending);
        pending = null;
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          last = performance.now();
          if (pending) { const a = pending; pending = null; fn(...a); }
        }, Math.max(0, wait));
      }
    };
  }

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c != null) e.append(c);
    return e;
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem('otto.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('otto.' + k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
  };
  return { $, $$, throttle, el, store };
})();

// ---- ui-sensors.js ----
const __m_ui_sensors = (() => {
  // 센서 텔레메트리 표시와 자동 반응(AUTO) 토글.
  const { CMD, ST, ST_NAME, EVT } = __m_protocol;
  const { STATE_KO } = __m_names;
  function initSensors(ctx) {
    const { $, $$, robot } = ctx;
    let lastTouchFlash = 0;
    let requestedMask = null;

    const hasMpu = () => robot.sensors == null ? true : !!(robot.sensors & 1);
    const hasUltra = () => robot.sensors == null ? true : !!(robot.sensors & 2);

    function showDistance(cm) {
      const out = $('#sDist');
      if (robot.sensors != null && !hasUltra()) {
        out.textContent = '센서 없음';
        out.className = 'big';
        out.title = '부팅 때 초음파 센서(D8/D9)가 응답하지 않았습니다. 배선(Vcc/Gnd 방향)을 확인하고 로봇을 다시 켜세요.';
        $('#sDistBar').style.width = '0';
        return;
      }
      out.title = '';
      if (cm === 0) { out.textContent = '측정 실패'; out.className = 'big'; $('#sDistBar').style.width = '0'; return; }
      out.textContent = `${cm} cm`;
      out.className = cm <= 10 ? 'big alert' : 'big';
      $('#sDistBar').style.width = `${Math.min(100, (cm / 100) * 100)}%`;
    }

    function showTilt(pitch, roll) {
      if (robot.sensors != null && !hasMpu()) {
        $('#sPitch').textContent = '센서 없음';
        $('#sRoll').textContent = '센서 없음';
        $('#tiltPitch').style.transform = '';
        $('#tiltRoll').style.transform = '';
        return;
      }
      $('#sPitch').textContent = `${pitch}°`;
      $('#sRoll').textContent = `${roll}°`;
      // 옆에서 본 모습: 앞으로 기울면(pitch +, 부호는 하드웨어 시험에서 확인) 오른쪽(앞)으로 숙인다
      $('#tiltPitch').style.transform = `rotate(${Math.max(-90, Math.min(90, pitch))}deg)`;
      $('#tiltRoll').style.transform = `rotate(${Math.max(-90, Math.min(90, roll))}deg)`;
      const bad = Math.abs(pitch) > 60 || Math.abs(roll) > 60;
      $$('.robot-svg').forEach((s) => s.classList.toggle('alert', bad));
    }

    function showState(s) {
      const n = ST_NAME[s];
      $('#sState').textContent = `${STATE_KO[n] ?? '?'} (${n ?? s})`;
      $('#sState').className = s === ST.FALLEN ? 'big alert' : s === ST.IDLE ? 'big' : 'big on';
    }

    function showTouch(t) {
      const recent = performance.now() - lastTouchFlash < 600;
      $('#sTouch').textContent = t || recent ? '눌림' : '안 눌림';
      $('#sTouch').className = t || recent ? 'big on' : 'big';
    }

    function syncAuto() {
      const mask = robot.auto ?? 0;
      for (const cb of $$('input.auto')) {
        const bit = Number(cb.dataset.bit);
        cb.checked = !!(mask & bit);
        const why = $(`.why[data-why="${bit}"]`);
        let missing = '';
        if (robot.sensors != null && bit === 2 && !hasUltra()) missing = '(초음파 없음 — 쓸 수 없음)';
        if (robot.sensors != null && bit === 4 && !hasMpu()) missing = '(MPU6050 없음 — 쓸 수 없음)';
        if (why) why.textContent = missing;
        cb.dataset.unavailable = missing ? '1' : '';
        if (missing) cb.disabled = true;
      }
      if (requestedMask != null && requestedMask !== mask) {
        $('#autoNote').textContent = `요청 ${requestedMask} → 로봇 적용 ${mask}. 센서가 없는 항목은 로봇이 뺐습니다.`;
      } else {
        $('#autoNote').textContent = `로봇이 실제로 적용한 값으로 표시됩니다 (현재 마스크 ${mask}).`;
      }
      requestedMask = null;
    }

    for (const cb of $$('input.auto')) {
      cb.addEventListener('change', () => {
        let mask = 0;
        for (const c of $$('input.auto')) if (c.checked) mask |= Number(c.dataset.bit);
        requestedMask = mask;
        ctx.send(CMD.AUTO, [mask], { coalesce: 'auto' });
      });
    }

    ctx.onMessage((msg) => {
      const f = msg.fields;
      switch (msg.name) {
        case 'INFO':
          syncAuto();
          if (!hasUltra()) showDistance(0);
          if (!hasMpu()) showTilt(0, 0);
          ctx.refresh();
          break;
        case 'TELEMETRY':
          showDistance(f.dist_cm);
          showTilt(f.pitch, f.roll);
          showTouch(f.touch);
          $('#sSound').textContent = String(f.sound);
          $('#sSoundBar').style.width = `${Math.min(100, (f.sound / 300) * 100)}%`;
          showState(f.state);
          break;
        case 'EVENT':
          if (f.kind === EVT.TOUCH) { lastTouchFlash = performance.now(); showTouch(1); setTimeout(() => showTouch(0), 650); }
          if (f.kind === EVT.FALL) showState(ST.FALLEN);
          if (f.kind === EVT.RECOVER) showState(ST.IDLE);
          if (f.kind === EVT.OBSTACLE) ctx.toast(`장애물 감지: ${f.value} cm`, 'warn');
          if (f.kind === EVT.SOUND) ctx.toast(`소리 감지 (${f.value})`);
          if (f.kind === EVT.FALL) ctx.toast(`넘어짐 감지 (${f.value}°) — 서보를 풀었습니다. 로봇을 바로 세우세요.`, 'bad');
          break;
        default: break;
      }
    });

    // 연결 상태가 바뀌면 센서 칸 초기화
    ctx.link.on('status', (s) => {
      if (s !== 'connected') {
        robot.sensors = null;
        robot.auto = null;
        for (const id of ['sState', 'sTouch', 'sDist', 'sSound', 'sPitch', 'sRoll']) $('#' + id).textContent = '—';
      }
    });
  }
  return { initSensors };
})();

// ---- matrix-editor.js ----
const __m_matrix_editor = (() => {
  // 8x8 LED 편집기. 좌표 규칙(docs/protocol.md MATRIX, 실물 확인됨):
  //   행 바이트 r0 = 맨 위 행, 각 행의 bit7 = 정면에서 본 왼쪽 칸 → 편집기 (x, y)는 rows[y]의 bit(7 - x).

  function getPixel(rows, x, y) {
    return (rows[y] >> (7 - x)) & 1;
  }

  function setPixel(rows, x, y, on) {
    const m = 1 << (7 - x);
    rows[y] = on ? (rows[y] | m) : (rows[y] & ~m & 0xff);
  }

  const PRESETS = [
    ['하트', [0x00, 0x66, 0xff, 0xff, 0xff, 0x7e, 0x3c, 0x18]],
    ['웃는 얼굴', [0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c]],
    ['슬픈 얼굴', [0x3c, 0x42, 0xa5, 0x81, 0x99, 0xa5, 0x42, 0x3c]],
    ['X', [0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81]],
    ['체크', [0x00, 0x01, 0x03, 0x06, 0x8c, 0xd8, 0x70, 0x20]],
    ['위 화살표', [0x18, 0x3c, 0x7e, 0xff, 0x18, 0x18, 0x18, 0x18]],
    ['방향 확인: 왼쪽 위 한 점', [0x80, 0, 0, 0, 0, 0, 0, 0]],
    ['방향 확인: 왼쪽 화살표', [0x10, 0x30, 0x7f, 0xff, 0x7f, 0x30, 0x10, 0x00]],
    ['전체 켜기', [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]],
  ];

  class MatrixEditor {
    /** @param {HTMLElement} root  @param {{readOnly?: boolean, onChange?: (rows:number[]) => void}} opts */
    constructor(root, opts = {}) {
      this.root = root;
      this.rows = [0, 0, 0, 0, 0, 0, 0, 0];
      this.readOnly = !!opts.readOnly;
      this.onChange = opts.onChange ?? (() => {});
      this.cells = [];
      root.textContent = '';
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const c = document.createElement(this.readOnly ? 'div' : 'button');
          c.className = 'px';
          if (!this.readOnly) {
            c.type = 'button';
            c.setAttribute('aria-label', `${y + 1}행 ${x + 1}열`);
            c.setAttribute('aria-pressed', 'false');
          }
          c.dataset.x = x;
          c.dataset.y = y;
          root.append(c);
          this.cells.push(c);
        }
      }
      if (!this.readOnly) this._bindPointer();
    }

    _bindPointer() {
      let paint = null; // 끌기 중 칠할 값(0/1)
      const cellAt = (e) => {
        const t = document.elementFromPoint(e.clientX, e.clientY);
        return t && t.classList?.contains('px') && this.root.contains(t) ? t : null;
      };
      const apply = (c) => {
        const x = Number(c.dataset.x), y = Number(c.dataset.y);
        if (getPixel(this.rows, x, y) === paint) return;
        setPixel(this.rows, x, y, paint);
        this._render();
        this.onChange(this.get());
      };
      this.root.addEventListener('pointerdown', (e) => {
        const c = cellAt(e);
        if (!c) return;
        e.preventDefault();
        this.root.setPointerCapture?.(e.pointerId);
        paint = getPixel(this.rows, Number(c.dataset.x), Number(c.dataset.y)) ? 0 : 1;
        apply(c);
      });
      this.root.addEventListener('pointermove', (e) => {
        if (paint == null) return;
        const c = cellAt(e);
        if (c) apply(c);
      });
      const end = () => { paint = null; };
      this.root.addEventListener('pointerup', end);
      this.root.addEventListener('pointercancel', end);
      // 키보드: Enter/Space로 한 칸 토글
      this.root.addEventListener('click', (e) => {
        if (e.detail !== 0) return;
        const c = e.target.closest('.px');
        if (!c) return;
        const x = Number(c.dataset.x), y = Number(c.dataset.y);
        setPixel(this.rows, x, y, !getPixel(this.rows, x, y));
        this._render();
        this.onChange(this.get());
      });
    }

    get() { return [...this.rows]; }

    set(rows, notify = false) {
      this.rows = rows.map((v) => v & 0xff);
      this._render();
      if (notify) this.onChange(this.get());
    }

    clear() { this.set([0, 0, 0, 0, 0, 0, 0, 0], true); }
    invert() { this.set(this.rows.map((v) => ~v & 0xff), true); }

    _render() {
      for (const c of this.cells) {
        const on = !!getPixel(this.rows, Number(c.dataset.x), Number(c.dataset.y));
        c.classList.toggle('on', on);
        if (!this.readOnly) c.setAttribute('aria-pressed', String(on));
      }
    }
  }
  return { getPixel, setPixel, PRESETS, MatrixEditor };
})();

// ---- ui-express.js ----
const __m_ui_express = (() => {
  // 표현: 제스처·노래·입모양·텍스트·부저, LED 매트릭스, 팔.
  const { CMD, EVT } = __m_protocol;
  const { GESTURES, SONGS, MOUTHS } = __m_names;
  const { MatrixEditor, PRESETS } = __m_matrix_editor;
  const { store } = __m_util;
  const TEXT_OK = /^[0-9A-Z :;<=>?@\[]*$/;

  function initExpress(ctx) {
    const { $, el, send, throttle } = ctx;

    // 제스처(서보 사용 → FALLEN/AVOID 때 꺼짐)
    for (const [id, ko, orig] of GESTURES) {
      $('#gestures').append(el('button', { class: 'cmd servo', title: `GESTURE ${id} · ${orig}`,
        onclick: () => send(CMD.GESTURE, [id]) }, ko, el('small', {}, `${id} · ${orig}`)));
    }
    // 노래(FALLEN 중에도 허용, AVOID 중엔 거부 → 로봇이 e 3으로 알려 준다)
    for (const [id, ko, orig] of SONGS) {
      $('#songs').append(el('button', { class: 'cmd', title: `SING ${id} · ${orig}`,
        onclick: () => send(CMD.SING, [id]) }, ko, el('small', {}, `${id} · ${orig}`)));
    }
    // 입모양
    for (const [id, ko, orig] of MOUTHS) {
      $('#mouths').append(el('button', { class: 'cmd', title: `MOUTH ${id} · ${orig}`,
        onclick: () => send(CMD.MOUTH, [id]) }, ko, el('small', {}, `${id} · ${orig}`)));
    }

    // 텍스트 스크롤
    const maxlen = CMD.TEXT.args[0].maxlen;
    $('#textIn').maxLength = maxlen;
    $('#textIn').addEventListener('input', () => {
      const i = $('#textIn');
      const pos = i.selectionStart;
      i.value = i.value.toUpperCase();
      i.setSelectionRange(pos, pos);
    });
    $('#textForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = $('#textIn').value.toUpperCase();
      if (!t.trim()) { ctx.toast('보낼 글자를 입력하세요.', 'warn'); return; }
      if (!TEXT_OK.test(t)) {
        ctx.toast('로봇이 표시할 수 없는 글자가 있습니다. 영문 대문자·숫자·공백과 : ; < = > ? @ [ 만 쓰세요(한글 불가).', 'warn');
        return;
      }
      send(CMD.TEXT, [t]);
    });

    // 부저
    $('#toneForm').addEventListener('submit', (e) => {
      e.preventDefault();
      send(CMD.TONE, [Number($('#toneFreq').value), Number($('#toneMs').value)]);
    });

    // LED 매트릭스
    const sendMatrix = (rows) => send(CMD.MATRIX, rows, { coalesce: 'matrix' });
    const liveSend = throttle((rows) => { if (ctx.robot.connected && !ctx.link.busy) sendMatrix(rows); }, 300);
    const showBytes = (rows) => {
      $('#mxBytes').textContent = 'r0~r7: ' + rows.map((v) => '0x' + v.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    };
    const editor = new MatrixEditor($('#matrix'), {
      onChange: (rows) => {
        showBytes(rows);
        store.set('matrix', rows);
        if ($('#mxLive').checked) liveSend(rows);
      },
    });
    const saved = store.get('matrix', null);
    editor.set(Array.isArray(saved) && saved.length === 8 ? saved : PRESETS[0][1]);
    showBytes(editor.get());
    for (const [i, [name]] of PRESETS.entries()) $('#mxPreset').append(el('option', { value: String(i) }, name));
    $('#mxPreset').addEventListener('change', () => {
      const i = $('#mxPreset').value;
      if (i === '') return;
      editor.set(PRESETS[Number(i)][1], true);
      $('#mxPreset').value = '';
    });
    $('#mxClear').addEventListener('click', () => editor.clear());
    $('#mxInvert').addEventListener('click', () => editor.invert());
    $('#mxSend').addEventListener('click', () => sendMatrix(editor.get()));

    // 팔: 슬라이더는 150ms 이상 쓰로틀, 마지막 값은 반드시 보냄
    const sendArms = throttle(() => {
      send(CMD.ARMS, [Number($('#armL').value), Number($('#armR').value)], { coalesce: 'arms' });
    }, 200);
    for (const [id, out] of [['armL', 'armLOut'], ['armR', 'armROut']]) {
      $('#' + id).addEventListener('input', () => {
        $('#' + out).textContent = $('#' + id).value + '°';
        sendArms();
      });
    }
    $('#armsHome').addEventListener('click', () => {
      $('#armL').value = 90; $('#armR').value = 90;
      $('#armLOut').textContent = '90°'; $('#armROut').textContent = '90°';
      send(CMD.ARMS, [90, 90], { coalesce: 'arms' });
    });
    // STOP·넘어짐 회복·home은 팔을 90°로 돌린다(behavior.md) → 화면도 맞춘다
    ctx.link.on('tx', (line) => {
      if (line[0] === CMD.STOP.token) resetArmsUi();
    });
    ctx.onMessage((m) => { if (m.name === 'EVENT' && m.fields.kind === EVT.RECOVER) resetArmsUi(); });
    // 로봇이 MOVE를 끝내면(STOP·자동 정지·감시·home) 펌웨어는 홈 자세로 가며 팔도 90°가 된다
    ctx.link.on('moveDone', resetArmsUi);
    function resetArmsUi() {
      $('#armL').value = 90; $('#armR').value = 90;
      $('#armLOut').textContent = '90°'; $('#armROut').textContent = '90°';
    }
  }
  return { initExpress };
})();

// ---- ui-calib.js ----
const __m_ui_calib = (() => {
  // 보정: 다리 트림(TRIM, save 0 = 미리보기 / 1 = EEPROM 저장)과 다리 서보 직접 각도(SERVO).
  // 트림 화면은 로봇이 보낸 TRIMS(c ...)로 초기화한다. 그 전에는 트림 버튼을 막는다:
  // 모르는 채로 보내면 저장된 YL −10을 0으로 덮어쓰기 때문이다.
  const { CMD } = __m_protocol;
  const LEGS = [
    ['yl', 'YL', '왼다리 (D2)'],
    ['yr', 'YR', '오른다리 (D3)'],
    ['rl', 'RL', '왼발목 (D4)'],
    ['rr', 'RR', '오른발목 (D5)'],
  ];

  function initCalib(ctx) {
    const { $, $$, el, send } = ctx;
    const trimSpec = Object.fromEntries(CMD.TRIM.args.map((a) => [a.name, a]));
    let known = false;      // TRIMS를 받았는가
    let saved = null;       // 연결 시 로봇에서 읽은 값(= EEPROM으로 간주) 또는 마지막 저장 값
    let current = [0, 0, 0, 0];

    // 트림 입력 만들기
    for (const [key, short, ko] of LEGS) {
      const a = trimSpec[key];
      const range = el('input', { type: 'range', min: a.min, max: a.max, value: 0, id: `trimR_${key}`, class: 'cmd servo trim-in', 'aria-label': `${ko} 트림` });
      const num = el('input', { type: 'number', min: a.min, max: a.max, value: 0, id: `trimN_${key}`, class: 'cmd servo trim-in', 'aria-label': `${ko} 트림 값` });
      const sync = (src, dst) => {
        let v = Math.round(Number(src.value));
        if (!Number.isFinite(v)) v = 0;
        v = Math.max(a.min, Math.min(a.max, v));
        dst.value = v;
        updateMarks();
        if ($('#trimLive').checked) livePreview();
      };
      range.addEventListener('input', () => sync(range, num));
      num.addEventListener('change', () => { sync(num, range); range.value = num.value; });
      $('#trims').append(el('label', { for: `trimN_${key}`, id: `trimL_${key}` }, `${short} `, el('span', { class: 'muted small' }, ko)), range, num);
    }

    const read = () => LEGS.map(([k]) => Number($(`#trimN_${k}`).value));
    const write = (vals) => LEGS.forEach(([k], i) => { $(`#trimN_${k}`).value = vals[i]; $(`#trimR_${k}`).value = vals[i]; });

    function updateMarks() {
      const v = read();
      LEGS.forEach(([k], i) => $(`#trimL_${k}`).classList.toggle('changed', !!saved && v[i] !== saved[i]));
      $('#trimNote').textContent = !known
        ? '로봇에서 현재 트림을 아직 받지 못했습니다(연결하면 자동으로 읽습니다).'
        : `저장된 값: YL ${saved[0]}, YR ${saved[1]}, RL ${saved[2]}, RR ${saved[3]} · 로봇에 적용 중: ${current.join(', ')}` +
          (v.some((x, i) => x !== saved[i]) ? ' · 노란 항목은 저장되지 않은 변경입니다' : '');
    }

    const livePreview = ctx.throttle(() => { if (known) send(CMD.TRIM, [...read(), 0], { coalesce: 'trim' }); }, 400);

    $('#trimPreview').addEventListener('click', () => send(CMD.TRIM, [...read(), 0], { coalesce: 'trim' }));
    $('#trimSave').addEventListener('click', async () => {
      const v = read();
      if (!window.confirm(`다리 트림을 로봇 EEPROM에 저장할까요?\n\nYL ${v[0]}, YR ${v[1]}, RL ${v[2]}, RR ${v[3]}\n(이전 저장값: ${saved ? saved.join(', ') : '모름'})`)) return;
      if (await send(CMD.TRIM, [...v, 1])) {
        saved = [...v];
        ctx.toast('트림을 EEPROM에 저장했습니다. 로봇을 다시 켜도 유지됩니다.');
        updateMarks();
      }
    });
    $('#trimRevert').addEventListener('click', () => {
      if (!saved) return;
      write(saved);
      send(CMD.TRIM, [...saved, 0], { coalesce: 'trim' });
      updateMarks();
    });

    ctx.onMessage((m) => {
      if (m.name !== 'TRIMS') return;
      const f = m.fields;
      current = [f.yl, f.yr, f.rl, f.rr];
      if (!known) {
        known = true;
        saved = [...current];
        write(current);
      }
      updateMarks();
      ctx.refresh();
    });
    ctx.link.on('status', (s) => {
      if (s !== 'connected') { known = false; saved = null; updateMarks(); ctx.refresh(); }
    });
    ctx.onRefresh(() => {
      if (!known) {
        for (const e of [...$$('.trim-in'), $('#trimPreview'), $('#trimSave'), $('#trimRevert')]) {
          e.disabled = true;
          e.title = '로봇의 현재 트림을 읽은 뒤에 쓸 수 있습니다';
        }
      }
    });
    updateMarks();

    // 다리 서보 직접 각도
    const servoSpec = CMD.SERVO.args;
    for (const [i, [key, short, ko]] of LEGS.entries()) {
      const a = servoSpec[i];
      const out = el('output', { id: `servoO_${key}` }, '90°');
      const r = el('input', { type: 'range', min: a.min, max: a.max, value: 90, id: `servo_${key}`, class: 'cmd servo' });
      r.addEventListener('input', () => { out.textContent = r.value + '°'; });
      $('#servos').append(el('label', {}, `${short} ${ko} `, out, r));
    }
    const servoVals = () => LEGS.map(([k]) => Number($(`#servo_${k}`).value));
    $('#servoSend').addEventListener('click', () => send(CMD.SERVO, servoVals(), { coalesce: 'servo' }));
    $('#servoHome').addEventListener('click', () => {
      LEGS.forEach(([k]) => { $(`#servo_${k}`).value = 90; $(`#servoO_${k}`).textContent = '90°'; });
      send(CMD.SERVO, [90, 90, 90, 90], { coalesce: 'servo' });
    });
  }
  return { initCalib };
})();

// ---- ui-demo.js ----
const __m_ui_demo = (() => {
  // 데모 로봇 조작 패널: 가상 로봇의 주변 세계(터치·기울기·장애물·소리·전파)를 바꾸고 내부 상태를 보여 준다.
  const { ST_NAME } = __m_protocol;
  const { STATE_KO, MOUTHS } = __m_names;
  const { MatrixEditor } = __m_matrix_editor;
  function initDemoPanel(ctx, demo) {
    const { $, el } = ctx;
    const w = demo.world;
    const view = new MatrixEditor($('#dmMatrix'), { readOnly: true });

    const touch = $('#dmTouch');
    const press = (on) => (e) => { e.preventDefault(); w.touch = on; touch.classList.toggle('active', on); };
    touch.addEventListener('pointerdown', press(true));
    touch.addEventListener('pointerup', press(false));
    touch.addEventListener('pointerleave', press(false));
    touch.addEventListener('pointercancel', press(false));

    $('#dmFall').addEventListener('click', () => { w.tilt = { pitch: 80, roll: 0 }; });
    $('#dmFallSide').addEventListener('click', () => { w.tilt = { pitch: 0, roll: 85 }; });
    $('#dmStand').addEventListener('click', () => { w.tilt = { pitch: 0, roll: 0 }; });
    $('#dmLoud').addEventListener('click', () => { w.loud = 300; setTimeout(() => { w.loud = 0; }, 300); });
    $('#dmDist').addEventListener('input', () => {
      w.distance = Number($('#dmDist').value);
      $('#dmDistOut').textContent = `${w.distance} cm${demo.hw.ultra ? '' : ' (초음파 없음 — 무시됨)'}`;
    });
    $('#dmRadio').addEventListener('change', () => {
      w.radioCut = $('#dmRadio').checked;
      ctx.toast(w.radioCut ? '전파 끊김 흉내: 이제 명령이 로봇에 닿지 않습니다. 이동 중이면 1.5초 뒤 로봇이 스스로 멈춥니다.' : '전파 복구');
    });
    $('#dmUltra').checked = demo.hw.ultra;
    $('#dmMpu').checked = demo.hw.mpu;
    const hwChange = () => {
      demo.hw.ultra = $('#dmUltra').checked;
      demo.hw.mpu = $('#dmMpu').checked;
      ctx.toast('센서 구성은 실물처럼 재부팅해야 적용됩니다. "재부팅"을 누르세요.');
    };
    $('#dmUltra').addEventListener('change', hwChange);
    $('#dmMpu').addEventListener('change', hwChange);
    $('#dmReboot').addEventListener('click', () => demo.reboot());

    demo.onView((v) => {
      if (v.matrix) view.set(v.matrix);
      else view.set([0, 0, 0, 0, 0, 0, 0, 0]);
      const mouth = v.mouth != null ? MOUTHS.find((m) => m[0] === v.mouth) : null;
      const rows = [
        ['상태', `${STATE_KO[ST_NAME[v.state]] ?? v.state}${v.action ? ' · ' + v.action : ''}`],
        ['표시', v.matrix ? '사용자 비트맵' : mouth ? `입모양 ${mouth[0]} ${mouth[1]}` : '—'],
        ['팔', `왼 ${v.arms[0]}° / 오른 ${v.arms[1]}°`],
        ['다리', v.legs.join(', ')],
        ['트림', v.trims.join(', ')],
        ['센서', `${v.sensors & 1 ? 'MPU ' : ''}${v.sensors & 2 ? '초음파' : ''}` || '없음'],
        ['자동 반응', String(v.auto)],
      ];
      const dl = $('#dmInfo');
      dl.textContent = '';
      for (const [k, val] of rows) dl.append(el('dt', {}, k), el('dd', {}, val));
    });
    $('#cardDemo').hidden = false;
    demo._emitView();
    $('#dmDist').dispatchEvent(new Event('input'));
  }
  return { initDemoPanel };
})();

// ---- ui-pins.js ----
const __m_ui_pins = (() => {
  // 핀 연결 카드: Nano 핀헤더 그림·범례·표를 PINMAP 하나에서 만든다.
  // 근거: otto-hardware 스킬 핀 표(references/pinmap.md), firmware/otto_fat/config.h, 2026-11-24 실물 진단.
  // 핀을 바꾸면 config.h와 이 표를 함께 고친다.
  const { $ } = __m_util;
  const PINMAP = [
    { id: 'legs', func: '다리 서보', color: '#4f8ef7', pins: [
      { p: 'D2', t: '왼다리 (YL)', note: '트림 YL −10 (OTTO2 EEPROM)' },
      { p: 'D3', t: '오른다리 (YR)' },
      { p: 'D4', t: '왼발목 (RL)' },
      { p: 'D5', t: '오른발목 (RR)' },
    ] },
    { id: 'arms', func: '팔 서보', color: '#22b8cf', pins: [
      { p: 'D6', t: '왼팔' },
      { p: 'D7', t: '오른팔', note: '좌우 대칭 장착 → 펌웨어에서 방향 반전' },
    ] },
    { id: 'us', func: '초음파 HC-SR04', color: '#f59f00', pins: [
      { p: 'D8', t: 'TRIG' },
      { p: 'D9', t: 'ECHO', note: 'OTTO2 로봇은 무응답(센서 점검 필요)' },
    ] },
    { id: 'ble', func: 'BLE 모듈 (OTTO2/OTTO3)', color: '#9775fa', pins: [
      { p: 'D11', t: '모듈 TX → 아두이노 RX', note: 'SoftwareSerial 9600bps' },
      { p: 'D12', t: '아두이노 TX → 모듈 RX', note: '3.3V 로직이면 분압(1k/2k) 권장' },
    ] },
    { id: 'buz', func: '부저', color: '#e64980', pins: [
      { p: 'D13', t: '수동 부저 +', note: '보드 내장 LED와 공유' },
    ] },
    { id: 'touch', func: '터치 센서', color: '#40c057', pins: [
      { p: 'A0', t: 'SIG', note: '디지털, 눌림 = HIGH' },
    ] },
    { id: 'mtx', func: 'LED 매트릭스 MAX7219', color: '#fa5252', pins: [
      { p: 'A1', t: 'CLK' },
      { p: 'A2', t: 'CS' },
      { p: 'A3', t: 'DIN', note: 'Orientation 1' },
    ] },
    { id: 'imu', func: 'MPU6050 기울기', color: '#fd7e14', pins: [
      { p: 'A4', t: 'SDA', note: 'I2C 0x68' },
      { p: 'A5', t: 'SCL' },
    ] },
    { id: 'sound', func: '사운드 센서 (선택)', color: '#94d82d', pins: [
      { p: 'A6', t: 'OUT', note: '아날로그 전용' },
    ] },
    { id: 'usb', func: 'USB 시리얼', color: '#868e96', pins: [
      { p: 'D0', t: 'RX', note: '업로드·디버그 전용' },
      { p: 'D1', t: 'TX' },
    ] },
  ];

  // Nano 윗면, USB가 왼쪽. 위 줄·아래 줄 핀 순서(실제 보드 배열)
  const TOP = ['D13', '3V3', 'REF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST', 'GND', 'VIN'];
  const BOT = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND', 'RST', 'D0', 'D1'];
  const BOT_LABEL = { D0: 'RX0', D1: 'TX1' };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function drawNano(users) {
    const W = 640, x0 = 120, step = 31;
    let s = `<rect x="70" y="40" width="${W - 90}" height="170" rx="12" fill="#123a5a" stroke="#2a5d86"/>`
      + `<rect x="20" y="100" width="64" height="50" rx="5" fill="#9aa3ad"/>`
      + `<text x="52" y="130" text-anchor="middle" font-size="11" fill="#222" font-family="Segoe UI,sans-serif">USB</text>`
      + `<text x="355" y="122" text-anchor="middle" fill="#7fb2d9" font-size="18" font-weight="700" font-family="Segoe UI,sans-serif">ARDUINO NANO + OTTO 쉴드</text>`
      + `<text x="355" y="142" text-anchor="middle" fill="#5d8db5" font-size="11" font-family="Segoe UI,sans-serif">사용 중인 핀은 색으로 표시 · 핀에 마우스를 올리면 용도</text>`;
    const box = (key, label, x, y, below) => {
      const u = users[key];
      const fill = u ? u.e.color : '#0d1118';
      const title = u ? `${u.e.func} ${u.p.t}` : '미사용';
      const ty = below ? y + 36 : y - 9;
      return `<g><title>${esc(label)}: ${esc(title)}</title>`
        + `<rect x="${x}" y="${y}" width="24" height="24" rx="3" fill="${fill}" stroke="${u ? '#fff' : '#3a4a5c'}" stroke-width="1.2"/>`
        + `<circle cx="${x + 12}" cy="${y + 12}" r="4" fill="#000" opacity=".55"/>`
        + `<text x="${x + 12}" y="${ty}" text-anchor="middle" font-size="10" fill="${u ? '#e8eaf6' : '#7a8aa0'}" font-family="Consolas,monospace">${esc(label)}</text></g>`;
    };
    TOP.forEach((k, i) => { s += box(k, k, x0 + i * step, 54, false); });
    BOT.forEach((k, i) => { s += box(k, BOT_LABEL[k] || k, x0 + i * step, 172, true); });
    return s;
  }

  function initPins() {
    const users = {};
    for (const e of PINMAP) for (const p of e.pins) users[p.p] = { e, p };
    $('#nanoSvg').innerHTML = drawNano(users);
    $('#pinLegend').innerHTML = PINMAP.map((e) =>
      `<span><span class="swatch" style="background:${e.color}"></span>${esc(e.func)}</span>`).join('');
    $('#pinBody').innerHTML = PINMAP.map((e) => e.pins.map((p, i) =>
      `<tr>${i === 0 ? `<td rowspan="${e.pins.length}"><span class="swatch" style="background:${e.color}"></span>${esc(e.func)}</td>` : ''}`
      + `<td>${esc(p.t)}</td><td class="pn">${p.p}</td><td class="muted">${esc(p.note || '')}</td></tr>`).join('')).join('');
  }
  return { PINMAP, initPins };
})();

// ---- ui-twin.js ----
const __m_ui_twin = (() => {
  // 3D 형상(디지털 트윈). 웹이 보낸 명령(link 'tx')과 로봇이 보낸 텔레메트리·이벤트로 움직인다.
  // three.js는 vendor/three-r160-bundle.js(일반 스크립트, window.SMARS_THREE — SMARS 트윈과 같은 파일)를 쓴다.
  // 인터넷이 없어도, file://로 열어도 동작한다. 파일이 없으면 카드에 안내만 보이고 나머지 화면은 그대로 동작한다.
  //
  // 표시는 "근사"다: 로봇은 서보 각도를 보내지 않으므로 다리 움직임은 Otto 라이브러리(ref/OttoDIYLib, Otto.cpp)의
  // 진동자 값(진폭 A, 중심 O, 위상차)으로 웹에서 계산한다. 기울기·거리·터치·상태는 텔레메트리 실측값이다.
  // 좌표: 1 단위 = 1 cm, 위 = +Y, 로봇 정면 = +Z(처음 시점에서 화면 쪽), 로봇의 왼쪽 = +X.
  const { ST, EVT } = __m_protocol;
  const { getPixel } = __m_matrix_editor;
  // Otto_mouths.h Mouthtable (6x5 비트, 위 행부터, 각 행 왼쪽 → 오른쪽). 입모양 번호 0~30
  const MOUTHS = [
    0b00001100010010010010010010001100, 0b00000100001100000100000100001110, 0b00001100010010000100001000011110,
    0b00001100010010000100010010001100, 0b00010010010010011110000010000010, 0b00011110010000011100000010011100,
    0b00000100001000011100010010001100, 0b00011110000010000100001000010000, 0b00001100010010001100010010001100,
    0b00001100010010001110000010001110, 0b00000000100001010010001100000000, 0b00000000111111010010001100000000,
    0b00000000111111011110000000000000, 0b00010010101101100001010010001100, 0b00001100010010100001010010001100,
    0b00000000000000001100001100000000, 0b00111111001001001001000110000000, 0b00111111101101101101010010000000,
    0b00111111101101010010000000000000, 0b00000000000000111111000000000000, 0b00000000001000010101100010000000,
    0b00100000010000001000000100000010, 0b00000000001100010010100001000000, 0b00000000001100010010111111000000,
    0b00000000001100011110110011000000, 0b00000001000010010100001000000000, 0b00100001010010001100010010100001,
    0b00001100010010000100000100000100, 0b00000100001000011100001000010000, 0b00000000100001101101010010000000,
    0b00000000011110100001100001000000,
  ];
  function mouthPixels(id) {
    const v = MOUTHS[id] ?? 0;
    const px = [];
    for (let r = 0; r < 5; r++) {          // r = 0 → 맨 위 행(행렬의 y 3)
      for (let k = 0; k < 6; k++) {
        const bit = 29 - (r * 6 + k);
        if ((v >>> bit) & 1) px.push([1 + k, 3 + r]);
      }
    }
    return px;
  }

  // MOVE 번호 → 진동자 [A(yl,yr,rl,rr), O, phase(도)], 주기 비율, 이동(앞 + cm/주기), 회전(도/주기). h = size
  function gait(id, h) {
    switch (id) {
      case 1: return { A: [30, 30, 20, 20], O: [0, 0, 4, -4], P: [0, 0, -90, -90], fwd: 4 };
      case 2: return { A: [30, 30, 20, 20], O: [0, 0, 4, -4], P: [0, 0, 90, 90], fwd: -4 };
      case 3: return { A: [30, 10, 20, 20], O: [0, 0, 4, -4], P: [0, 0, -90, -90], yaw: 18 };
      case 4: return { A: [10, 30, 20, 20], O: [0, 0, 4, -4], P: [0, 0, -90, -90], yaw: -18 };
      case 5: return { A: [0, 0, h, h], O: [0, 0, h, -h], P: [0, 0, -90, 90] };
      case 6: return { A: [0, 0, h, h], O: [0, 0, h / 2 + 2, -h / 2 - 2], P: [0, 0, 0, -60], fwd: 0, side: 1 };
      case 7: return { A: [0, 0, h, h], O: [0, 0, h / 2 + 2, -h / 2 - 2], P: [0, 0, 0, 60], side: -1 };
      case 8: return { A: [0, 0, h, h], O: [0, 0, h / 2, -h / 2], P: [0, 0, 0, 0] };
      case 9: return { A: [25, 25, h, h], O: [0, 0, h / 2 + 4, -h / 2 - 4], P: [90, 90, 0, -60], fwd: 2 };
      case 10: return { A: [25, 25, h, h], O: [0, 0, h / 2 + 4, -h / 2 - 4], P: [90, 90, 0, 60], fwd: -2 };
      case 11: return { A: [0, 0, 0, 0], O: [0, 0, 0, 0], P: [0, 0, 0, 0], jump: 1.5 };
      case 12: return { A: [12, 12, h, h], O: [0, 0, h - 10, -h + 10], P: [0, 180, -90, 90], fwd: 2 };
      case 13: return { A: [12, 12, h, h], O: [0, 0, h - 10, -h + 10], P: [0, 180, 90, -90], fwd: -2 };
      case 14: return { A: [0, 0, h, h], O: [0, 0, h, -h], P: [0, 0, 0, 0] };
      case 15: return { A: [0, 0, 35, 0], O: [0, 0, 35, 0], P: [0, 0, 0, 0] };          // bend: 한쪽 발목을 크게
      case 16: return { A: [0, 0, 0, 35], O: [0, 0, 0, -35], P: [0, 0, 0, 0] };
      case 17: return { A: [0, 0, 20, 10], O: [0, 0, 40, 10], P: [0, 0, 0, 0], fast: 3 };  // shakeLeg
      case 18: return { A: [0, 0, 10, 20], O: [0, 0, -10, -40], P: [0, 0, 0, 0], fast: 3 };
      case 19: return { A: [h, h, 0, 0], O: [0, 0, 0, 0], P: [-90, 90, 0, 0] };
      case 20: return { A: [h, h, h, h], O: [0, 0, h + 4, -h + 4], P: [-90, 90, -90, 90], jump: 0.6 };
      default: return null;
    }
  }

  function initTwin(ctx) {
    const { $, link } = ctx;
    const host = $('#twin');
    const note = $('#twinNote');
    const LIB = window.SMARS_THREE;
    if (!host) return;
    if (!LIB) {
      host.classList.add('twin-missing');
      host.textContent = '3D 형상을 그릴 수 없습니다: web/vendor/three-r160-bundle.js 파일이 없습니다. 다른 기능은 그대로 쓸 수 있습니다.';
      return;
    }
    const { THREE, OrbitControls } = LIB;

    // ---------------- 장면 ----------------
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      host.classList.add('twin-missing');
      host.textContent = `이 브라우저에서 3D(WebGL)를 쓸 수 없습니다: ${e.message}`;
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
    const HOME_CAM = new THREE.Vector3(17, 16, 30);
    const TARGET = new THREE.Vector3(0, 8, 0);
    camera.position.copy(HOME_CAM);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(TARGET);
    controls.enableDamping = true;
    controls.minDistance = 14;
    controls.maxDistance = 90;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(12, 30, 18);
    scene.add(sun);

    // 바닥: 이동하면 격자가 반대로 흘러 이동 방향을 보여 준다
    const world = new THREE.Group();
    scene.add(world);
    const grid = new THREE.GridHelper(200, 40, 0x5c6b80, 0x334155);
    grid.material.transparent = true; grid.material.opacity = 0.55;
    world.add(grid);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
    scene.add(shadow);

    const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...o });
    const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    const WHITE = mat(0xf1f3f5), BLUE = mat(0x3b82f6), DARK = mat(0x2b2f36), SILVER = mat(0xc0c6ce, { metalness: 0.4 });

    // bot: 몸 전체(기울기·넘어짐), yawG: 회전 동작, bob: 점프·몸 흔들림
    const bot = new THREE.Group();
    const bob = new THREE.Group();
    bot.add(bob);
    scene.add(bot);

    // 다리: 엉덩이(YL/YR, Y축 회전) → 다리 → 발목(RL/RR, Z축 회전) → 발
    const legs = [];
    for (const side of [1, -1]) {             // 1 = 왼쪽(+X), -1 = 오른쪽
      const hip = new THREE.Group();
      hip.position.set(2.4 * side, 4.8, 0);
      const leg = box(2.6, 3.4, 2.8, WHITE); leg.position.y = -1.9;
      const servo = box(2.0, 1.2, 2.2, BLUE); servo.position.y = -0.4;
      hip.add(leg, servo);
      const ankle = new THREE.Group();
      ankle.position.set(0, -3.7, 0);
      const foot = box(3.8, 1.0, 5.6, WHITE); foot.position.set(0.5 * side, -0.55, 0.6);
      const sole = box(3.8, 0.15, 5.6, DARK); sole.position.set(0.5 * side, -1.12, 0.6);
      ankle.add(foot, sole);
      hip.add(ankle);
      bob.add(hip);
      legs.push({ hip, ankle, side });
    }

    // 몸통 + 팔
    const body = box(9.2, 5.6, 7.6, WHITE); body.position.y = 7.6;
    const belt = box(9.3, 0.5, 7.7, BLUE); belt.position.y = 5.0;
    bob.add(body, belt);
    const arms = [];
    for (const side of [1, -1]) {
      const sh = new THREE.Group();
      sh.position.set(5.05 * side, 9.4, 0);
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16), BLUE);
      horn.rotation.z = Math.PI / 2;
      const arm = box(1.1, 5.0, 2.2, WHITE); arm.position.set(0.55 * side, -2.4, 0);
      const hand = box(1.3, 1.2, 2.4, BLUE); hand.position.set(0.55 * side, -5.0, 0);
      sh.add(horn, arm, hand);
      bob.add(sh);
      arms.push({ sh, side });
    }

    // 머리: 초음파 눈, 8x8 LED 매트릭스, 위쪽 터치 센서
    const head = new THREE.Group();
    head.position.y = 10.4;
    bob.add(head);
    const skull = box(9.6, 6.8, 8.0, WHITE); skull.position.y = 3.4;
    head.add(skull);
    const FRONT = 4.02;
    for (const s of [1, -1]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.5, 24), SILVER);
      ring.rotation.x = Math.PI / 2; ring.position.set(1.95 * s, 4.9, FRONT + 0.2);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.52, 24), mat(0x22262c));
      mesh.rotation.x = Math.PI / 2; mesh.position.set(1.95 * s, 4.9, FRONT + 0.22);
      head.add(ring, mesh);
    }
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = ledCanvas.height = 128;
    const ledCtx = ledCanvas.getContext('2d');
    const ledTex = new THREE.CanvasTexture(ledCanvas);
    ledTex.colorSpace = THREE.SRGBColorSpace;
    const ledPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: ledTex }));
    ledPanel.position.set(0, 1.95, FRONT + 0.1);
    const ledFrame = box(4.0, 4.0, 0.2, DARK); ledFrame.position.set(0, 1.95, FRONT - 0.05);
    head.add(ledFrame, ledPanel);
    const touchMat = mat(0x4b5563, { emissive: 0x000000 });
    const touchPad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.35, 24), touchMat);
    touchPad.position.set(0, 6.95, 0);
    head.add(touchPad);

    // 초음파 거리 콘(정면)
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, depthWrite: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), coneMat);
    cone.rotation.x = -Math.PI / 2;
    const coneHolder = new THREE.Group();
    coneHolder.position.set(0, 4.9, FRONT + 0.3);
    coneHolder.add(cone);
    head.add(coneHolder);
    const wall = box(14, 10, 0.4, new THREE.MeshStandardMaterial({ color: 0xf97316, transparent: true, opacity: 0.35 }));
    wall.visible = false;
    coneHolder.add(wall);

    // ---------------- 상태 ----------------
    const S = {
      legs: [90, 90, 90, 90],      // YL YR RL RR (90 = 홈)
      legsStatic: null,            // SERVO(G)로 직접 준 각도
      arms: [90, 90],              // 명령 각도(↑ = 들기, 90 = 내림)
      armsTarget: [90, 90],
      move: null,                  // { id, period, size, t0 }
      gesture: null,               // { id, t0, dur }
      pitch: 0, roll: 0, hasTilt: false,
      dist: null, touch: 0, touchFlash: 0,
      state: ST.IDLE,
      face: { kind: 'mouth', id: 10 },   // mouth | matrix | text
      yaw: 0, gx: 0, gz: 0,
    };

    function drawLed(time) {
      const c = ledCtx, W = 128, cell = W / 8;
      c.fillStyle = '#0b0d12'; c.fillRect(0, 0, W, W);
      const on = new Set();
      const f = S.face;
      if (f.kind === 'mouth') for (const [x, y] of mouthPixels(f.id)) on.add(y * 8 + x);
      else if (f.kind === 'matrix') { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (getPixel(f.rows, x, y)) on.add(y * 8 + x); }
      else if (f.kind === 'text') {
        const cols = f.cols, off = Math.floor((time - f.t0) / 90) % (cols.length + 8);
        for (let x = 0; x < 8; x++) { const col = cols[off - 8 + x]; if (col) for (let y = 0; y < 8; y++) if (col & (1 << y)) on.add(y * 8 + x); }
      }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const lit = on.has(y * 8 + x);
        c.beginPath();
        c.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.38, 0, Math.PI * 2);
        c.fillStyle = lit ? '#ff4d4d' : '#2a2f3a';
        c.fill();
      }
      ledTex.needsUpdate = true;
    }
    function textColumns(text) {
      const cv = document.createElement('canvas');
      const w = Math.max(8, text.length * 6 + 2);
      cv.width = w; cv.height = 8;
      const c = cv.getContext('2d');
      c.font = 'bold 8px monospace'; c.textBaseline = 'top'; c.fillStyle = '#fff';
      c.fillText(text, 0, 0);
      const d = c.getImageData(0, 0, w, 8).data;
      const cols = [];
      for (let x = 0; x < w; x++) { let m = 0; for (let y = 0; y < 8; y++) if (d[(y * w + x) * 4 + 3] > 110) m |= 1 << y; cols.push(m); }
      return cols;
    }
    let faceKey = '';
    const setFace = (f) => { S.face = f; faceKey = ''; };

    // ---------------- 명령(웹이 보낸 줄) ----------------
    function goHome() {
      S.move = null; S.gesture = null; S.legsStatic = null;
      S.armsTarget = [90, 90];
    }
    link.on('tx', (line) => {
      const p = line.trim().split(/\s+/);
      const t = p[0], v = p.slice(1).map(Number);
      switch (t) {
        case 'S': goHome(); break;
        case 'M':
          if (!v[0]) { goHome(); break; }
          S.legsStatic = null; S.gesture = null;
          if (!S.move || S.move.id !== v[0]) S.move = { id: v[0], period: v[1] || 1000, size: v[2] || 15, t0: performance.now() };
          else { S.move.period = v[1] || S.move.period; S.move.size = v[2] || S.move.size; }
          break;
        case 'H': S.move = null; S.gesture = { id: v[0], t0: performance.now(), dur: 2600 }; break;
        case 'A': S.armsTarget = [v[0], v[1]]; break;
        case 'G': S.move = null; S.legsStatic = [v[0], v[1], v[2], v[3]]; break;
        case 'L': setFace({ kind: 'mouth', id: v[0] }); break;
        case 'X': setFace({ kind: 'matrix', rows: v.slice(0, 8) }); break;
        case 'W': { const text = line.trim().slice(2); setFace({ kind: 'text', cols: textColumns(text), t0: performance.now() }); break; }
        default: break;
      }
    });
    link.on('autoStop', () => goHome());
    link.on('status', (s) => {
      if (s !== 'connected') { goHome(); S.hasTilt = false; S.dist = null; S.touch = 0; S.state = ST.IDLE; }
      updateNote();
    });
    ctx.onMessage((msg) => {
      const f = msg.fields;
      if (msg.name === 'TELEMETRY') {
        S.state = f.state;
        const mpu = ctx.robot.sensors == null || (ctx.robot.sensors & 1);
        S.hasTilt = !!mpu; S.pitch = f.pitch; S.roll = f.roll;
        const ultra = ctx.robot.sensors == null || (ctx.robot.sensors & 2);
        S.dist = ultra && f.dist_cm > 0 ? f.dist_cm : null;
        S.touch = f.touch;
        if (S.state !== ST.MOVING && S.state !== ST.ACTION && S.move && !link.hold) S.move = null;
        updateNote();
      }
      if (msg.name === 'EVENT') {
        if (f.kind === EVT.TOUCH) S.touchFlash = performance.now();
        if (f.kind === EVT.FALL) { S.state = ST.FALLEN; goHome(); }
        if (f.kind === EVT.RECOVER) S.state = ST.IDLE;
        updateNote();
      }
      if (msg.name === 'DONE' && S.gesture) S.gesture.dur = Math.min(S.gesture.dur, performance.now() - S.gesture.t0 + 300);
    });

    function updateNote() {
      if (!note) return;
      const parts = [];
      parts.push(ctx.robot.connected ? '연결됨 — 보낸 명령과 센서 값으로 움직입니다' : '연결 안 됨 — 연결하면(데모 로봇 포함) 명령·센서에 따라 움직입니다');
      if (S.hasTilt) parts.push(`기울기 앞뒤 ${S.pitch}° · 좌우 ${S.roll}°`);
      if (S.dist != null) parts.push(`거리 ${S.dist} cm`);
      if (S.state === ST.FALLEN) parts.push('넘어짐');
      note.textContent = parts.join(' · ');
    }
    updateNote();

    // ---------------- 애니메이션 ----------------
    const rad = THREE.MathUtils.degToRad;
    const lerp = (a, b, k) => a + (b - a) * k;
    let last = performance.now();
    let tiltX = 0, tiltZ = 0;

    function gestureArms(g, t) {
      const k = t / 1000, s = Math.sin(k * Math.PI * 4);
      switch (g.id) {
        case 1: case 2: return [130 + 30 * s, 130 - 30 * s];
        case 3: return [70, 70];
        case 4: return [80, 80];
        case 7: case 12: return [175, 175];
        case 8: case 9: return [100 + 25 * Math.sin(k * 40), 100 - 25 * Math.sin(k * 40)];
        case 10: return [150, 150];
        case 11: return [90, 160 + 20 * Math.sin(k * 12)];
        case 13: return [60, 60];
        default: return [110 + 20 * s, 110 + 20 * s];
      }
    }

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      let legsCmd = [90, 90, 90, 90];
      let lift = 0, wob = 0;
      let armT = S.armsTarget;

      if (S.move) {
        const g = gait(S.move.id, S.move.size);
        if (g) {
          const T = S.move.period / (g.fast || 1);
          const ph = ((now - S.move.t0) / T) * Math.PI * 2;
          for (let i = 0; i < 4; i++) legsCmd[i] = 90 + g.O[i] + g.A[i] * Math.sin(ph + rad(g.P[i]));
          if (g.jump) lift = Math.max(0, Math.sin(ph)) * g.jump;
          const perSec = 1000 / S.move.period;
          if (g.fwd) { const d = g.fwd * perSec * dt; S.gz -= Math.cos(S.yaw) * d; S.gx -= Math.sin(S.yaw) * d; }
          if (g.side) { const d = 2 * g.side * perSec * dt; S.gx -= Math.cos(S.yaw) * d; S.gz += Math.sin(S.yaw) * d; }
          if (g.yaw) S.yaw += rad(g.yaw) * perSec * dt;
          if (S.move.id === 20) S.yaw += rad(30) * perSec * dt;
        }
      } else if (S.gesture) {
        const t = now - S.gesture.t0;
        if (t > S.gesture.dur) S.gesture = null;
        else {
          armT = gestureArms(S.gesture, t);
          const k = t / 1000;
          if (S.gesture.id === 1 || S.gesture.id === 2) lift = Math.abs(Math.sin(k * Math.PI * 3)) * 0.8;
          if (S.gesture.id === 5 || S.gesture.id === 8 || S.gesture.id === 9) wob = Math.sin(k * 30) * 4;
          if (S.gesture.id === 6) wob = Math.sin(k * 6) * 8;
          if (S.gesture.id === 10) S.yaw += rad(120) * dt;
          legsCmd[2] = 90 + 8 * Math.sin(k * 8); legsCmd[3] = 90 - 8 * Math.sin(k * 8);
        }
      } else if (S.legsStatic) {
        legsCmd = S.legsStatic.slice();
      }

      // 서보처럼 따라가게(부드럽게)
      for (let i = 0; i < 4; i++) S.legs[i] = lerp(S.legs[i], legsCmd[i], Math.min(1, dt * 14));
      for (let i = 0; i < 2; i++) S.arms[i] = lerp(S.arms[i], armT[i], Math.min(1, dt * 8));

      // 다리: 엉덩이 = Y축(왼쪽 서보 그대로, 오른쪽은 대칭), 발목 = Z축
      legs[0].hip.rotation.y = rad(S.legs[0] - 90);
      legs[1].hip.rotation.y = rad(S.legs[1] - 90);
      legs[0].ankle.rotation.z = rad(S.legs[2] - 90);
      legs[1].ankle.rotation.z = rad(S.legs[3] - 90);
      // 팔: 명령 각도 ↑ = 들기(firmware ARM_DIR 반영 뒤 의미), 90 = 내림. 옆으로 드는 모습으로 표시(근사)
      arms[0].sh.rotation.z = rad(S.arms[0] - 90);
      arms[1].sh.rotation.z = -rad(S.arms[1] - 90);

      // 발목이 기울면 몸이 들린다(근사): 바깥쪽 발날로 서는 만큼
      const lean = (Math.abs(S.legs[2] - 90) + Math.abs(S.legs[3] - 90)) / 2;
      bob.position.y = lift + Math.sin(rad(lean)) * 1.2;
      bob.rotation.z = rad(((S.legs[2] - 90) + (S.legs[3] - 90)) * -0.15);
      bob.rotation.y = rad(wob);

      // 몸 전체: 기울기(실측) 또는 넘어짐
      let tx = 0, tz = 0;
      if (S.hasTilt) { tx = rad(Math.max(-90, Math.min(90, S.pitch))); tz = -rad(Math.max(-90, Math.min(90, S.roll))); }
      else if (S.state === ST.FALLEN) tx = rad(80);
      tiltX = lerp(tiltX, tx, Math.min(1, dt * 6)); tiltZ = lerp(tiltZ, tz, Math.min(1, dt * 6));
      bot.rotation.set(tiltX, S.yaw, tiltZ, 'YXZ');

      // 바닥 흐름(로봇은 제자리, 세상이 반대로 움직인다)
      const cell = 5;
      grid.position.x = ((S.gx % cell) + cell) % cell;
      grid.position.z = ((S.gz % cell) + cell) % cell;

      // 거리 콘
      if (S.dist != null) {
        const L = Math.min(120, S.dist);
        cone.scale.set(Math.tan(rad(15)) * L, L, Math.tan(rad(15)) * L);
        cone.position.z = L / 2;
        coneMat.color.set(S.dist <= 10 ? 0xef4444 : 0x38bdf8);
        coneMat.opacity = S.dist <= 10 ? 0.3 : 0.16;
        cone.visible = true;
        wall.visible = S.dist < 120; wall.position.z = L;
      } else { cone.visible = false; wall.visible = false; }

      // 터치
      const touched = S.touch || now - S.touchFlash < 700;
      touchMat.color.set(touched ? 0x22c55e : 0x4b5563);
      touchMat.emissive.set(touched ? 0x166534 : 0x000000);

      // LED
      const key = S.face.kind === 'text' ? 't' + Math.floor((now - S.face.t0) / 90) : JSON.stringify(S.face);
      if (key !== faceKey) { faceKey = key; drawLed(now); }

      controls.update();
      renderer.render(scene, camera);
    }

    // 보이는 동안만 그린다(배터리·CPU 절약)
    let visible = true, raf = 0;
    const loop = (t) => { raf = 0; if (!visible || document.hidden) return; frame(t); raf = requestAnimationFrame(loop); };
    const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); kick(); }).observe(host);
    document.addEventListener('visibilitychange', kick);

    function resize() {
      const w = host.clientWidth || 300, h = host.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    new ResizeObserver(resize).observe(host);
    resize();
    drawLed(performance.now());
    kick();

    $('#twinReset')?.addEventListener('click', () => {
      camera.position.copy(HOME_CAM); controls.target.copy(TARGET); controls.update();
      S.yaw = 0; S.gx = 0; S.gz = 0;
    });
    return { state: S };
  }
  return { initTwin };
})();

// ---- layout.js ----
const __m_layout = (() => {
  // 카드 블록 배치(메이슨리). 같은 줄의 카드를 같은 높이로 늘이지 않고, 각 카드를 자기 높이만큼만 차지하게 해
  // 짧은 카드 여러 개가 긴 카드 하나 옆에 쌓이도록 한다. 순서는 왼쪽 → 오른쪽을 유지하고, 빈칸은 뒤 카드로 채운다(dense).
  // CSS: .grid.masonry { grid-auto-rows: ROW px; row-gap: 0 } — 카드마다 grid-row-end: span N 을 계산해 넣는다.
  const ROW = 4;    // px, style.css .grid.masonry grid-auto-rows 와 같게
  const GAP = 14;   // px, 카드 사이 세로 간격(= 가로 간격)

  function initMasonry(grid) {
    if (!grid || typeof ResizeObserver === 'undefined') return;
    grid.classList.add('masonry');
    const cards = () => [...grid.children].filter((c) => c.classList.contains('card'));
    let pending = 0;
    function layout() {
      pending = 0;
      for (const c of cards()) {
        if (c.hidden) { c.style.gridRowEnd = ''; continue; }
        const h = c.getBoundingClientRect().height;
        c.style.gridRowEnd = `span ${Math.max(1, Math.ceil((h + GAP) / ROW))}`;
      }
    }
    const schedule = () => { if (!pending) pending = requestAnimationFrame(layout); };
    const ro = new ResizeObserver(schedule);
    for (const c of cards()) ro.observe(c);
    ro.observe(grid);
    // 데모 패널처럼 hidden 이 바뀌는 카드
    new MutationObserver(schedule).observe(grid, { subtree: false, childList: true, attributes: true, attributeFilter: ['hidden'] });
    for (const c of cards()) new MutationObserver(schedule).observe(c, { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('load', schedule);
    layout();
  }
  return { initMasonry };
})();

// ---- app.js ----
const __m_app = (() => {
  // UI 상태와 이벤트 연결. 통신은 link.js(→ encode/parseLine)만 거친다.
  const { CMD, PROTO_VERSION, ST, ST_NAME, ERR_NAME, EVT, EVT_NAME, MSG, cmdNameFromCode } = __m_protocol;
  const { Link } = __m_link;
  const { BleTransport, bleSupported } = __m_ble_transport;
  const { SerialTransport, serialSupported } = __m_serial_transport;
  const { DemoRobot } = __m_demo_robot;
  const { MOVES, STATE_KO, EVENT_KO, ERR_HELP } = __m_names;
  const { $, $$, el, throttle, store } = __m_util;
  const { initSensors } = __m_ui_sensors;
  const { initExpress } = __m_ui_express;
  const { initCalib } = __m_ui_calib;
  const { initDemoPanel } = __m_ui_demo;
  const { initPins } = __m_ui_pins;
  const { initTwin } = __m_ui_twin;
  const { initMasonry } = __m_layout;
  const link = new Link();
  const transports = { ble: null, serial: null, demo: null };
  let currentKind = null;
  const msgHandlers = [];
  const refreshHooks = [];
  const FORWARD_IDS = new Set([1, 9, 12]);

  const robot = {
    connected: false,
    state: ST.IDLE,
    sensors: null, // INFO.sensors 비트 (1 MPU, 2 초음파)
    auto: null,
    proto: null,
    fwBuild: null,
    lastEvent: null,
  };

  // ---------------- 공용 컨텍스트 (ui-*.js 모듈이 사용) ----------------
  const ctx = {
    link, robot, $, $$, el, throttle,
    onMessage(fn) { msgHandlers.push(fn); },
    send, toast, banner, clearBanner,
    refresh: refreshControls,
    onRefresh(fn) { refreshHooks.push(fn); },
    setRobotState,
  };

  /** 명령 송신. 오류는 토스트로 보여주고 false를 돌려준다. */
  async function send(name, args = [], opts = {}) {
    try {
      await link.command(name, args, opts);
      return true;
    } catch (e) {
      if (e.cancelled) return false;
      if (e.robotErr) return false; // robotError 이벤트에서 이미 안내함
      toast(e.message, e.encodeErr ? 'warn' : 'bad');
      return false;
    }
  }

  // ---------------- 토스트·배너 ----------------
  function toast(text, kind = '') {
    const t = el('div', { class: `toast ${kind}`, role: kind === 'bad' ? 'alert' : 'status' }, text);
    $('#toasts').append(t);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
    setTimeout(() => t.remove(), kind === 'bad' ? 9000 : 5000);
  }

  function banner(key, html, kind = 'warn') {
    let b = $(`#banners [data-key="${key}"]`);
    if (!b) { b = el('div', { class: 'banner', dataset: { key } }); $('#banners').append(b); }
    b.className = `banner ${kind}`;
    b.innerHTML = html;
  }
  function clearBanner(key) { $(`#banners [data-key="${key}"]`)?.remove(); }

  // ---------------- 로그 ----------------
  const LOG_MAX = 400;
  function logRow(dir, raw, interp, cls = '') {
    if (cls === 'telem' && !$('#logTelem').checked) return;
    if (cls === 'keep' && !$('#logKeep').checked) return;
    const box = $('#log');
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 4;
    const now = new Date();
    const t = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    box.append(el('li', { class: cls },
      el('span', { class: 't' }, t),
      el('span', { class: `d ${dir}` }, dir === 'tx' ? '→' : dir === 'rx' ? '←' : '·'),
      el('span', { class: 'r' }, raw),
      el('span', { class: 'x' }, interp)));
    while (box.children.length > LOG_MAX) box.firstChild.remove();
    if (atBottom) box.scrollTop = box.scrollHeight;
  }

  function describe(msg) {
    const f = msg.fields;
    switch (msg.name) {
      case 'ACK': return [`받음: ${cmdNameFromCode(f.cmd) ?? f.cmd}`, ''];
      case 'DONE': return [`완료: ${cmdNameFromCode(f.cmd) ?? f.cmd}`, ''];
      case 'ERR': return [`오류 ${ERR_NAME[f.code] ?? f.code}: ${cmdNameFromCode(f.cmd) ?? (f.cmd || '-')}`, 'err'];
      case 'INFO': return [`정보: proto ${f.proto}, 빌드 ${f.fw_build}, 센서 ${sensorText(f.sensors)}, 자동반응 ${f.auto}`, 'info'];
      case 'TRIMS': return [`트림: YL ${f.yl} YR ${f.yr} RL ${f.rl} RR ${f.rr}`, 'info'];
      case 'TELEMETRY': return [`거리 ${f.dist_cm} 터치 ${f.touch} pitch ${f.pitch} roll ${f.roll} 소리 ${f.sound} ${STATE_KO[ST_NAME[f.state]] ?? f.state}`, 'telem'];
      case 'EVENT': return [`이벤트 ${EVENT_KO[EVT_NAME[f.kind]] ?? f.kind}: ${f.value}`, 'event'];
      default: return ['해석 안 됨(디버그 출력)', 'info'];
    }
  }
  function sensorText(s) {
    const a = [];
    if (s & 1) a.push('MPU6050');
    if (s & 2) a.push('초음파');
    return a.length ? a.join('+') : '없음';
  }

  // ---------------- 연결 ----------------
  function getTransport(kind) {
    if (kind === 'ble') return (transports.ble ??= new BleTransport());
    if (kind === 'serial') return (transports.serial ??= new SerialTransport());
    if (!transports.demo) {
      transports.demo = new DemoRobot();
      initDemoPanel(ctx, transports.demo);
    }
    return transports.demo;
  }

  function setConnUi(s, detail = '') {
    const pill = $('#connStatus');
    const txt = { off: '● 연결 안 됨', connecting: '◌ 연결 중…', on: `● 연결됨${detail ? ' · ' + detail : ''}`, lost: '✕ 연결 끊김' }[s];
    pill.textContent = txt;
    pill.className = `pill ${{ off: 'off', connecting: 'busy', on: 'on', lost: 'bad' }[s]}`;
    $('#btnConnect').disabled = s === 'connecting' || s === 'on';
    $('#btnDisconnect').disabled = s !== 'on';
    $('#transport').disabled = s === 'connecting' || s === 'on';
    const t = transports[$('#transport').value];
    $('#btnReconnect').hidden = !(s === 'lost' && t?.canReconnect && currentKind !== 'demo');
  }

  async function connect({ reuse = false } = {}) {
    const kind = $('#transport').value;
    store.set('transport', kind);
    const t = getTransport(kind);
    if (kind === 'ble') t.showAll = $('#showAll').checked;
    currentKind = kind;
    $('#cardDemo').hidden = kind !== 'demo';
    setConnUi('connecting');
    try {
      await link.connect(t, { reuse });
    } catch (e) {
      setConnUi('off');
      toast(e.message, 'bad');
      logRow('', '', `연결 실패: ${e.message}`, 'err');
      return;
    }
    if (kind === 'serial') {
      logRow('', '', `USB: 포트를 열면 로봇이 재시작됩니다. ${t.bootWaitMs}ms 기다립니다.`, 'info');
      clearBanner('usb');
      await new Promise((r) => setTimeout(r, t.bootWaitMs));
    } else clearBanner('usb');
    await handshake();
  }

  const BLE_TELEM_MIN_MS = 200;

  async function handshake() {
    robot.proto = null;
    const ok = await send(CMD.PING);
    if (!ok) {
      banner('noping', '<b>로봇이 응답하지 않습니다.</b> 로봇 펌웨어가 올라가 있는지, 블루투스 모듈 배선(D11 RX / D12 TX, TX쪽 분압 저항)을 확인하세요. 연결은 유지되므로 "정지"나 다른 버튼으로 다시 시험할 수 있습니다.', 'bad');
      return;
    }
    clearBanner('noping');
    await new Promise((r) => setTimeout(r, 300)); // INFO·TRIMS는 ACK 뒤에 바로 온다
    if (robot.proto == null) logRow('', '', 'PING에 INFO가 오지 않았습니다', 'err');
    applyTelemetry();
  }

  function applyTelemetry() {
    if (!robot.connected) return;
    let v = document.hidden ? 0 : Number($('#telemInterval').value);
    // BLE: 로봇은 반이중이라 텔레메트리가 잦으면 명령이 깨진다. 200ms 미만이면 실측 손실 16%, 200ms는 0% (2026-11-24)
    if (currentKind === 'ble' && v > 0 && v < BLE_TELEM_MIN_MS) v = BLE_TELEM_MIN_MS;
    send(CMD.TELEM, [v], { coalesce: 'telem' });
  }

  link.on('status', (s, detail) => {
    robot.connected = s === 'connected';
    if (s === 'connected') {
      setConnUi('on', currentKind === 'demo' ? '데모' : currentKind === 'serial' ? 'USB' : (detail || 'BLE'));
      logRow('', '', `연결됨 (${currentKind})`, 'info');
    } else {
      setConnUi(detail?.includes('사용자') || detail?.includes('끊었습니다') ? 'off' : 'lost');
      logRow('', '', detail || '연결 끊김', 'err');
      if (detail && !detail.includes('끊었습니다')) toast(detail, 'bad');
      pressedKeys.clear();
      setRobotState(ST.IDLE);
    }
    refreshControls();
  });
  link.on('log', (t) => logRow('', '', t, 'info'));
  link.on('warn', (t) => logRow('', '', t, 'err'));
  link.on('notice', (t) => { toast(t, 'warn'); logRow('', '', t, 'info'); });
  link.on('greet', () => { toast('터치! 로봇이 기쁨 제스처 후 HELLO 인사를 합니다(약 7초). 그동안 보낸 명령은 인사가 끝난 뒤 실행됩니다.'); });
  link.on('tx', (line, note) => {
    const name = cmdNameFromCode(line.charCodeAt(0)) ?? '?';
    logRow('tx', line.trim(), note ? `${name} (${note})` : name, note === 'keepalive' ? 'keep' : '');
  });
  link.on('rx', (line, msg) => {
    const [interp, cls] = describe(msg);
    const keepAck = msg.name === 'ACK' && link.hold && cmdNameFromCode(msg.fields.cmd) === 'MOVE';
    logRow('rx', line, interp, keepAck ? 'keep' : cls);
  });
  link.on('message', (msg) => {
    if (msg.name === 'INFO') onInfo(msg.fields);
    if (msg.name === 'TELEMETRY') setRobotState(msg.fields.state);
    if (msg.name === 'EVENT') onEvent(msg.fields);
    for (const fn of msgHandlers) { try { fn(msg); } catch (e) { console.error(e); } }
  });
  link.on('robotError', ({ code, name, silent }) => {
    if (silent) return; // 자동 정지 직후 잠금 구간의 e 3 77: 예상된 거부
    const key = ERR_NAME[code];
    toast(`${name ? name + ': ' : ''}${ERR_HELP[key] ?? `로봇 오류 코드 ${code}`}`, code === 6 || code === 3 ? 'warn' : 'bad');
    if (code === 6) setRobotState(ST.FALLEN);
  });
  link.on('busy', (b, name) => {
    $('#connStatus').classList.toggle('busy', b);
    if (b) $('#moveStatus').textContent = `동작 중: ${name} — 끝날 때까지 정지 외 명령은 기다립니다`;
    else updateMoveStatus();
    refreshControls();
  });
  link.on('hold', () => { updateMoveStatus(); });
  // 로봇이 스스로 멈춤(터치·장애물·통신 감시·넘어짐): link가 hold와 keepalive를 이미 끊었다.
  // 누르고 있던 키·버튼 상태도 버린다 → 사용자가 다시 눌러야 움직인다.
  link.on('autoStop', (reason) => {
    const why = { TOUCH: '터치를 감지해', OBSTACLE: '장애물을 감지해 뒤로 물러나며', FALL: '넘어짐을 감지해' }[reason]
      ?? '통신 감시(1.5초 넘게 명령이 닿지 않음)로';
    toast(`로봇이 ${why} 스스로 멈췄습니다. 손을 뗐다가 다시 누르면 움직입니다.`, 'warn');
    releaseAllInputs();
    updateMoveStatus();
  });

  function onInfo(f) {
    robot.proto = f.proto;
    robot.fwBuild = f.fw_build;
    robot.sensors = f.sensors;
    robot.auto = f.auto;
    if (f.proto !== PROTO_VERSION) {
      banner('proto', `<b>프로토콜 버전이 다릅니다.</b> 로봇 ${f.proto}, 웹 ${PROTO_VERSION}. 일부 명령이 거부될 수 있습니다. 같은 프로젝트의 펌웨어(firmware/otto_fat)를 다시 올리세요.`, 'bad');
    } else clearBanner('proto');
    $('#robotInfo').textContent = `로봇 정보: 프로토콜 ${f.proto}, 펌웨어 빌드 ${f.fw_build}, 감지된 센서 ${sensorText(f.sensors)}, 자동 반응 마스크 ${f.auto}`;
  }

  function onEvent(f) {
    const kind = EVT_NAME[f.kind];
    robot.lastEvent = { kind, at: performance.now() };
    if (f.kind === EVT.FALL) setRobotState(ST.FALLEN);
    if (f.kind === EVT.RECOVER) {
      setRobotState(ST.IDLE);
      toast(f.value === 1 ? '넘어짐 감지를 꺼서 로봇을 회복 상태로 돌렸습니다.' : '로봇이 바로 섰습니다. 다시 조종할 수 있습니다.');
    }
    if (f.kind === EVT.OBSTACLE && (robot.auto & 2) && link.hold && FORWARD_IDS.has(link.hold.id)) {
      setRobotState(ST.AVOID);
      setTimeout(() => { if (robot.state === ST.AVOID) setRobotState(ST.IDLE); }, 3000); // 텔레메트리가 꺼져 있을 때 대비
    }
    if (f.kind === EVT.BOOT) {
      toast('로봇이 (다시) 켜졌습니다. 전원이 약하면 서보가 움직일 때 재부팅될 수 있습니다 — 배터리를 확인하세요.', 'warn');
      if (robot.connected) setTimeout(() => { if (robot.connected) handshake(); }, 200);
    }
  }

  function setRobotState(s) {
    if (robot.state === s) return;
    robot.state = s;
    if (s === ST.FALLEN) {
      banner('fallen', '<b>로봇이 넘어졌습니다.</b> 서보 힘이 풀려 있습니다. 로봇을 손으로 바로 세우면 1초 뒤 자동으로 회복됩니다. 그동안 이동·제스처·팔·보정 버튼은 꺼집니다.', 'bad');
      releaseAllInputs();
    } else clearBanner('fallen');
    refreshControls();
    updateMoveStatus();
  }

  // ---------------- 조작 가능 여부 ----------------
  function refreshControls() {
    const c = robot.connected;
    const busy = link.busy;
    const servoBlocked = robot.state === ST.FALLEN || robot.state === ST.AVOID;
    for (const e of $$('.cmd')) {
      e.disabled = !c || busy || (e.classList.contains('servo') && servoBlocked);
      e.title = !c ? '먼저 로봇을 연결하세요' : busy ? '앞 동작이 끝나기를 기다리는 중' :
        (e.classList.contains('servo') && servoBlocked) ? (robot.state === ST.FALLEN ? '넘어진 상태에서는 쓸 수 없습니다' : '장애물 후퇴 중') : '';
    }
    for (const e of $$('.cmd-any')) e.disabled = !c || e.dataset.unavailable === '1';
    $('#btnStop').disabled = !c;
    // 홈 버튼은 동작 중에도 누를 수 있다(동작 중이면 STOP = 다리 홈·팔 90°). 넘어짐·후퇴 중만 막는다
    const home = $('#btnHome');
    home.disabled = !c || servoBlocked;
    if (c && !servoBlocked) home.title = '처음 자세로 (동작 중이면 멈추고 처음 자세로)';
    for (const fn of refreshHooks) { try { fn(); } catch (e) { console.error(e); } }
  }

  // ---------------- 이동 ----------------
  const pressedKeys = new Map(); // code → move id (누른 순서 유지)
  let pointerMove = null;        // {id, pointerId}
  let toggleMove = null;         // 기타 동작 버튼으로 시작한 id

  function moveParams() {
    return [Number($('#period').value), Number($('#size').value)];
  }

  function startHold(id) {
    if (!robot.connected || link.busy) return;
    if (robot.state === ST.FALLEN) { toast(ERR_HELP.FALLEN, 'warn'); return; }
    const [p, s] = moveParams();
    try {
      link.holdMove(id, p, s);
    } catch (e) {
      toast(e.message, 'warn');
    }
  }

  function endHold() {
    if (!link.hold) return;
    link.releaseMove().catch((e) => toast(e.message, 'bad'));
  }

  function emergencyStop() {
    pressedKeys.clear();
    pointerMove = null;
    toggleMove = null;
    $$('.dir.pressed').forEach((b) => b.classList.remove('pressed'));
    if (!robot.connected) return;
    link.stop().catch((e) => toast(e.message, 'bad'));
    updateMoveStatus();
  }

  function releaseAllInputs() {
    pressedKeys.clear();
    pointerMove = null;
    toggleMove = null;
    $$('.dir.pressed').forEach((b) => b.classList.remove('pressed'));
  }

  function updateMoveStatus() {
    const h = link.hold;
    if (!h) { toggleMove = null; $$('.dir.pressed').forEach((b) => { if (!pointerMove) b.classList.remove('pressed'); }); }
    $$('#moreMoves button').forEach((b) => b.classList.toggle('active', !!h && Number(b.dataset.move) === h.id));
    if (link.busy) return;
    const name = h ? (MOVES.find((m) => m[0] === h.id)?.[1] ?? h.id) : null;
    $('#moveStatus').textContent = h
      ? `이동 중: ${name} (주기 ${h.period}ms, 크기 ${h.size}) — 떼거나 정지를 누르면 멈춥니다`
      : `${STATE_KO[ST_NAME[robot.state]] ?? '정지'}`;
  }

  function setupMove() {
    // 방향 패드: 누르는 동안 MOVE, 떼면 STOP
    for (const b of $$('.dir')) {
      const id = Number(b.dataset.move);
      b.addEventListener('pointerdown', (e) => {
        if (b.disabled) return;
        e.preventDefault();
        b.setPointerCapture?.(e.pointerId);
        pointerMove = { id, pointerId: e.pointerId };
        b.classList.add('pressed');
        startHold(id);
      });
      const up = (e) => {
        if (!pointerMove || pointerMove.pointerId !== e.pointerId) return;
        pointerMove = null;
        b.classList.remove('pressed');
        endHold();
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      // 키보드 접근(Enter/Space로 버튼을 누른 경우): 한 주기 동작 후 정지는 위험하므로 토글처럼 동작
      b.addEventListener('click', (e) => {
        if (e.detail !== 0) return;
        if (link.hold?.id === id) endHold(); else startHold(id);
      });
    }

    $('#btnHome').addEventListener('click', () => {
      // 동작 중(반복 이동·제스처 등)이면 STOP: 펌웨어가 중단 후 다리 홈·팔 90°로 돌린다(behavior.md)
      if (link.busy || link.hold) { emergencyStop(); return; }
      releaseAllInputs();
      send(CMD.MOVE, [0]);
    });

    // 기타 동작 5~20: 누르면 정지할 때까지 반복, 다시 누르면 정지
    const box = $('#moreMoves');
    for (const [id, ko, orig] of MOVES.filter((m) => m[0] >= 5)) {
      box.append(el('button', { class: 'cmd servo', dataset: { move: id }, title: `MOVE ${id} · ${orig}`,
        onclick: () => {
          if (link.hold?.id === id) { toggleMove = null; endHold(); return; }
          toggleMove = id;
          startHold(id);
        } }, ko, el('small', {}, `${id} · ${orig}`)));
    }

    // 속도·크기: 움직이는 중이면 새 MOVE로 교체 (쓰로틀)
    const resend = throttle(() => {
      if (link.hold) startHold(link.hold.id);
    }, 250);
    for (const [id, out, unit] of [['period', 'periodOut', ' ms'], ['size', 'sizeOut', '']]) {
      const inp = $('#' + id);
      const v = store.get(id, null);
      if (v != null) inp.value = v;
      $('#' + out).textContent = inp.value + unit;
      inp.addEventListener('input', () => {
        $('#' + out).textContent = inp.value + unit;
        store.set(id, Number(inp.value));
        resend();
      });
    }

    // 키보드: 화살표/WASD 누르는 동안, 스페이스 = 정지
    const KEYMAP = { ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3, ArrowRight: 4, KeyD: 4 };
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range';
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !typing(e)) {
        e.preventDefault();
        if (!e.repeat) emergencyStop();
        return;
      }
      const id = KEYMAP[e.code];
      if (!id || typing(e) || e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      if (e.repeat) return; // OS 키 반복으로 MOVE를 보내지 않는다(keepalive가 유지)
      pressedKeys.delete(e.code);
      pressedKeys.set(e.code, id);
      startHold(id);
    });
    window.addEventListener('keyup', (e) => {
      if (!pressedKeys.has(e.code)) return;
      pressedKeys.delete(e.code);
      const rest = [...pressedKeys.values()];
      if (rest.length) startHold(rest[rest.length - 1]);
      else endHold();
    });
    // 창이 포커스를 잃으면 keyup이 오지 않는다 → 누르고 있던 이동을 멈춘다
    window.addEventListener('blur', () => {
      if (pressedKeys.size || pointerMove) { releaseAllInputs(); endHold(); }
    });

    // 긴급 정지: pointerdown으로 즉시, 키보드 활성화(click detail 0)도 받는다
    const stopBtn = $('#btnStop');
    stopBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); emergencyStop(); });
    stopBtn.addEventListener('click', (e) => { if (e.detail === 0) emergencyStop(); });
  }

  // ---------------- 초기화 ----------------
  function setupConnection() {
    const sel = $('#transport');
    const saved = store.get('transport', null);
    if (saved && [...sel.options].some((o) => o.value === saved)) sel.value = saved;
    if (!bleSupported()) {
      banner('noble', '<b>이 브라우저는 Web Bluetooth를 지원하지 않습니다</b> (iPhone/iPad, Firefox 등). 데스크톱 Chrome/Edge 또는 안드로이드 Chrome에서 여세요. 지금은 <b>데모 로봇</b>으로 화면을 시험할 수 있습니다.', 'warn');
      if (sel.value === 'ble') sel.value = 'demo';
      sel.querySelector('option[value=ble]').disabled = true;
    }
    if (!serialSupported()) sel.querySelector('option[value=serial]').disabled = true;
    if (!window.isSecureContext) {
      banner('insecure', '<b>보안 컨텍스트가 아닙니다.</b> 블루투스·USB는 index.html을 직접 열거나(file://) https·http://localhost 에서만 됩니다. Chrome 또는 Edge로 web/index.html을 여세요.', 'bad');
    }
    const syncKind = () => {
      $('#showAllWrap').hidden = sel.value !== 'ble';
      $('#cardDemo').hidden = sel.value !== 'demo' || !transports.demo;
    };
    sel.addEventListener('change', syncKind);
    syncKind();

    $('#btnConnect').addEventListener('click', () => connect());
    $('#btnReconnect').addEventListener('click', () => connect({ reuse: true }));
    $('#btnDisconnect').addEventListener('click', async () => {
      releaseAllInputs();
      try { await link.disconnect(); } catch (e) { toast(e.message, 'bad'); }
    });

    $('#telemInterval').value = String(store.get('telem', 200));
    $('#telemInterval').addEventListener('change', () => { store.set('telem', Number($('#telemInterval').value)); applyTelemetry(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (pressedKeys.size || pointerMove)) { releaseAllInputs(); endHold(); }
      applyTelemetry();
    });

    $('#logClear').addEventListener('click', () => { $('#log').textContent = ''; });
  }

  setupConnection();
  setupMove();
  initSensors(ctx);
  initExpress(ctx);
  initCalib(ctx);
  initPins();
  let twin = null;
  try { twin = initTwin(ctx); } catch (e) { console.error('3D 형상 초기화 실패', e); }
  initMasonry($('#cards'));
  setConnUi('off');
  refreshControls();
  updateMoveStatus();
  // 디버그용: 브라우저 콘솔에서 otto.link 등으로 접근
  window.otto = { link, robot, ctx, MSG, twin };
  return {  };
})();
