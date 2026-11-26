// 핀 연결 카드: Nano 핀헤더 그림·범례·표를 PINMAP 하나에서 만든다.
// 근거: otto-hardware 스킬 핀 표(references/pinmap.md), firmware/otto_fat/config.h, 2026-11-24 실물 진단.
// 핀을 바꾸면 config.h와 이 표를 함께 고친다.
import { $ } from './util.js';

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
    { p: 'A4', t: 'SDA', note: 'I2C 0x68' },
    { p: 'A5', t: 'SCL' },
  ] },
  { id: 'sound', func: '사운드 센서 (선택)', color: '#94d82d', pins: [
    { p: 'A6', t: 'OUT', note: '아날로그 전용' },
  ] },
  { id: 'usb', func: 'USB 시리얼', color: '#868e96', pins: [
    { p: 'D0', t: 'RX', note: '업로드·디버그 전용' },
    { p: 'D1', t: 'TX' },
  ] },
];

// Nano 윗면, USB가 왼쪽. 위 줄·아래 줄 핀 순서(실제 보드 배열)
const TOP = ['D13', '3V3', 'REF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST', 'GND', 'VIN'];
const BOT = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND', 'RST', 'D0', 'D1'];
const BOT_LABEL = { D0: 'RX0', D1: 'TX1' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function drawNano(users) {
  const W = 640, x0 = 120, step = 31;
  let s = `<rect x="70" y="40" width="${W - 90}" height="170" rx="12" fill="#123a5a" stroke="#2a5d86"/>`
    + `<rect x="20" y="100" width="64" height="50" rx="5" fill="#9aa3ad"/>`
    + `<text x="52" y="130" text-anchor="middle" font-size="11" fill="#222" font-family="Segoe UI,sans-serif">USB</text>`
    + `<text x="355" y="122" text-anchor="middle" fill="#7fb2d9" font-size="18" font-weight="700" font-family="Segoe UI,sans-serif">ARDUINO NANO + OTTO 쉴드</text>`
    + `<text x="355" y="142" text-anchor="middle" fill="#5d8db5" font-size="11" font-family="Segoe UI,sans-serif">사용 중인 핀은 색으로 표시 · 핀에 마우스를 올리면 용도</text>`;
  const box = (key, label, x, y, below) => {
    const u = users[key];
    const fill = u ? u.e.color : '#0d1118';
    const title = u ? `${u.e.func} ${u.p.t}` : '미사용';
    const ty = below ? y + 36 : y - 9;
    return `<g><title>${esc(label)}: ${esc(title)}</title>`
      + `<rect x="${x}" y="${y}" width="24" height="24" rx="3" fill="${fill}" stroke="${u ? '#fff' : '#3a4a5c'}" stroke-width="1.2"/>`
      + `<circle cx="${x + 12}" cy="${y + 12}" r="4" fill="#000" opacity=".55"/>`
      + `<text x="${x + 12}" y="${ty}" text-anchor="middle" font-size="10" fill="${u ? '#e8eaf6' : '#7a8aa0'}" font-family="Consolas,monospace">${esc(label)}</text></g>`;
  };
  TOP.forEach((k, i) => { s += box(k, k, x0 + i * step, 54, false); });
  BOT.forEach((k, i) => { s += box(k, BOT_LABEL[k] || k, x0 + i * step, 172, true); });
  return s;
}

export function initPins() {
  const users = {};
  for (const e of PINMAP) for (const p of e.pins) users[p.p] = { e, p };
  $('#nanoSvg').innerHTML = drawNano(users);
  $('#pinLegend').innerHTML = PINMAP.map((e) =>
    `<span><span class="swatch" style="background:${e.color}"></span>${esc(e.func)}</span>`).join('');
  $('#pinBody').innerHTML = PINMAP.map((e) => e.pins.map((p, i) =>
    `<tr>${i === 0 ? `<td rowspan="${e.pins.length}"><span class="swatch" style="background:${e.color}"></span>${esc(e.func)}</td>` : ''}`
    + `<td>${esc(p.t)}</td><td class="pn">${p.p}</td><td class="muted">${esc(p.note || '')}</td></tr>`).join('')).join('');
}
