// Sound for audio cards: recording from the microphone with a live waveform, and playing a clip with its real waveform,
// where the part already played fills in as it goes and a tap or a drag anywhere on it jumps there.
// A clip's shape (its peaks) is worked out once, from the file, and saved with its card, so it shows at once next time.
// Words read by the device's own voice (audio cards with no sound file) have no file to measure, so their waveform comes
// from the words, and it follows the voice word by word. db.js hands all this to the screens (db.sound, db.recording,
// and the sound actions in db.act). While something plays or records, the waveforms on the page move here, every frame
// (watch, watchMic), so the screen itself only redraws when a clip starts, pauses, or ends.
import R from './rich.js';

// A shape is PEAKS numbers from 0 (silence) to 1 (the clip's loudest moment). A card keeps it as { d: seconds, p: one
// letter per peak, in 64 steps }: about a hundred letters.
export const PEAKS = 96;
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const packWave = (peaks, dur) => ({ d: Math.round((dur || 0) * 100) / 100, p: peaks.map(v => ABC[Math.max(0, Math.min(63, Math.round(v * 63)))]).join('') });
const unpacked = {};
const unpack = w => (w && typeof w.p === 'string' && w.p.length >= 8
  ? unpacked[w.d + w.p] || (unpacked[w.d + w.p] = { peaks: [...w.p].map(ch => Math.max(0, ABC.indexOf(ch)) / 63), dur: +w.d || 0 }) : null);
const FLAT = Array(PEAKS).fill(0);
const MAX = 12e6; // bigger files still play, but aren't measured: decoding them could run a phone out of memory
const STEP = 60; // milliseconds of sound in each bar of a recording's live waveform
// n numbers from a longer (or shorter) list: the loudest in each stretch, so short sounds still show.
const fit = (list, n) => Array.from({ length: n }, (_, i) => {
  const a = Math.floor(i * list.length / n), b = Math.max(a + 1, Math.floor((i + 1) * list.length / n));
  let v = 0; for (let j = a; j < b; j++) v = Math.max(v, list[j] || 0); return v;
});

// Reads a sound file into its shape. It decodes at a low sample rate: plenty for a shape, and light on memory.
export async function shapeOf(buf) {
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  let ctx = null;
  for (const rate of [8000, 22050, 44100]) { try { ctx = new Off(1, 1, rate); break; } catch { /* this browser wants another rate */ } }
  const a = await new Promise((ok, bad) => { const p = ctx.decodeAudioData(buf, ok, bad); if (p && p.then) p.then(ok, bad); });
  const chans = Array.from({ length: a.numberOfChannels }, (_, i) => a.getChannelData(i)), n = a.length;
  // Each peak is how loud that stretch is (half its loudest moment, half its average), so speech reads as words.
  const raw = Array.from({ length: PEAKS }, (_, i) => {
    const from = Math.floor(i * n / PEAKS), to = Math.min(n, Math.max(from + 1, Math.floor((i + 1) * n / PEAKS)));
    let peak = 0, sum = 0;
    for (let j = from; j < to; j++) { let x = 0; for (const c of chans) { const y = Math.abs(c[j]); if (y > x) x = y; } if (x > peak) peak = x; sum += x * x; }
    return peak / 2 + Math.sqrt(sum / Math.max(1, to - from));
  });
  // Scaled to its loudest moment, but a near-silent clip stays low (not blown up to full height).
  const top = Math.max(.04, ...raw);
  return { peaks: raw.map(v => Math.round(Math.pow(v / top, .8) * 1000) / 1000), dur: a.duration };
}

// Words read aloud: a rise and fall for each word, louder on its vowels, with a gap between words.
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const VOWEL = /[aeiouyáéíóúàèìòùäëïöüâêîôûåæøœ぀-ヿ㐀-鿿가-힯]/i;
export function wordsShape(text) {
  const s = String(text || '').trim();
  if (!s) return FLAT;
  return Array.from({ length: PEAKS }, (_, i) => {
    const at = (i + .5) / PEAKS * s.length, k = Math.floor(at), c = s[k];
    if (/[\s.,;:!?、。，！？]/.test(c)) return .06;
    let a = k, b = k + 1;
    while (a > 0 && !/\s/.test(s[a - 1])) a--;
    while (b < s.length && !/\s/.test(s[b])) b++;
    const x = Math.min(1, Math.max(0, (at - a) / (b - a))), rise = Math.pow(Math.sin(Math.PI * x), .45);
    const wobble = .78 + .22 * Math.abs(Math.sin(c.charCodeAt(0) * 1.37 + i * .91));
    return Math.max(.1, Math.round(rise * (VOWEL.test(c) ? 1 : .72) * wobble * 1000) / 1000);
  });
}
// About how many letters a voice says in a second.
const pace = text => (CJK.test(text) ? 7 : 14);

export function createSound({ onChange, upload, measured, known }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const synth = window.speechSynthesis;
  const said = c => R.plain(c.speak || '', { join: ' ', math: 'show' }).trim();
  // Which clip: a sound file, or words for the device's voice (in a language).
  const keyOf = c => (!c ? '' : c.audio ? 'a:' + c.audio : said(c) ? 's:' + (c.lang || '') + ':' + said(c) : '');
  const shapes = {}; // a file's shape once measured: link → { peaks, dur }, or 'busy' / 'failed'
  const worded = {};
  let cur = null; // the clip playing, or paused partway: { key, clip, speech, text, on, frac, scrub, u, sp }

  // A clip's shape: saved with its card (or with another card that plays the same file), measured already, or measured
  // now (flat until then).
  function shape(c) {
    if (!c.audio) { const t = said(c); return worded[t] || (worded[t] = { peaks: wordsShape(t), dur: t.length / pace(t), guess: true }); }
    const w = unpack(c.wave) || unpack(known(c.audio));
    if (w) return w;
    const s = shapes[c.audio];
    if (s && typeof s === 'object') return s;
    if (!s) measure(c.audio);
    return { peaks: FLAT, dur: 0, busy: s !== 'failed' };
  }
  function measure(url) {
    shapes[url] = 'busy';
    fetch(url).then(r => { if (!r.ok || +r.headers.get('content-length') > MAX) throw new Error('Not measured'); return r.arrayBuffer(); })
      .then(b => { if (b.byteLength > MAX) throw new Error('Not measured'); return shapeOf(b); })
      .then(s => { shapes[url] = s; measured(url, packWave(s.peaks, s.dur)); onChange(); })
      .catch(() => { shapes[url] = 'failed'; onChange(); });
  }

  // ---------- playing ----------
  const player = new Audio();
  player.preload = 'auto';
  player.addEventListener('ended', () => { if (cur && !cur.speech) ended(); });
  // Paused from outside (another app took the sound, headphones came out).
  player.addEventListener('pause', () => { if (cur && !cur.speech && cur.on && player.paused && !player.ended) { cur.frac = pos(); cur.on = false; paint(); onChange(); } });
  player.addEventListener('error', () => { if (cur && !cur.speech && cur.on) { cur.on = false; paint(); onChange(); } });
  // How long the clip is: from its shape, or from the file once it's loading (a recording made in Chrome doesn't say).
  const durOf = () => (!cur ? 0 : shape(cur.clip).dur || (!cur.speech && isFinite(player.duration) ? player.duration : 0));
  // Where the clip is, from 0 to 1.
  function pos() {
    if (!cur) return 0;
    if (cur.scrub != null) return cur.scrub;
    if (!cur.on) return cur.frac;
    if (cur.speech) return spoken();
    const d = durOf();
    return d ? Math.min(1, player.currentTime / d) : 0;
  }
  // Where the voice is: the word it last started (the browser says), moving on at speaking pace, but not past the end
  // of that word. A voice that never says goes by time alone.
  function spoken() {
    const sp = cur.sp, text = cur.text, n = text.length || 1;
    if (!sp) return cur.frac;
    const ahead = sp.at + (performance.now() - sp.t) / 1000 * pace(text);
    if (!sp.told) return Math.min(.98, ahead / n);
    let end = sp.at; while (end < n && !/\s/.test(text[end])) end++;
    return Math.min(1, Math.min(ahead, end + 1) / n);
  }
  // The voice starts from the beginning of the word at f.
  function speakFrom(f) {
    const c = cur, text = c.text;
    let at = Math.min(text.length, Math.floor(f * text.length));
    while (at > 0 && !/\s/.test(text[at - 1])) at--;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(at));
    if (c.clip.lang) u.lang = c.clip.lang;
    c.u = u; c.sp = { at, t: performance.now(), told: false };
    u.onboundary = e => { if (c.u === u && e.name !== 'sentence') c.sp = { at: at + e.charIndex, t: performance.now(), told: true }; };
    u.onend = () => { if (c.u === u && cur === c) ended(); };
    u.onerror = e => { if (c.u === u && cur === c && !/interrupted|canceled/.test(e.error || '')) ended(); };
    synth.speak(u);
  }
  function halt() {
    if (!cur) return;
    if (cur.speech) { cur.u = null; if (cur.on && synth) synth.cancel(); } else player.pause();
    cur = null;
  }
  const start = c => { halt(); cur = { key: keyOf(c), clip: c, speech: !c.audio, text: c.audio ? '' : said(c), on: false, frac: 0, scrub: null }; };
  function ended() { cur.on = false; cur.frac = 0; cur.scrub = null; cur.u = null; paint(); onChange(); }
  function seekTo(f) { const d = durOf(); if (d) try { player.currentTime = Math.min(f, .999) * d; } catch { /* not loaded yet */ } }
  // Play a clip, or pause it if it's playing. `again`: from the start (a card that comes up plays on its own).
  function play(c, again) {
    const k = keyOf(c);
    if (!k) return;
    if (!cur || cur.key !== k || again) start(c);
    else if (cur.on) return pause();
    cur.clip = c;
    cur.on = true;
    if (cur.speech) { if (synth) speakFrom(cur.frac); else cur.on = false; }
    else {
      const url = new URL(c.audio, location.href).href;
      if (player.src !== url) player.src = url;
      seekTo(cur.frac);
      player.play().catch(() => { if (cur && cur.key === k && cur.on) { cur.on = false; paint(); onChange(); } });
    }
    loop(); onChange();
  }
  function pause() {
    if (!cur || !cur.on) return;
    cur.frac = pos(); cur.on = false;
    if (cur.speech) { cur.u = null; synth.cancel(); } else player.pause();
    paint(); onChange();
  }
  // A tap or a drag on a waveform. While dragging (`dragging`) only the waveform follows; letting go moves the sound
  // there. f null: the drag was called off (the page scrolled instead).
  function seek(c, f, dragging) {
    const k = keyOf(c);
    if (!k) return;
    if (!cur || cur.key !== k) { if (f == null) return; start(c); }
    if (dragging) { cur.scrub = f; paint(); return; }
    cur.scrub = null;
    if (f != null) {
      f = Math.min(Math.max(f, 0), .999);
      if (!cur.on) cur.frac = f;
      else if (cur.speech) speakFrom(f);
      else seekTo(f);
    }
    paint(); onChange();
  }
  // Waveforms and times on the page follow the clip playing: fn(where 0 to 1, seconds in, seconds long, playing).
  const watching = new Map();
  function watch(el, key, fn) {
    if (watching.size > 40) for (const x of watching.keys()) if (!x.isConnected) watching.delete(x);
    watching.set(el, { key, fn });
  }
  function paint() {
    const f = pos(), d = durOf();
    for (const [el, w] of watching) {
      if (!el.isConnected) watching.delete(el);
      else if (cur && w.key === cur.key) w.fn(f, f * d, d, cur.on);
    }
  }
  let raf = 0;
  function loop() {
    if (raf) return;
    const tick = () => { raf = 0; paint(); if (cur && cur.on) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }
  // What a screen shows for a clip: its shape, how long it is, and where it's at, if it's the one playing.
  function view(c) {
    const k = keyOf(c);
    if (!k) return { key: '', peaks: FLAT, dur: 0, speech: false, on: false, frac: 0, busy: false };
    const s = shape(c), here = !!cur && cur.key === k;
    return { key: k, peaks: s.peaks, dur: s.guess ? 0 : s.dur || (here ? durOf() : 0), speech: !c.audio, on: here && cur.on, frac: here ? pos() : 0, busy: !!s.busy };
  }

  // ---------- recording ----------
  let rec = null;
  const mics = new Map();
  // The first call starts recording, and gives back the clip once it's stopped and saved: { url, wave }. The next call
  // stops it. While it records, how loud the microphone is gets read every frame, for the live waveform.
  function record() {
    if (rec) { stopRecording(); return Promise.resolve(null); }
    halt(); onChange();
    // The meter starts here, while the tap that asked for it still counts (Safari wants that).
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    try { ctx = new AC(); if (ctx.resume) ctx.resume().catch(() => {}); } catch { /* no meter; the recording still works */ }
    return Promise.resolve().then(() => navigator.mediaDevices.getUserMedia({ audio: true })).then(stream => new Promise((ok, bad) => {
      let mr;
      // AAC in MP4 where the browser can make it (Safari, and Chrome since 2024), so the iPhone app can play the clip too;
      // other browsers fall back to their own format.
      const mp4 = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      try { mr = mp4 ? new MediaRecorder(stream, { mimeType: mp4 }) : new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(x => x.stop()); return bad(e); }
      const chunks = [];
      let an = null, buf = null;
      if (ctx) { an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an); buf = new Float32Array(an.fftSize); }
      const r = rec = { t0: performance.now(), levels: [], now: 0, shown: 0, next: STEP, saving: false, discard: false, secs: 0 };
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(x => x.stop());
        if (ctx) ctx.close().catch(() => {});
        let out = null;
        try {
          const blob = new Blob(chunks, { type: (mr.mimeType || 'audio/webm').split(';')[0] });
          if (!r.discard && blob.size) {
            let s = null;
            try { s = await shapeOf(await blob.arrayBuffer()); } catch { /* this browser can't read its own recording back */ }
            // Then its shape is the levels the live waveform showed.
            if (!s || !(s.dur > 0)) { const lv = fit(r.levels, PEAKS), top = Math.max(.2, ...lv); s = { peaks: lv.map(v => v / top), dur: r.secs }; }
            const url = await upload(blob);
            if (url) { shapes[url] = s; out = { url, wave: packWave(s.peaks, s.dur) }; }
          }
        } catch { alert('Couldn’t save the recording. Try again.'); }
        rec = null; onChange();
        ok(out);
      };
      r.stop = discard => {
        if (r.saving) return;
        r.saving = true; r.discard = !!discard; r.secs = (performance.now() - r.t0) / 1000;
        try { mr.stop(); } catch { mr.onstop(); }
        onChange();
      };
      mr.start();
      listen(an, buf);
      onChange();
    })).catch(() => { rec = null; if (ctx) ctx.close().catch(() => {}); alert('Your browser didn’t allow the microphone.'); onChange(); return null; });
  }
  // Every frame: how loud it is now (the loudest moment of each 60 ms makes a bar). The bars rise and settle smoothly
  // and slide along as it records; with reduced motion they just show the levels.
  function listen(an, buf) {
    const tick = () => {
      const r = rec;
      if (!r || r.saving) return;
      const ms = performance.now() - r.t0;
      let level = 0;
      if (an) {
        if (an.getFloatTimeDomainData) an.getFloatTimeDomainData(buf);
        else { const b = new Uint8Array(buf.length); an.getByteTimeDomainData(b); b.forEach((x, i) => { buf[i] = (x - 128) / 128; }); }
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        level = Math.min(1, Math.pow(Math.sqrt(sum / buf.length) * 5, .7));
      }
      r.now = Math.max(r.now, level);
      while (ms >= r.next) { r.levels.push(r.now); r.now = level; r.next += STEP; }
      const calm = reduce.matches;
      r.shown = calm ? r.now : r.shown + (r.now - r.shown) * .45;
      const slide = calm ? 0 : 1 - (r.next - ms) / STEP;
      for (const [el, fn] of mics) { if (!el.isConnected) mics.delete(el); else fn(r.levels, r.shown, slide, ms / 1000); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const stopRecording = discard => { if (rec && rec.stop) rec.stop(discard); };
  const recording = () => (rec ? { saving: rec.saving, levels: rec.levels.slice(-100), level: rec.shown, secs: rec.saving ? rec.secs : (performance.now() - rec.t0) / 1000 } : null);
  // The live waveform and time on the page: fn(levels so far, the level now, how far the bars have slid, seconds).
  const watchMic = (el, fn) => mics.set(el, fn);

  // A sound file you upload is measured here first, then sent.
  async function pick(choose) {
    const f = await choose('audio/*');
    if (!f) return null;
    let s = null;
    try { if (f.size <= MAX) s = await shapeOf(await f.arrayBuffer()); } catch { /* measured later, if this browser can read it */ }
    const url = await upload(f);
    if (!url) return null;
    if (s) shapes[url] = s;
    return { url, wave: s ? packWave(s.peaks, s.dur) : null };
  }

  return { view, play, seek, watch, record, stopRecording, recording, watchMic, pick };
}
