// 수신 바이트 조각을 '\n' 단위 줄로 조립한다. BLE notify(20B)·Serial 조각 모두 같은 방식.
import { MAX_LINE } from './protocol.js';

export class LineSplitter {
  constructor(onLine) {
    this.onLine = onLine;
    this.decoder = new TextDecoder();
    this.buf = '';
  }

  /** @param {Uint8Array|ArrayBuffer|DataView|string} chunk */
  push(chunk) {
    if (typeof chunk === 'string') this.buf += chunk;
    else {
      const bytes = chunk instanceof DataView
        ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
        : new Uint8Array(chunk.buffer ?? chunk, chunk.byteOffset ?? 0, chunk.byteLength);
      this.buf += this.decoder.decode(bytes, { stream: true });
    }
    let i;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).replace(/\r/g, '');
      this.buf = this.buf.slice(i + 1);
      if (line.length) this.onLine(line);
    }
    // 줄 끝이 오지 않는 쓰레기가 쌓이지 않게 한다(디버그 출력 등은 이보다 길 수 있어 넉넉히).
    if (this.buf.length > MAX_LINE * 8) {
      this.onLine(this.buf.replace(/\r/g, ''));
      this.buf = '';
    }
  }

  reset() {
    this.buf = '';
    this.decoder = new TextDecoder();
  }
}
