// 8x8 LED 편집기. 좌표 규칙(docs/protocol.md MATRIX, 실물 확인됨):
//   행 바이트 r0 = 맨 위 행, 각 행의 bit7 = 정면에서 본 왼쪽 칸 → 편집기 (x, y)는 rows[y]의 bit(7 - x).

export function getPixel(rows, x, y) {
  return (rows[y] >> (7 - x)) & 1;
}

export function setPixel(rows, x, y, on) {
  const m = 1 << (7 - x);
  rows[y] = on ? (rows[y] | m) : (rows[y] & ~m & 0xff);
}

export const PRESETS = [
  ['하트', [0x00, 0x66, 0xff, 0xff, 0xff, 0x7e, 0x3c, 0x18]],
  ['웃는 얼굴', [0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c]],
  ['슬픈 얼굴', [0x3c, 0x42, 0xa5, 0x81, 0x99, 0xa5, 0x42, 0x3c]],
  ['X', [0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81]],
  ['체크', [0x00, 0x01, 0x03, 0x06, 0x8c, 0xd8, 0x70, 0x20]],
  ['위 화살표', [0x18, 0x3c, 0x7e, 0xff, 0x18, 0x18, 0x18, 0x18]],
  ['방향 확인: 왼쪽 위 한 점', [0x80, 0, 0, 0, 0, 0, 0, 0]],
  ['방향 확인: 왼쪽 화살표', [0x10, 0x30, 0x7f, 0xff, 0x7f, 0x30, 0x10, 0x00]],
  ['전체 켜기', [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]],
];

export class MatrixEditor {
  /** @param {HTMLElement} root  @param {{readOnly?: boolean, onChange?: (rows:number[]) => void}} opts */
  constructor(root, opts = {}) {
    this.root = root;
    this.rows = [0, 0, 0, 0, 0, 0, 0, 0];
    this.readOnly = !!opts.readOnly;
    this.onChange = opts.onChange ?? (() => {});
    this.cells = [];
    root.textContent = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const c = document.createElement(this.readOnly ? 'div' : 'button');
        c.className = 'px';
        if (!this.readOnly) {
          c.type = 'button';
          c.setAttribute('aria-label', `${y + 1}행 ${x + 1}열`);
          c.setAttribute('aria-pressed', 'false');
        }
        c.dataset.x = x;
        c.dataset.y = y;
        root.append(c);
        this.cells.push(c);
      }
    }
    if (!this.readOnly) this._bindPointer();
  }

  _bindPointer() {
    let paint = null; // 끌기 중 칠할 값(0/1)
    const cellAt = (e) => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      return t && t.classList?.contains('px') && this.root.contains(t) ? t : null;
    };
    const apply = (c) => {
      const x = Number(c.dataset.x), y = Number(c.dataset.y);
      if (getPixel(this.rows, x, y) === paint) return;
      setPixel(this.rows, x, y, paint);
      this._render();
      this.onChange(this.get());
    };
    this.root.addEventListener('pointerdown', (e) => {
      const c = cellAt(e);
      if (!c) return;
      e.preventDefault();
      this.root.setPointerCapture?.(e.pointerId);
      paint = getPixel(this.rows, Number(c.dataset.x), Number(c.dataset.y)) ? 0 : 1;
      apply(c);
    });
    this.root.addEventListener('pointermove', (e) => {
      if (paint == null) return;
      const c = cellAt(e);
      if (c) apply(c);
    });
    const end = () => { paint = null; };
    this.root.addEventListener('pointerup', end);
    this.root.addEventListener('pointercancel', end);
    // 키보드: Enter/Space로 한 칸 토글
    this.root.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      const c = e.target.closest('.px');
      if (!c) return;
      const x = Number(c.dataset.x), y = Number(c.dataset.y);
      setPixel(this.rows, x, y, !getPixel(this.rows, x, y));
      this._render();
      this.onChange(this.get());
    });
  }

  get() { return [...this.rows]; }

  set(rows, notify = false) {
    this.rows = rows.map((v) => v & 0xff);
    this._render();
    if (notify) this.onChange(this.get());
  }

  clear() { this.set([0, 0, 0, 0, 0, 0, 0, 0], true); }
  invert() { this.set(this.rows.map((v) => ~v & 0xff), true); }

  _render() {
    for (const c of this.cells) {
      const on = !!getPixel(this.rows, Number(c.dataset.x), Number(c.dataset.y));
      c.classList.toggle('on', on);
      if (!this.readOnly) c.setAttribute('aria-pressed', String(on));
    }
  }
}
