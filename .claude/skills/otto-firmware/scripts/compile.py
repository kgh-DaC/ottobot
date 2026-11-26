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
HARD_FLASH_MAX = 30720  # 실측 부팅 한도(B). main()의 판정 주석 참고
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
    # 이 로봇의 Nano는 Optiboot(115200 업로드 확인)라 업로드는 Uno 정의로 한다. 단 Flash는 30,720B를 넘으면 부팅이 멈춘다(HARD_FLASH_MAX).
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
        up_cmd = [cli, "upload", "-b", a.fqbn, "-p", a.port, str(sketch)]

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
    # 2026-11-24 실측: 이 보드는 30,720B(0x7800)를 넘는 펌웨어는 업로드는 되지만 리셋 후 부팅이 멈춘다
    # (Uno 정의 32,256B를 다 쓸 수 없음 — 부트 섹션 퓨즈가 2KB로 보임). 업로드 전에 반드시 막는다.
    if flash and int(flash.group(1)) > HARD_FLASH_MAX:
        print(f"[compile] Flash {flash.group(1)} B > 실측 한도 {HARD_FLASH_MAX} B → 실패 (이 보드에서 부팅이 멈춤)")
        return 1
    if flash and int(flash.group(2)) > a.flash_limit:
        print(f"[compile] Flash {flash.group(2)}% > 한도 {a.flash_limit}% → 실패 (수정 여유 부족)")
        return 1
    if ram:
        pct = int(ram.group(2))
        print(f"  RAM  : {ram.group(1)} B ({pct}%), 남은 {ram.group(3)} B")
        if pct > a.ram_limit:
            print(f"[compile] RAM {pct}% > 한도 {a.ram_limit}% → 실패 (스택 여유 부족)")
            return 1
    if a.upload:   # 크기·RAM 판정을 통과한 뒤에만 올린다
        u = subprocess.run(up_cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        uout = (u.stdout or "") + (u.stderr or "")
        if a.log:
            with open(a.log, "a", encoding="utf-8") as f:
                f.write(uout)
        if u.returncode != 0:
            print("[compile] 업로드 실패 (not in sync면 USB 케이블을 다시 꽂기)")
            print(uout[-1500:])
            return 1
        print("[compile] 업로드 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
