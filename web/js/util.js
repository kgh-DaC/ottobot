// 작은 공용 도구
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** 앞쪽 즉시 + 끝 값 보장 쓰로틀. 연속 입력(슬라이더)의 마지막 값은 반드시 보낸다. */
export function throttle(fn, ms) {
  let last = 0, timer = null, pending = null;
  return (...args) => {
    pending = args;
    const now = performance.now();
    const wait = ms - (now - last);
    if (wait <= 0 && !timer) {
      last = now;
      fn(...pending);
      pending = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = performance.now();
        if (pending) { const a = pending; pending = null; fn(...a); }
      }, Math.max(0, wait));
    }
  };
}

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c != null) e.append(c);
  return e;
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem('otto.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('otto.' + k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
};
