#!/usr/bin/env python3
"""펌웨어 ↔ 웹 프로토콜 계약 검사.

사용법: python check_contract.py [--root 프로젝트루트]

검사 항목
  1. 생성 파일(protocol.h / protocol.js)이 protocol.json과 일치하는가 (gen_protocol.py --check)
  2. 모든 명령(CMD)을 펌웨어가 처리하는가      → 펌웨어 소스에 CMD_<NAME> 참조
  3. 모든 명령을 웹이 보내는가                 → 웹 소스에 CMD.<NAME> 또는 encode('<NAME>'
  4. 모든 메시지(MSG)를 펌웨어가 보내는가      → 펌웨어 소스에 MSG_<NAME>
  5. 모든 메시지를 웹이 해석하는가             → 웹 소스에 MSG.<NAME> 또는 '<NAME>' 문자열
  6. 오류·이벤트·상태 코드 사용 여부 (경고만)
  7. 생성 파일 밖에서 토큰 문자 리터럴을 하드코딩했는가 (경고)

생성 파일(protocol.h, protocol.js) 자체는 검색 대상에서 뺀다. 거기 정의돼 있다는 사실은
처리하고 있다는 증거가 아니기 때문이다.
종료 코드: 오류 0건이면 0, 아니면 1.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def read_sources(base: Path, exts, exclude_names):
    out = {}
    if not base.exists():
        return out
    for p in base.rglob("*"):
        if p.suffix in exts and p.name not in exclude_names and p.is_file():
            out[p] = p.read_text(encoding="utf-8", errors="replace")
    return out


def strip_comments(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"//[^\n]*", "", src)


def main():
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    errors, warns = [], []

    r = subprocess.run([sys.executable, str(HERE / "gen_protocol.py"), "--root", str(root), "--check"],
                       capture_output=True, text=True, encoding="utf-8",
                       env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    print((r.stdout or "").strip())
    if r.returncode != 0:
        errors.append("생성 파일이 protocol.json과 다르거나 protocol.json이 잘못됨: " + (r.stderr.strip() or r.stdout.strip()))

    spec_path = root / "protocol/protocol.json"
    if not spec_path.exists():
        print("[contract] protocol/protocol.json 없음")
        return 1
    spec = json.loads(spec_path.read_text(encoding="utf-8"))

    fw = {p: strip_comments(s) for p, s in
          read_sources(root / "firmware", {".ino", ".cpp", ".h"}, {"protocol.h"}).items()}
    web = {p: strip_comments(s) for p, s in
           read_sources(root / "web", {".js", ".mjs", ".html"}, {"protocol.js"}).items()}
    fw_all = "\n".join(fw.values())
    web_all = "\n".join(web.values())
    if not fw:
        errors.append("firmware/ 아래 소스 없음")
    if not web:
        errors.append("web/ 아래 소스 없음")

    for c in spec["commands"]:
        n = c["name"]
        if fw and not re.search(rf"\bCMD_{n}\b", fw_all):
            errors.append(f"[펌웨어] 명령 {n}('{c['token']}') 처리 코드 없음 (CMD_{n} 참조 없음)")
        if web and not re.search(rf"CMD\.{n}\b|encode\(\s*['\"]{n}['\"]", web_all):
            errors.append(f"[웹] 명령 {n} 송신 코드 없음 (CMD.{n} / encode('{n}') 없음)")

    for m in spec["messages"]:
        n = m["name"]
        if fw and not re.search(rf"\bMSG_{n}\b", fw_all):
            errors.append(f"[펌웨어] 메시지 {n}('{m['token']}') 송신 코드 없음 (MSG_{n} 참조 없음)")
        if web and not re.search(rf"MSG\.{n}\b|['\"]{n}['\"]", web_all):
            errors.append(f"[웹] 메시지 {n} 처리 코드 없음 (MSG.{n} / '{n}' 없음)")

    for group, fw_prefix, js_obj in (("errors", "ERR", "ERR"), ("events", "EVT", "EVT"), ("states", "ST", "ST")):
        for it in spec.get(group, []):
            n = it["name"]
            if fw and not re.search(rf"\b{fw_prefix}_{n}\b", fw_all):
                warns.append(f"[펌웨어] {group}.{n} 미사용 ({fw_prefix}_{n})")
            if web and not re.search(rf"{js_obj}\.{n}\b|{js_obj}_NAME|['\"]{n}['\"]", web_all):
                warns.append(f"[웹] {group}.{n} 표시/처리 없음")

    # 하드코딩 경고: switch/case 나 비교에 명령 토큰 문자 리터럴을 직접 쓴 경우
    tokens = {c["token"] for c in spec["commands"]} | {m["token"] for m in spec["messages"]}
    for p, s in fw.items():
        for t in tokens:
            if re.search(rf"case\s+'{re.escape(t)}'\s*:", s):
                warns.append(f"[펌웨어] {p.relative_to(root)}: case '{t}' 하드코딩 → CMD_/MSG_ 상수 사용")
    for p, s in web.items():
        if re.search(r"\.write\([^)]*['\"`][A-Z](\s|\\n)", s):
            warns.append(f"[웹] {p.relative_to(root)}: 명령 문자열을 직접 만드는 것으로 보임 → encode() 사용")

    for w in warns:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print(f"[contract] 오류 {len(errors)}건, 경고 {len(warns)}건")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
