// USB Web Serial transport — 디버그용 보조 경로.
// 이 로봇의 FTDI 호환칩은 로봇이 조용할 때 드라이버가 마지막 데이터를 반복해서 돌려준다(otto-hardware 참고).
// 그래서 같은 줄이 짧은 간격으로 반복되면 버리고, 9600bps로 불가능한 수신량이면 경고한다.
import { BAUD } from './protocol.js';
import { LineSplitter } from './line-splitter.js';

const DUP_WINDOW_MS = 80;       // 같은 줄이 이 시간 안에 다시 오면 중복으로 본다(9600bps에서 24B 줄 ≈ 25ms)
const MAX_REAL_BPS = 1100;      // 9600bps 8N1 이론값 960B/s + 여유
const BOOT_WAIT_MS = 1800;      // 포트를 열면 Nano가 리셋된다(DTR). 부트로더를 기다린다.

export function serialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export class SerialTransport {
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
      throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다. 데스크톱 Chrome/Edge를 쓰세요(USB는 디버그용입니다).');
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
