#!/usr/bin/env python3
"""pin_check 출력 읽기. 사용법: python read_diag.py COM10 [명령문자 ...] [--secs N] [--reset]
줄 앞 순번(@NNNN)으로 드라이버가 반복해 보내는 중복 데이터를 걸러낸다."""
import re, sys, time, serial
sys.stdout.reconfigure(encoding="utf-8")
args = sys.argv[1:]; port = args.pop(0)
secs = 6.0; reset = False; cmds = []
while args:
    a = args.pop(0)
    if a == "--secs": secs = float(args.pop(0))
    elif a == "--reset": reset = True
    else: cmds.append(a)
s = serial.Serial()
s.port, s.baudrate, s.timeout = port, 9600, 0
if not reset: s.dtr = False          # 열 때 보드가 리셋되지 않게
s.open()
if reset: time.sleep(0.1)
seen = {}; buf = b""
def pump(dur):
    global buf
    t = time.time()
    while time.time() - t < dur:
        n = s.in_waiting
        if n: buf += s.read(n)
        for m in re.finditer(rb"@(\d{4}) ([^\r\n@]*)\r?\n", buf):
            k = int(m.group(1))
            if k not in seen: seen[k] = m.group(2).decode("utf-8", "replace")
        if len(buf) > 200000: buf = buf[-4000:]
        time.sleep(0.02)
pump(5)  # 포트를 열면 보드가 리셋될 수 있으므로 부팅 출력이 끝날 때까지 기다린다
for c in cmds:
    s.reset_input_buffer(); buf = b""
    s.write(c.encode()); pump(secs)
if not cmds: pump(secs)
s.close()
for k in sorted(seen): print(f"{k:04d} {seen[k]}")
