// 카드 블록 배치(메이슨리). 같은 줄의 카드를 같은 높이로 늘이지 않고, 각 카드를 자기 높이만큼만 차지하게 해
// 짧은 카드 여러 개가 긴 카드 하나 옆에 쌓이도록 한다. 순서는 왼쪽 → 오른쪽을 유지하고, 빈칸은 뒤 카드로 채운다(dense).
// CSS: .grid.masonry { grid-auto-rows: ROW px; row-gap: 0 } — 카드마다 grid-row-end: span N 을 계산해 넣는다.
const ROW = 4;    // px, style.css .grid.masonry grid-auto-rows 와 같게
const GAP = 14;   // px, 카드 사이 세로 간격(= 가로 간격)

export function initMasonry(grid) {
  if (!grid || typeof ResizeObserver === 'undefined') return;
  grid.classList.add('masonry');
  const cards = () => [...grid.children].filter((c) => c.classList.contains('card'));
  let pending = 0;
  function layout() {
    pending = 0;
    for (const c of cards()) {
      if (c.hidden) { c.style.gridRowEnd = ''; continue; }
      const h = c.getBoundingClientRect().height;
      c.style.gridRowEnd = `span ${Math.max(1, Math.ceil((h + GAP) / ROW))}`;
    }
  }
  const schedule = () => { if (!pending) pending = requestAnimationFrame(layout); };
  const ro = new ResizeObserver(schedule);
  for (const c of cards()) ro.observe(c);
  ro.observe(grid);
  // 데모 패널처럼 hidden 이 바뀌는 카드
  new MutationObserver(schedule).observe(grid, { subtree: false, childList: true, attributes: true, attributeFilter: ['hidden'] });
  for (const c of cards()) new MutationObserver(schedule).observe(c, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('load', schedule);
  layout();
}
