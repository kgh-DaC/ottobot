// 생성된 web/js/protocol.js 를 protocol.json 기준으로 자동 시험한다.
// 사용법: node test_protocol_js.mjs [프로젝트루트]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? '.');
const spec = JSON.parse(readFileSync(resolve(root, 'protocol/protocol.json'), 'utf8'));
const P = await import(pathToFileURL(resolve(root, 'web/js/protocol.js')).href);

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL', msg); } };
const throws = (fn, msg) => { try { fn(); ok(false, msg + ' (예외가 나야 함)'); } catch { ok(true, msg); } };
const maxLine = spec.transport.max_line ?? 48;

for (const c of spec.commands) {
  const args = c.args ?? [];
  const pick = (k) => args.map((a) => (a.type === 'str' ? 'A'.repeat(k === 'max' ? a.maxlen : 1) : a[k]));
  for (const k of ['min', 'max']) {
    let line;
    try { line = P.encode(c.name, ...pick(k)); } catch (e) { ok(false, `${c.name} ${k}값 인코딩 실패: ${e.message}`); continue; }
    ok(line.endsWith(spec.transport.line_end ?? '\n'), `${c.name} 줄끝`);
    ok(line.length <= maxLine, `${c.name} ${k} 길이 ${line.length} <= ${maxLine}`);
    ok(line[0] === c.token, `${c.name} 첫 글자 토큰`);
  }
  args.forEach((a, i) => {
    if (a.type === 'str') return;
    const vals = pick('min');
    vals[i] = a.max + 1;
    throws(() => P.encode(c.name, ...vals), `${c.name}.${a.name} 상한 초과 거부`);
    vals[i] = a.min - 1;
    throws(() => P.encode(c.name, ...vals), `${c.name}.${a.name} 하한 미만 거부`);
    vals[i] = a.min + 0.5;
    if (a.max > a.min) throws(() => P.encode(c.name, ...vals), `${c.name}.${a.name} 소수 거부`);
  });
  const firstDefault = args.findIndex((a) => a.default !== undefined);
  if (firstDefault > 0) {
    const line = P.encode(c.name, ...pick('min').slice(0, firstDefault));
    ok(line.trim().split(' ').length === args.length + 1, `${c.name} default 채움`);
  }
}
throws(() => P.encode('NOPE'), '알 수 없는 명령 거부');

for (const m of spec.messages) {
  const vals = m.fields.map((_, i) => (i % 2 ? -i * 7 : i * 13));
  const r = P.parseLine(`${m.token} ${vals.join(' ')}\r\n`);
  ok(r.name === m.name, `${m.name} 파싱 이름`);
  m.fields.forEach((f, i) => ok(r.fields?.[f] === vals[i], `${m.name}.${f} 값`));
  if (m.fields.length) ok(P.parseLine(`${m.token}`).name === 'RAW', `${m.name} 필드 부족 → RAW`);
}
ok(P.parseLine('hello world').name === 'RAW', '디버그 문자열 → RAW');
ok(P.parseLine('').name === 'RAW', '빈 줄 → RAW');

for (const c of spec.commands) ok(P.cmdNameFromCode(c.token.charCodeAt(0)) === c.name, `${c.name} 코드 역매핑`);

console.log(`[protocol.js] 통과 ${pass}, 실패 ${fail}`);
process.exit(fail ? 1 : 0);
