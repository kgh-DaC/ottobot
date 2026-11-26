# BLE 양방향 진단: 웹 BLE 연결을 끊은 뒤 실행. python tools/ble_diag/ble_diag.py [이름, 기본 otto2] (bleak 필요, python -I 로 실행하면 bleak를 못 찾음)
import asyncio, sys, time, serial
from bleak import BleakScanner, BleakClient
sys.stdout.reconfigure(encoding="utf-8")
NAME = (sys.argv[1] if len(sys.argv) > 1 else "otto2").lower()   # 로봇별 모듈 이름: OTTO2, OTTO3 …
got = bytearray()
def on(_, data): got.extend(data); print("  NOTIFY", repr(bytes(data)))
async def main():
    d = await BleakScanner.find_device_by_filter(lambda d, a: (d.name or a.local_name or "").lower() == NAME, timeout=15)
    if not d: print(f"{NAME} 못 찾음(다른 기기·웹이 연결 중일 수 있음)"); return
    print("찾음", d.address)
    async with BleakClient(d, timeout=20) as c:
        nch = wch = None
        for s in c.services:
            print("SVC", s.uuid)
            for ch in s.characteristics:
                print("   CH", ch.uuid, ch.properties)
                if "notify" in ch.properties and nch is None and not s.uuid.startswith("0000180"): nch = ch
                if ("write-without-response" in ch.properties or "write" in ch.properties) and wch is None and not s.uuid.startswith("0000180"): wch = ch
        print("notify:", nch and nch.uuid, " write:", wch and wch.uuid)
        await c.start_notify(nch, on)
        # 1) 보드 리셋 → 부팅 출력이 BT로 오는지 (Arduino TX → 모듈 RX 방향)
        print("[1] USB로 보드 리셋, 부팅 출력이 BLE로 오는지 6초 대기")
        s = serial.Serial("COM10", 9600); time.sleep(0.3); s.close()
        await asyncio.sleep(6)
        n1 = len(got); print("  받은 바이트:", n1)
        # 2) BLE로 P 전송 → 응답 (모듈 TX → Arduino RX 방향)
        got.clear()
        print("[2] BLE로 'P\n' 전송")
        await c.write_gatt_char(wch, b"P\n", response=("write" in wch.properties and "write-without-response" not in wch.properties))
        await asyncio.sleep(3)
        print("  받은 바이트:", len(got))
        await c.stop_notify(nch)
asyncio.run(main())
