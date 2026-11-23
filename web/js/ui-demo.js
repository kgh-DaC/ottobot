// 데모 로봇 조작 패널: 가상 로봇의 주변 세계(터치·기울기·장애물·소리·전파)를 바꾸고 내부 상태를 보여 준다.
import { ST_NAME } from './protocol.js';
import { STATE_KO, MOUTHS } from './names.js';
import { MatrixEditor } from './matrix-editor.js';

export function initDemoPanel(ctx, demo) {
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
