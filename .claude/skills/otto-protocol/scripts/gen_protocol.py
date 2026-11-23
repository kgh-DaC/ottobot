#!/usr/bin/env python3
"""protocol.json -> firmware protocol.h + web protocol.js 생성기.

사용법:
  python gen_protocol.py [--root 프로젝트루트] [--check]

  --check : 파일을 쓰지 않고, 현재 생성 파일이 protocol.json과 일치하는지만 검사한다.
            불일치하면 종료 코드 1.

기본 경로 (루트 기준):
  protocol/protocol.json        단일 기준(SSOT)
  firmware/otto_fat/protocol.h  생성물 (직접 수정 금지)
  web/js/protocol.js            생성물 (직접 수정 금지)
"""
import argparse
import json
import sys
from pathlib import Path

SRC = "protocol/protocol.json"
OUT_H = "firmware/otto_fat/protocol.h"
OUT_JS = "web/js/protocol.js"
BANNER = "AUTO-GENERATED from protocol/protocol.json by gen_protocol.py - DO NOT EDIT"


class SpecError(Exception):
    pass


def validate(spec):
    errs = []
    for key in ("version", "transport", "commands", "messages"):
        if key not in spec:
            errs.append(f"필수 키 누락: {key}")
    if errs:
        raise SpecError("\n".join(errs))
    max_line = spec["transport"].get("max_line", 48)

    def check_unique(items, label, field):
        seen = {}
        for it in items:
            v = it.get(field)
            if v in seen:
                errs.append(f"{label} {field} 중복: {v!r} ({seen[v]}, {it.get('name')})")
            seen[v] = it.get("name")

    for group in ("commands", "messages"):
        for it in spec[group]:
            tok = it.get("token", "")
            if len(tok) != 1 or tok.isspace() or not tok.isprintable():
                errs.append(f"{group}.{it.get('name')}: token은 공백이 아닌 1글자여야 한다 ({tok!r})")
            if not str(it.get("name", "")).isidentifier() or it["name"] != it["name"].upper():
                errs.append(f"{group}.{it.get('name')}: name은 대문자 식별자여야 한다")
        check_unique(spec[group], group, "token")
        check_unique(spec[group], group, "name")

    for c in spec["commands"]:
        args = c.get("args", [])
        seen_default = False
        for i, a in enumerate(args):
            t = a.get("type", "int")
            if t not in ("int", "str"):
                errs.append(f"{c['name']}.{a.get('name')}: type은 int 또는 str")
            if t == "str":
                if i != len(args) - 1:
                    errs.append(f"{c['name']}.{a['name']}: str 인자는 마지막에만 둘 수 있다")
                if "maxlen" not in a:
                    errs.append(f"{c['name']}.{a['name']}: str 인자는 maxlen 필요")
            else:
                if "min" not in a or "max" not in a or a["min"] > a["max"]:
                    errs.append(f"{c['name']}.{a.get('name')}: int 인자는 min<=max 필요")
                if "default" in a:
                    seen_default = True
                    if not (a["min"] <= a["default"] <= a["max"]):
                        errs.append(f"{c['name']}.{a['name']}: default가 범위 밖")
                elif seen_default:
                    errs.append(f"{c['name']}.{a['name']}: default 있는 인자 뒤에 필수 인자를 둘 수 없다")
        if worst_len(c) > max_line:
            errs.append(f"{c['name']}: 최악 길이 {worst_len(c)} > max_line {max_line}")

    for group in ("errors", "events", "states"):
        items = spec.get(group, [])
        check_unique(items, group, "code")
        check_unique(items, group, "name")
    if errs:
        raise SpecError("\n".join(errs))


def worst_len(cmd):
    """줄바꿈 포함, 인자 최대 길이로 인코딩했을 때의 바이트 수."""
    n = 1  # token
    for a in cmd.get("args", []):
        if a.get("type", "int") == "str":
            n += 1 + a["maxlen"]
        else:
            n += 1 + max(len(str(a["min"])), len(str(a["max"])))
    return n + 1


def required_argc(cmd):
    return sum(1 for a in cmd.get("args", []) if a.get("type", "int") == "int" and "default" not in a
               or a.get("type") == "str")


def gen_h(spec):
    L = [f"// {BANNER}", "#pragma once", ""]
    tr = spec["transport"]
    L += [f"#define PROTO_VERSION {spec['version']}",
          f"#define PROTO_BAUD {tr['baud']}",
          f"#define PROTO_MAX_LINE {tr.get('max_line', 48)}",
          f"#define PROTO_MAX_ARGS {max([len(c.get('args', [])) for c in spec['commands']] + [1])}", ""]
    L.append("// ---- commands (web -> robot) ----")
    for c in spec["commands"]:
        n = c["name"]
        args = c.get("args", [])
        L.append(f"#define CMD_{n} '{c['token']}'")
        L.append(f"#define CMD_{n}_ARGC {len(args)}")
        L.append(f"#define CMD_{n}_MIN_ARGC {required_argc(c)}")
        for a in args:
            an = a["name"].upper()
            if a.get("type", "int") == "str":
                L.append(f"#define CMD_{n}_{an}_MAXLEN {a['maxlen']}")
            else:
                L.append(f"#define CMD_{n}_{an}_MIN {a['min']}")
                L.append(f"#define CMD_{n}_{an}_MAX {a['max']}")
                if "default" in a:
                    L.append(f"#define CMD_{n}_{an}_DEFAULT {a['default']}")
        L.append("")
    L.append("// ---- messages (robot -> web) ----")
    for m in spec["messages"]:
        L.append(f"#define MSG_{m['name']} '{m['token']}'")
        L.append(f"#define MSG_{m['name']}_FIELDS {len(m.get('fields', []))}")
    for group, prefix in (("errors", "ERR"), ("events", "EVT"), ("states", "ST")):
        items = spec.get(group, [])
        if items:
            L += ["", f"// ---- {group} ----"]
            for it in items:
                L.append(f"#define {prefix}_{it['name']} {it['code']}")
    return "\n".join(L) + "\n"


def gen_js(spec):
    cmds = {c["name"]: {"token": c["token"], "args": c.get("args", []), "desc": c.get("desc", "")}
            for c in spec["commands"]}
    msgs = {m["name"]: {"token": m["token"], "fields": m.get("fields", [])} for m in spec["messages"]}
    enum = lambda g: {it["name"]: it["code"] for it in spec.get(g, [])}
    j = lambda o: json.dumps(o, ensure_ascii=False, indent=2)
    tr = spec["transport"]
    return f"""// {BANNER}
export const PROTO_VERSION = {spec['version']};
export const BAUD = {tr['baud']};
export const LINE_END = {json.dumps(tr.get('line_end', chr(10)))};
export const MAX_LINE = {tr.get('max_line', 48)};

export const CMD = Object.freeze({j(cmds)});

export const MSG = Object.freeze({j(msgs)});

export const ERR = Object.freeze({j(enum('errors'))});
export const EVT = Object.freeze({j(enum('events'))});
export const ST = Object.freeze({j(enum('states'))});

const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
export const ERR_NAME = invert(ERR);
export const EVT_NAME = invert(EVT);
export const ST_NAME = invert(ST);
const MSG_BY_TOKEN = Object.fromEntries(Object.entries(MSG).map(([k, v]) => [v.token, k]));
const CMD_BY_CODE = Object.fromEntries(Object.entries(CMD).map(([k, v]) => [v.token.charCodeAt(0), k]));

/** 명령 이름(ASCII 코드)으로 CMD 이름을 찾는다. ACK/DONE/ERR의 cmd 필드 해석용. */
export function cmdNameFromCode(code) {{
  return CMD_BY_CODE[code] ?? null;
}}

/**
 * 명령을 한 줄 문자열로 인코딩한다. 범위를 벗어나거나 필수 인자가 없으면 Error를 던진다.
 * 뒤쪽 인자를 생략하면 default를 채운다.
 */
export function encode(name, ...values) {{
  const c = CMD[name];
  if (!c) throw new Error(`알 수 없는 명령: ${{name}}`);
  const parts = [c.token];
  c.args.forEach((a, i) => {{
    let v = values[i];
    if (v === undefined || v === null || v === '') {{
      if (a.type === 'str') throw new Error(`${{name}}.${{a.name}} 필요`);
      if (a.default === undefined) throw new Error(`${{name}}.${{a.name}} 필요`);
      v = a.default;
    }}
    if (a.type === 'str') {{
      v = String(v).replace(/[\\r\\n]/g, ' ');
      if (v.length > a.maxlen) throw new Error(`${{name}}.${{a.name}} 길이 초과 (${{a.maxlen}})`);
      if (/[^\\x20-\\x7e]/.test(v)) throw new Error(`${{name}}.${{a.name}}: ASCII만 허용`);
    }} else {{
      v = Number(v);
      if (!Number.isInteger(v)) throw new Error(`${{name}}.${{a.name}}: 정수 필요`);
      if (v < a.min || v > a.max) throw new Error(`${{name}}.${{a.name}} 범위 ${{a.min}}~${{a.max}}`);
    }}
    parts.push(String(v));
  }});
  if (values.length > c.args.length) throw new Error(`${{name}}: 인자 개수 초과`);
  const line = parts.join(' ') + LINE_END;
  if (line.length > MAX_LINE) throw new Error(`${{name}}: 줄 길이 초과`);
  return line;
}}

/**
 * 로봇이 보낸 한 줄을 해석한다.
 * 반환: {{ name, fields: {{필드명: 정수}} }} 또는 {{ name: 'RAW', text }} (디버그 출력 등)
 */
export function parseLine(line) {{
  const text = String(line).replace(/[\\r\\n]+$/, '');
  const parts = text.trim().split(/\\s+/);
  const name = MSG_BY_TOKEN[parts[0]];
  if (!name || parts[0].length !== 1) return {{ name: 'RAW', text }};
  const spec = MSG[name];
  const nums = parts.slice(1).map(Number);
  if (nums.length !== spec.fields.length || nums.some((n) => !Number.isInteger(n))) {{
    return {{ name: 'RAW', text }};
  }}
  const fields = Object.fromEntries(spec.fields.map((f, i) => [f, nums[i]]));
  return {{ name, fields }};
}}
"""


def main():
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    root = Path(a.root)
    src = root / SRC
    try:
        spec = json.loads(src.read_text(encoding="utf-8"))
        validate(spec)
    except FileNotFoundError:
        print(f"[gen] {src} 없음", file=sys.stderr)
        return 2
    except (json.JSONDecodeError, SpecError) as e:
        print(f"[gen] protocol.json 오류:\n{e}", file=sys.stderr)
        return 2
    outputs = {root / OUT_H: gen_h(spec), root / OUT_JS: gen_js(spec)}
    bad = 0
    for path, content in outputs.items():
        if a.check:
            cur = path.read_text(encoding="utf-8") if path.exists() else None
            if cur != content:
                print(f"[gen] 불일치: {path} (gen_protocol.py로 다시 생성 필요)")
                bad += 1
            else:
                print(f"[gen] 일치: {path}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
            print(f"[gen] 생성: {path}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
