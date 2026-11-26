// 3D 형상(디지털 트윈). 웹이 보낸 명령(link 'tx')과 로봇이 보낸 텔레메트리·이벤트로 움직인다.
// three.js는 vendor/three-r160-bundle.js(일반 스크립트, window.SMARS_THREE — SMARS 트윈과 같은 파일)를 쓴다.
// 인터넷이 없어도, file://로 열어도 동작한다. 파일이 없으면 카드에 안내만 보이고 나머지 화면은 그대로 동작한다.
//
// 표시는 "근사"다: 로봇은 서보 각도를 보내지 않으므로 다리 움직임은 Otto 라이브러리(ref/OttoDIYLib, Otto.cpp)의
// 진동자 값(진폭 A, 중심 O, 위상차)으로 웹에서 계산한다. 기울기·거리·터치·상태는 텔레메트리 실측값이다.
// 좌표: 1 단위 = 1 cm, 위 = +Y, 로봇 정면 = +Z(처음 시점에서 화면 쪽), 로봇의 왼쪽 = +X.
import { ST, EVT } from './protocol.js';
import { getPixel } from './matrix-editor.js';

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

export function initTwin(ctx) {
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
