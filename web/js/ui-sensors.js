// 센서 텔레메트리 표시와 자동 반응(AUTO) 토글.
import { CMD, ST, ST_NAME, EVT } from './protocol.js';
import { STATE_KO } from './names.js';

export function initSensors(ctx) {
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
