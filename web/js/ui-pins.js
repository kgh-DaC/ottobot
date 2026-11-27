// 핀 연결 카드: 아두이노 나노 확장 쉴드(Nano I/O 쉴드) 그림·범례·표를 PINMAP 하나에서 만든다.
// 근거: otto-hardware 스킬 핀 표(references/pinmap.md), firmware/otto_fat/config.h, 2026-11-24 실물 진단,
//       실물 배선 사진 ref/led matrix 회로도.jpg(쉴드 배치: 위 디지털 G·V·S 줄, 가운데 나노·RX TX/I2C 헤더, 아래 아날로그 G·V·S 줄).
// 핀을 바꾸면 config.h와 이 표를 함께 고친다.
import { $ } from './util.js';

// hdr: 부품을 꽂는 쉴드 단자. 없으면 '<핀> G·V·S 헤더'
export const PINMAP = [
  { id: 'legs', func: '다리 서보', color: '#4f8ef7', pins: [
    { p: 'D2', t: '왼다리 (YL)', note: '트림 YL −10 (OTTO2 EEPROM)' },
    { p: 'D3', t: '오른다리 (YR)' },
    { p: 'D4', t: '왼발목 (RL)' },
    { p: 'D5', t: '오른발목 (RR)' },
  ] },
  { id: 'arms', func: '팔 서보', color: '#22b8cf', pins: [
    { p: 'D6', t: '왼팔' },
    { p: 'D7', t: '오른팔', note: '좌우 대칭 장착 → 펌웨어에서 방향 반전' },
  ] },
  { id: 'us', func: '초음파 HC-SR04', color: '#f59f00', pins: [
    { p: 'D8', t: 'TRIG' },
    { p: 'D9', t: 'ECHO', note: 'OTTO2 로봇은 무응답(센서 점검 필요)' },
  ] },
  { id: 'ble', func: 'BLE 모듈 (OTTO2/OTTO3)', color: '#9775fa', pins: [
    { p: 'D11', t: '모듈 TX → 아두이노 RX', note: 'SoftwareSerial 9600bps' },
    { p: 'D12', t: '아두이노 TX → 모듈 RX', note: '3.3V 로직이면 분압(1k/2k) 권장' },
  ] },
  { id: 'buz', func: '부저', color: '#e64980', pins: [
    { p: 'D13', t: '수동 부저 +', note: '보드 내장 LED와 공유' },
  ] },
  { id: 'touch', func: '터치 센서', color: '#40c057', pins: [
    { p: 'A0', t: 'SIG', note: '디지털, 눌림 = HIGH' },
  ] },
  { id: 'mtx', func: 'LED 매트릭스 MAX7219', color: '#fa5252', pins: [
    { p: 'A1', t: 'CLK' },
    { p: 'A2', t: 'CS' },
    { p: 'A3', t: 'DIN', note: 'Orientation 1' },
  ] },
  { id: 'imu', func: 'MPU6050 기울기', color: '#fd7e14', pins: [
    { p: 'A4', t: 'SDA', hdr: 'I2C 헤더 SDA', note: 'I2C 0x68' },
    { p: 'A5', t: 'SCL', hdr: 'I2C 헤더 SCL' },
  ] },
  { id: 'sound', func: '사운드 센서 (선택)', color: '#94d82d', pins: [
    { p: 'A6', t: 'OUT', note: '아날로그 전용' },
  ] },
  { id: 'usb', func: 'USB 시리얼', color: '#868e96', pins: [
    { p: 'D0', t: 'RX', hdr: '나노 USB (RX 헤더)', note: '업로드·디버그 전용' },
    { p: 'D1', t: 'TX', hdr: '나노 USB (TX 헤더)' },
  ] },
];
const hdrOf = (p) => p.hdr || `${p.p} G·V·S 헤더`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const F = 'font-family="Segoe UI,sans-serif"', M = 'font-family="Consolas,monospace"';

// 확장 쉴드 윗면(USB 왼쪽). 위 줄 디지털, 아래 줄 아날로그. 한 열 = 위에서부터 G·V·S
const DIG = [['D13', 'D12'], ['D11', 'D10', 'D9', 'D8'], ['D7', 'D6', 'D5', 'D4'], ['D3', 'D2'], ['D1', 'D0']];
const ANA = [['A0', 'A1'], ['A2', 'A3'], ['A4', 'A5'], ['A6', 'A7']];

function drawShield(users) {
  const col = {};          // 핀 → 열 x
  const sq = (x, y, fill, stroke, tip) => `<g><title>${esc(tip)}</title><rect x="${x}" y="${y}" width="14" height="14" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
    + `<circle cx="${x + 7}" cy="${y + 7}" r="2.6" fill="#000" opacity=".5"/></g>`;
  const gvsColumn = (k, x, yG, labelY) => {
    col[k] = x;
    const u = users[k];
    const tip = u ? `${k}: ${u.e.func} ${u.p.t}` : `${k}: 사용 안 함`;
    let o = sq(x, yG, u ? '#5c6370' : '#d4b106', '#8a6d00', `${tip} (G = GND)`)
      + sq(x, yG + 20, u ? '#f783ac' : '#d4b106', '#8a6d00', `${tip} (V = 5V)`)
      + sq(x, yG + 40, u ? u.e.color : '#d4b106', u ? '#fff' : '#8a6d00', `${tip} (S = 신호)`);
    const name = k.startsWith('D') ? k.slice(1) : k;
    o += `<text x="${x + 7}" y="${labelY}" text-anchor="middle" fill="${u ? u.e.color : '#e8eaf6'}" font-size="12" font-weight="700" ${M}>${name}</text>`;
    return o;
  };
  let s = `<rect x="200" y="170" width="500" height="290" rx="12" fill="#1c4f8a" stroke="#5b8fd0" stroke-width="1.5"/>`;
  // 위 줄: 디지털 G·V·S
  let x = 300;
  for (const g of DIG) { for (const k of g) { s += gvsColumn(k, x, 186, 258); x += 21; } x += 14; }
  s += ['G', 'V', 'S'].map((l, i) => `<text x="285" y="${197 + i * 20}" text-anchor="middle" fill="#e8eaf6" font-size="11" font-weight="700" ${M}>${l}</text>`).join('');
  // 아래 줄: 아날로그 G·V·S
  x = 300;
  for (const g of ANA) { for (const k of g) { s += gvsColumn(k, x, 366, 438); x += 21; } x += 12; }
  s += ['G', 'V', 'S'].map((l, i) => `<text x="285" y="${377 + i * 20}" text-anchor="middle" fill="#e8eaf6" font-size="11" font-weight="700" ${M}>${l}</text>`).join('');
  // 가운데: 아두이노 나노(USB 왼쪽)
  s += `<rect x="236" y="282" width="320" height="62" rx="4" fill="#0f3b6b" stroke="#7fb2d9"/>`
    + `<rect x="196" y="296" width="44" height="34" rx="3" fill="#c9ced6" stroke="#555"/><text x="218" y="317" text-anchor="middle" fill="#222" font-size="10" ${F}>USB</text>`
    + `<rect x="350" y="296" width="34" height="34" fill="#222" transform="rotate(45 367 313)"/>`
    + `<text x="470" y="310" text-anchor="middle" fill="#e8eaf6" font-size="14" font-weight="700" ${F}>Arduino Nano</text>`
    + `<text x="470" y="328" text-anchor="middle" fill="#9fc3ee" font-size="10" ${F}>확장 쉴드 소켓에 꽂음</text>`;
  // 오른쪽: RX TX 5V GND, SCL SDA 5V GND 헤더
  const hdr4 = (y, names, keys) => names.map((n, i) => {
    const k = keys[i], u = k && users[k], px = 586 + i * 26;
    const fill = u ? u.e.color : n === '5V' ? '#f783ac' : n === 'GND' ? '#5c6370' : '#d4b106';
    return `<text x="${px + 7}" y="${y - 5}" text-anchor="middle" fill="#e8eaf6" font-size="9.5" font-weight="700" ${M}>${n}</text>`
      + sq(px, y, fill, u ? '#fff' : '#8a6d00', `${n}${k ? ` (${k})` : ''}: ${u ? `${u.e.func} ${u.p.t}` : n === '5V' || n === 'GND' ? '전원' : '사용 안 함'}`);
  }).join('');
  s += hdr4(292, ['RX', 'TX', '5V', 'GND'], ['D0', 'D1', null, null]) + hdr4(334, ['SCL', 'SDA', '5V', 'GND'], ['A5', 'A4', null, null]);
  col.I2C_SDA = 586 + 26; col.I2C_SCL = 586;
  // 왼쪽 아래: DC 잭
  s += `<rect x="208" y="372" width="56" height="40" rx="4" fill="#222" stroke="#555"/><circle cx="236" cy="392" r="9" fill="#111" stroke="#666"/>`
    + `<text x="236" y="428" text-anchor="middle" fill="#9fc3ee" font-size="9.5" ${F}>DC 전원</text>`;

  // 바깥 부품 블록과 연결선
  const wire = (x1, y1, x2, y2, c) => `<path d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="5 4" opacity=".85"/>`;
  const block = (bx, by, w, id, top) => {
    const e = PINMAP.find((z) => z.id === id), h = 30 + e.pins.length * 22;
    let o = `<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="8" fill="#0d1118" fill-opacity=".9" stroke="${e.color}" stroke-width="1.5"/>`
      + `<text x="${bx + 10}" y="${by + 19}" fill="${e.color}" font-size="12.5" font-weight="700" ${F}>${esc(e.func)}</text>`;
    e.pins.forEach((p, i) => {
      const ry = by + 30 + i * 22, pin = p.hdr && p.hdr.startsWith('I2C') ? p.hdr.replace(' 헤더', '') : p.p;
      const pw = Math.max(34, pin.length * 7.2 + 12);
      o += `<g><title>${esc(`${e.func} ${p.t} → ${hdrOf(p)} (나노 ${p.p})`)}</title>`
        + `<text x="${bx + 10}" y="${ry + 11.5}" fill="#e8eaf6" font-size="11" ${F}>${esc(p.t)}</text>`
        + `<rect x="${bx + w - pw - 8}" y="${ry - 1}" width="${pw}" height="16" rx="8" fill="${e.color}"/>`
        + `<text x="${bx + w - 8 - pw / 2}" y="${ry + 11}" text-anchor="middle" fill="#0b0f14" font-size="11" font-weight="700" ${M}>${esc(pin)}</text></g>`;
      const n = e.pins.length, sx = bx + 20 + (n > 1 ? i * (w - 40) / (n - 1) : (w - 40) / 2);
      const key = p.hdr === 'I2C 헤더 SDA' ? 'I2C_SDA' : p.hdr === 'I2C 헤더 SCL' ? 'I2C_SCL' : p.p;
      if (col[key] == null || id === 'usb') return;
      if (key.startsWith('I2C')) o += wire(sx, by, col[key] + 7, 348, e.color);
      else if (top) o += wire(sx, by + h, col[key] + 7, 186, e.color);
      else o += wire(sx, by, col[key] + 7, 400, e.color);
    });
    return o;
  };
  // 위: 디지털 부품
  s += block(10, 20, 150, 'buz', true) + block(170, 10, 160, 'us', true) + block(340, 10, 170, 'legs', true)
    + block(520, 20, 150, 'arms', true) + block(680, 20, 210, 'ble', true);
  // 아래: 아날로그·I2C 부품
  s += block(160, 488, 150, 'touch', false) + block(320, 488, 170, 'mtx', false)
    + block(500, 488, 160, 'sound', false) + block(705, 470, 185, 'imu', false);
  // 왼쪽: USB
  s += block(10, 290, 150, 'usb', false) + wire(160, 313, 196, 313, '#868e96');
  return s;
}

export function initPins() {
  const users = {};
  for (const e of PINMAP) for (const p of e.pins) users[p.p] = { e, p };
  $('#nanoSvg').innerHTML = drawShield(users);
  $('#pinLegend').innerHTML = PINMAP.map((e) =>
    `<span><span class="swatch" style="background:${e.color}"></span>${esc(e.func)}</span>`).join('');
  $('#pinBody').innerHTML = PINMAP.map((e) => e.pins.map((p, i) =>
    `<tr>${i === 0 ? `<td rowspan="${e.pins.length}"><span class="swatch" style="background:${e.color}"></span>${esc(e.func)}</td>` : ''}`
    + `<td>${esc(p.t)}</td><td>${esc(hdrOf(p))}</td><td class="pn">${p.p}</td><td class="muted">${esc(p.note || '')}</td></tr>`).join('')).join('');
}
