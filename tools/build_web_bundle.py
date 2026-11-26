"""web/js의 ES 모듈을 하나의 일반 스크립트 web/js/bundle.js로 묶는다.

index.html을 더블클릭(file://)으로 열면 브라우저가 ES 모듈 로딩을 막는다. 그래서 index.html은
생성물 bundle.js를 일반 <script>로 불러온다. 원본은 web/js/*.js 이고 bundle.js는 직접 고치지 않는다.

  python tools/build_web_bundle.py            # 생성
  python tools/build_web_bundle.py --check    # 원본과 bundle.js가 일치하는지만 검사 (QA)

지원 문법(이 프로젝트에서 쓰는 것만): import { a, b as c } from './x.js';  export const/let/function/class.
모듈마다 함수 범위로 감싸므로 모듈 사이 내부 이름이 겹쳐도 된다.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "web" / "js"
OUT = JS / "bundle.js"
ENTRY = "app.js"

IMPORT_RE = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'\./([\w-]+)\.js';\s*$", re.M)
EXPORT_RE = re.compile(r"^export\s+(?:async\s+)?(const|let|var|function\*?|class)\s+([\w$]+)", re.M)
OTHER_RE = re.compile(r"^\s*(import\s|export\s)", re.M)


def var(name):
    return "__m_" + re.sub(r"\W", "_", name)


def load(name, order, seen, stack=()):
    if name in seen:
        return
    if name in stack:
        raise SystemExit(f"[bundle] 순환 import: {' -> '.join(stack + (name,))}")
    src = (JS / f"{name}.js").read_text(encoding="utf-8")
    deps = [m.group(2) for m in IMPORT_RE.finditer(src)]
    for d in deps:
        load(d, order, seen, stack + (name,))
    seen.add(name)
    order.append((name, src))


def convert(name, src):
    def imp(m):
        names = []
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            a, _, b = part.partition(" as ")
            names.append(f"{a.strip()}: {b.strip()}" if b else a.strip())
        return f"const {{ {', '.join(names)} }} = {var(m.group(2))};"

    body = IMPORT_RE.sub(imp, src)
    exports = [m.group(2) for m in EXPORT_RE.finditer(body)]
    body = EXPORT_RE.sub(lambda m: m.group(0)[len("export "):], body)
    left = OTHER_RE.search(body)
    if left:
        line = body[: left.start()].count("\n") + 1
        raise SystemExit(f"[bundle] {name}.js:{line} 지원하지 않는 import/export 문법")
    body = "\n".join(("  " + l) if l else l for l in body.rstrip().splitlines())
    ret = ", ".join(exports)
    return f"// ---- {name}.js ----\nconst {var(name)} = (() => {{\n{body}\n  return {{ {ret} }};\n}})();\n"


def build():
    order, seen = [], set()
    load(Path(ENTRY).stem, order, seen)
    parts = ["// 생성물 — 직접 고치지 말 것. 원본: web/js/*.js, 생성: python tools/build_web_bundle.py\n"
             "// index.html을 file://로 열어도 동작하도록 ES 모듈을 일반 스크립트 하나로 묶은 것.\n"
             "'use strict';\n"]
    parts += [convert(n, s) for n, s in order]
    return "\n".join(parts)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    text = build()
    if "--check" in sys.argv:
        cur = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if cur != text:
            print("[bundle] 불일치: web/js/bundle.js가 원본과 다름 → python tools/build_web_bundle.py 실행")
            return 1
        print("[bundle] 일치: web/js/bundle.js")
        return 0
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"[bundle] 생성: {OUT.relative_to(ROOT)} ({len(text):,} 자)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
