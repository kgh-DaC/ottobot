// 가상 로봇(데모 모드). transport와 같은 인터페이스를 구현하고, 펌웨어 규칙(docs/behavior.md)을 그대로 흉내 낸다:
//  - 검증 → ACK → 실행 → DONE, 검증 실패는 ERR만
//  - 블로킹 동작(제스처·노래·텍스트·home·SERVO·TRIM)과 MOVE 한 주기 동안은 입력을 읽지 않고 64바이트 버퍼에 쌓음(넘치면 버림)
//  - 연속 MOVE 교체·keepalive(a 77만), 1회성 명령이 MOVE를 끝냄(a xx → d 77 → d xx)
//  - MOVE 감시: MOVING 중 1500ms 넘게 올바른 줄이 없으면 주기 종료 후 정지(d 77)
//  - 상태별 거부: AVOID → e 3, FALLEN → e 6, STOP은 FALLEN을 풀지 않음
//  - 자동 반응 우선순위: 넘어짐 > 터치 > 장애물, AUTO 마스크·센서 부재 반영
import { CMD, MSG, ERR, EVT, ST, MAX_LINE, PROTO_VERSION } from './protocol.js';

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

export class DemoRobot {
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
