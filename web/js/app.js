// UI 상태와 이벤트 연결. 통신은 link.js(→ encode/parseLine)만 거친다.
import { CMD, PROTO_VERSION, ST, ST_NAME, ERR_NAME, EVT, EVT_NAME, MSG, cmdNameFromCode } from './protocol.js';
import { Link } from './link.js';
import { BleTransport, bleSupported } from './ble-transport.js';
import { SerialTransport, serialSupported } from './serial-transport.js';
import { DemoRobot } from './demo-robot.js';
import { MOVES, STATE_KO, EVENT_KO, ERR_HELP } from './names.js';
import { $, $$, el, throttle, store } from './util.js';
import { initSensors } from './ui-sensors.js';
import { initExpress } from './ui-express.js';
import { initCalib } from './ui-calib.js';
import { initDemoPanel } from './ui-demo.js';
import { initPins } from './ui-pins.js';

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
setConnUi('off');
refreshControls();
updateMoveStatus();
// 디버그용: 브라우저 콘솔에서 otto.link 등으로 접근
window.otto = { link, robot, ctx, MSG };
