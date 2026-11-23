# USB(COM10)로 보드를 리셋해 부팅 출력과 PING 응답을 확인. python tools/ble_diag/usb_boot_ping.py
import serial,time,sys
sys.stdout.reconfigure(encoding="utf-8")
s=serial.Serial(); s.port,s.baudrate,s.timeout="COM10",9600,0; s.open()
time.sleep(4); b=s.read(s.in_waiting)
s.reset_input_buffer(); s.write(b"P\n"); time.sleep(2); p=s.read(s.in_waiting)
s.close()
def uniq(x):
    out=[];[out.append(l) for l in x.decode("utf-8","replace").splitlines() if l and l not in out];return out
print("BOOT:",uniq(b)[:10]); print("PING:",uniq(p)[:10])
