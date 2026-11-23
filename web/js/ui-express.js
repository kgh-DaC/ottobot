// 표현: 제스처·노래·입모양·텍스트·부저, LED 매트릭스, 팔.
import { CMD, EVT } from './protocol.js';
import { GESTURES, SONGS, MOUTHS } from './names.js';
import { MatrixEditor, PRESETS } from './matrix-editor.js';
import { store } from './util.js';

const TEXT_OK = /^[0-9A-Z :;<=>?@\[]*$/;

export function initExpress(ctx) {
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
