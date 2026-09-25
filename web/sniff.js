// What a file really is, from its first bytes (a link or a file name can say anything). The server checks every picture
// and sound with it (media.mjs, handler.mjs), and the app labels a file with it before uploading it (db.js), so a
// picture named .png that's really a JPEG still goes up as a JPEG.
const ascii = (b, from, to) => String.fromCharCode(...b.subarray(from, to));
export const sniff = b => {
  if (!b || b.length < 12) return null;
  if (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return 'image/png';
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (ascii(b, 0, 4) === 'GIF8') return 'image/gif';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'image/webp';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE') return 'audio/wav';
  if (ascii(b, 4, 8) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1)/.test(ascii(b, 8, 12))) return 'image/heic';
  if (ascii(b, 4, 8) === 'ftyp') return 'audio/mp4';
  if (ascii(b, 0, 3) === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0)) return 'audio/mpeg';
  if (ascii(b, 0, 4) === 'OggS') return 'audio/ogg';
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return 'audio/webm';
  return null;
};
