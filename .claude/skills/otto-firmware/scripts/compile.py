#!/usr/bin/env python3
"""Otto 펌웨어를 arduino-cli로 컴파일하고 Flash/RAM 사용량을 판정한다.

사용법:
  python compile.py [--sketch firmware/otto_fat] [--fqbn arduino:avr:nano]
                    [--ram-limit 75] [--log _workspace/qa_compile.log]
  python compile.py --upload --port COM5      # 컴파일 후 업로드 (사용자가 요청한 경우만)

판정: 컴파일 오류 → 실패, RAM 사용률 > ram-limit% → 실패, 경고는 개수만 보고.
종료 코드 0 = 통과.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

CANDIDATES = [
    r"C:\Program Files\Arduino CLI\arduino-cli.exe",
    "/c/Program Files/Arduino CLI/arduino-cli.exe",
]
FALLBACK_LIB = "ref/OttoDIYLib-main/OttoDIYLib-main"


def find_cli():
    p = shutil.which("arduino-cli")
    if p:
        return p
    for c in CANDIDATES:
        if Path(c).exists():
            return c
    return None


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--sketch", default="firmware/otto_fat")
    # 이 로봇의 Nano는 Optiboot(신형 부트로더, 115200 업로드 확인) → Uno 정의로 빌드하면 Flash 32,256B 사용 가능(Nano 정의 30,720B).
    # 구형 부트로더 보드라면 OTTO_FQBN=arduino:avr:nano:cpu=atmega328old 로 바꾼다.
    ap.add_argument("--fqbn", default=os.environ.get("OTTO_FQBN", "arduino:avr:uno"))
    ap.add_argument("--ram-limit", type=int, default=75)
    ap.add_argument("--flash-limit", type=int, default=97)
    ap.add_argument("--log")
    ap.add_argument("--upload", action="store_true")
    ap.add_argument("--port")
    a = ap.parse_args()

    cli = find_cli()
    if not cli:
        print("[compile] arduino-cli를 찾을 수 없음")
        return 2
    sketch = Path(a.sketch)
    if not sketch.exists():
        print(f"[compile] 스케치 폴더 없음: {sketch}")
        return 2

    cmd = [cli, "compile", "-b", a.fqbn, "--warnings", "default", str(sketch)]
    libs = subprocess.run([cli, "lib", "list"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if "OttoDIYLib" not in (libs.stdout or "") and Path(FALLBACK_LIB).exists():
        cmd[2:2] = ["--library", FALLBACK_LIB]
    if a.upload:
        if not a.port:
            print("[compile] --upload에는 --port 필요")
            return 2
        cmd += ["--upload", "-p", a.port]

    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    out = (r.stdout or "") + (r.stderr or "")
    if a.log:
        Path(a.log).parent.mkdir(parents=True, exist_ok=True)
        Path(a.log).write_text(out, encoding="utf-8")

    warnings = len(re.findall(r"warning:", out))
    flash = re.search(r"Sketch uses (\d+) bytes \((\d+)%\)", out)
    ram = re.search(r"Global variables use (\d+) bytes \((\d+)%\).*?leaving (\d+) bytes", out)

    if r.returncode != 0:
        errs = [l for l in out.splitlines() if "error" in l.lower()][:15]
        print("[compile] 실패")
        print("\n".join(errs) or out[-2000:])
        return 1
    print(f"[compile] 성공 (경고 {warnings}건)")
    if flash:
        print(f"  Flash: {flash.group(1)} B ({flash.group(2)}%)")
    if flash and int(flash.group(2)) > a.flash_limit:
        print(f"[compile] Flash {flash.group(2)}% > 한도 {a.flash_limit}% → 실패 (수정 여유 부족)")
        return 1
    if ram:
        pct = int(ram.group(2))
        print(f"  RAM  : {ram.group(1)} B ({pct}%), 남은 {ram.group(3)} B")
        if pct > a.ram_limit:
            print(f"[compile] RAM {pct}% > 한도 {a.ram_limit}% → 실패 (스택 여유 부족)")
            return 1
    if a.upload:
        print("[compile] 업로드 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
