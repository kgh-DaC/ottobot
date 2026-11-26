// Web Bluetooth(BLE UART) transport — 로봇 블루투스 모듈 'otto2'(HM-10/HC-08 계열 추정)의 기본 연결 경로.
// 계약: connect() / disconnect() / send(line) / onLine(cb) / onStatus(cb) / onLog(cb)
import { LineSplitter } from './line-splitter.js';

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

export function bleSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export class BleTransport {
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
