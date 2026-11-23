// 보정: 다리 트림(TRIM, save 0 = 미리보기 / 1 = EEPROM 저장)과 다리 서보 직접 각도(SERVO).
// 트림 화면은 로봇이 보낸 TRIMS(c ...)로 초기화한다. 그 전에는 트림 버튼을 막는다:
// 모르는 채로 보내면 저장된 YL −10을 0으로 덮어쓰기 때문이다.
import { CMD } from './protocol.js';

const LEGS = [
  ['yl', 'YL', '왼다리 (D2)'],
  ['yr', 'YR', '오른다리 (D3)'],
  ['rl', 'RL', '왼발목 (D4)'],
  ['rr', 'RR', '오른발목 (D5)'],
];

export function initCalib(ctx) {
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
