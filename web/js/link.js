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
import { encode, parseLine, CMD, ST, ERR, EVT, cmdNameFromCode } from './protocol.js';

export const MOVE_LOCK_MS = 1000;
const LOCK_MARGIN_MS = 200;   // 로봇 쪽 잠금 시작 시각과 웹 수신 시각의 차이 여유
const FORWARD_IDS = new Set([1, 9, 12]);

export const ACK_TIMEOUT_MS = 1500;
const DONE_TIMEOUT_MS = 30000;
// 멈춰 있을 때 터치 → 로봇이 인사(기쁨 제스처 → HELLO 흐르기 → 원위치, 약 6.5초 블로킹). 그동안 보낸 줄은 늦게 읽힌다
const TOUCH_GREET_MS = 8000;
const BLOCKING = new Set(['GESTURE', 'SING', 'TEXT', 'SERVO', 'TRIM']);
const code = (name) => CMD[name].token.charCodeAt(0);
const CODE_MOVE = code('MOVE');
const CODE_STOP = code('STOP');

export function keepaliveInterval(period) {
  return Math.min(1000, Math.max(500, Math.ceil(period / 3)));
}

export class Link {
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
