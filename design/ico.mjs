// A .ico file (the one browsers ask for at /favicon.ico) made from PNG pictures, and a reader for checking it. An .ico is a small header, a
// list of the pictures it holds (their size and where each one is), and the pictures. Each picture here is a PNG, which every browser reads
// (Chrome, Edge, Firefox and Safari, on computers and phones) and which keeps the file small. Nothing in the file depends on the time or the
// computer: the same pictures always make the same bytes. design/og.mjs draws the pictures and writes web/favicon.ico;
// design/check-site.mjs reads it back.

// frames: [{ size: 16, png: Buffer }, …] (square pictures, 1 to 255 pixels) → Buffer
export function makeIco(frames) {
  const head = Buffer.alloc(6 + 16 * frames.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(frames.length, 4); // reserved, 1 = icons, how many
  let at = head.length;
  frames.forEach(({ size, png }, i) => {
    if (!(size >= 1 && size <= 255)) throw new Error('An .ico picture is 1 to 255 pixels wide, not ' + size);
    const e = 6 + 16 * i;
    head[e] = size; head[e + 1] = size; head[e + 2] = 0; head[e + 3] = 0;   // width, height, no palette, reserved
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);            // one plane, 32 bits a pixel
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(at, e + 12);  // how long it is, where it starts
    at += png.length;
  });
  return Buffer.concat([head, ...frames.map(f => f.png)]);
}

// Buffer → [{ width, height, png: Buffer, isPng }, …], or throws if it isn't an .ico.
export function readIco(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error('not an .ico file');
  const n = buf.readUInt16LE(4), out = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + 16 * i, len = buf.readUInt32LE(e + 8), at = buf.readUInt32LE(e + 12), png = buf.subarray(at, at + len);
    const isPng = png.length > 24 && png.subarray(1, 4).toString() === 'PNG';
    out.push({ width: buf[e] || 256, height: buf[e + 1] || 256, png, isPng, pngWidth: isPng ? png.readUInt32BE(16) : 0, pngHeight: isPng ? png.readUInt32BE(20) : 0, bytes: len });
  }
  return out;
}
