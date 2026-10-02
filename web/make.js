// Making cards from anything, in the page (the server side is web/make.mjs). A person picks a source (a file, pictures, a
// recording, pasted text, a YouTube link, or a topic in words), a few options, watches it work, checks the new cards, and saves them.
// This is the flow's memory and what it does; the screens (WebMake and PhoneMake, boards on the canvas) only draw `view()`.
//
// The flow:  pick  ->  add (the source, and the options under it)  ->  making  ->  review  ->  (saved: off to the deck)
//                                                                       \->  error (plain words, and a way to go on)
// Making is a few requests, so a big source never meets a time limit: the files go up (small ones through this server, big
// ones straight to storage), `start` reads them, `step` runs once for each part (three at a time), `finish` joins the cards.
import { splitAudio, fromBlob, PART_BYTES, PART_SECONDS } from './audiosplit.js';

export function createMake({ state, reload, changed, go, sniff, shrink }) {
  const info = () => ((state() || {}).make) || { on: false, video: false, perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20, audioMB: 25, cards: 100 };
  const fresh = () => ({ key: '', step: 'pick', kind: '', files: [], text: '', topic: '', url: '', transcript: false, title: '',
    opts: { count: 'auto', basic: true, cloze: true, audio: false, lang: '', deckId: '', deckName: '' }, rec: null, job: '', progress: { word: '', i: 0, n: 1 }, cards: [], notes: null, keepNotes: true, noNotes: false, editing: '', error: null, from: null, saving: false, seconds: [] });
  let M = fresh(), run = 0, rec = null;
  const bump = () => changed();

  // ---------- small helpers ----------
  const mb = n => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1000)) + ' KB');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const EXT = f => ((/\.([A-Za-z0-9]{1,5})$/.exec(f.name || '') || [])[1] || '').toLowerCase();
  const DOC = new Set(['pdf', 'pptx', 'docx', 'txt', 'md', 'srt', 'vtt']), IMG = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']), AUD = new Set(['mp3', 'm4a', 'mp4', 'wav', 'ogg', 'oga', 'opus', 'webm', 'aac', 'flac']);
  const familyOf = f => { const e = EXT(f), t = String(f.type || ''); return DOC.has(e) ? 'doc' : IMG.has(e) || /^image\//.test(t) ? 'image' : AUD.has(e) || /^audio\//.test(t) ? 'audio' : ''; };
  const call = async (url, body, method = 'POST') => {
    let r;
    try { r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body || {}), cache: 'no-store' }); }
    catch { throw Object.assign(new Error('Couldn’t reach Lucida. Check your connection and try again.'), { network: true }); }
    if (r.status === 401) { location.assign('/sign-in?next=' + encodeURIComponent(location.pathname + location.search)); throw new Error('Signed out'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Try again.'), { status: r.status, code: j.code || '', pro: !!j.pro });
    return j;
  };
  // An error is worth trying again when the AI or the network was the trouble (a limit or a bad file will say the same again).
  const again = e => !e.code || ['ai', 'busy', 'off'].includes(e.code);
  const words = { file: 'Reading your file…', photo: 'Reading your pictures…', record: 'Listening to your recording…', paste: 'Reading your text…', video: 'Watching the video…', topic: 'Thinking about your topic…' };

  // ---------- starting ----------
  // Opens the flow. `from`: more cards from a source ({ deckId, id }); `guide`: the words of a Guide page to make cards from.
  // Called again with the same address it changes nothing, so a page can ask on every draw.
  function enter(o = {}) {
    const key = JSON.stringify([o.kind || '', o.deckId || '', o.from || '', o.guide || '', o.page || '']);
    // A flow begun with words in hand (begin) is kept as it is when its page opens.
    if (M.hold) { M.hold = false; M.key = key; return; }
    if (M.key === key) return;
    if (M.step === 'making' || M.step === 'review') { M.key = key; return; }
    M = fresh(); M.key = key;
    if (o.deckId) M.opts.deckId = o.deckId;
    const decks = (state() || {}).decks || [];
    if (o.from && o.deckId) {
      const d = decks.find(x => x.id === o.deckId), s = d && (d.sources || []).find(x => x.id === o.from);
      if (s) { M.from = { deckId: d.id, id: s.id, name: s.name, kind: s.kind }; M.kind = s.kind === 'photo' ? 'photo' : s.kind === 'recording' ? 'record' : s.kind === 'video' ? 'video' : s.kind === 'text' ? 'paste' : s.kind === 'topic' ? 'topic' : 'file'; M.step = 'add'; }
    } else if (o.guide) {
      const d = decks.find(x => x.id === o.guide), g = (d && d.guide) || { text: '', pages: [] }, p = o.page && o.page !== 'main' ? (g.pages || []).find(x => x.id === o.page) : null, text = p ? p.text : g.text;
      if (d && text && text.trim()) { M.kind = 'paste'; M.text = text; M.title = d.name + (p ? ': ' + p.title : ' Guide'); M.step = 'add'; M.opts.deckId = d.id; M.noNotes = true; }
    } else if (['file', 'photo', 'record', 'paste', 'video', 'topic'].includes(o.kind)) { M.kind = o.kind; M.step = 'add'; }
  }
  // Starts from words the page already has (the Guide editor's selection, say).
  function begin(o) { M = fresh(); Object.assign(M, o, { opts: { ...M.opts, ...(o.opts || {}) } }); M.hold = true; if (o.kind) M.step = 'add'; bump(); go('/make' + (o.opts && o.opts.deckId ? '?deck=' + encodeURIComponent(o.opts.deckId) : '')); }
  const choose = kind => { M.kind = kind; M.step = 'add'; M.error = null; bump(); };
  const back = () => {
    if (M.step === 'add' && !M.from) { M.step = 'pick'; M.kind = ''; M.files = []; M.error = null; }
    else if (M.step === 'error') M.step = M.job ? 'making' : 'add';
    bump();
  };

  // ---------- adding things to make cards from ----------
  const askFiles = (accept, multiple, capture) => new Promise(ok => {
    const i = document.createElement('input'), done = list => { i.remove(); ok(list); };
    i.type = 'file'; i.accept = accept; i.multiple = !!multiple; i.hidden = true;
    if (capture) i.setAttribute('capture', 'environment');
    i.onchange = () => done([...i.files]); i.addEventListener('cancel', () => done([])); document.body.appendChild(i); i.click();
  });
  const ACCEPT = { file: '.pdf,.pptx,.docx,.txt,.md,.srt,.vtt,image/*,audio/*', photo: 'image/*', record: 'audio/*' };
  async function pickFiles(capture = false) {
    const list = await askFiles(ACCEPT[M.kind] || ACCEPT.file, M.kind !== 'record' && !capture, capture);
    if (list.length) await addFiles(list);
  }
  async function addFiles(list) {
    const lim = info(), have = M.files.slice(), tip = [];
    for (const f of list) {
      const fam = familyOf(f);
      if (/\.hei[cf]$/i.test(f.name) || /hei[cf]/i.test(f.type)) { tip.push('That photo is in a format Lucida can’t read (HEIC). Pick a JPEG or PNG picture.'); continue; }
      if (!fam) { tip.push('Lucida can’t read that kind of file. Try a PDF, slides, a Word file, captions, pictures, or a recording.'); continue; }
      if (have.length && (have[0].fam !== fam || fam === 'doc')) { tip.push(fam === 'doc' || have[0].fam === 'doc' ? 'Pick one document at a time.' : 'Pick one kind of file at a time: pictures, or a recording, or one document.'); continue; }
      let file = f, cut = null;
      if (fam === 'image') { try { file = (await shrink(f)) || f; } catch { file = f; } }
      if (fam === 'audio') {
        // A recording the speech service can't take in one go (over its size, or more than ten minutes) is cut into parts here, before it is sent.
        let why = null;
        try { cut = await splitAudio(fromBlob(f), { bytes: Math.min(PART_BYTES, lim.audioMB * 1e6, lim.fileMB * 1e6), seconds: PART_SECONDS }); } catch (e) { why = e; }
        if (cut && cut.seconds > lim.minutes * 60 * 1.03) { tip.push(longRecording(cut.seconds, lim)); continue; }
        if (cut && cut.parts.length > 100) { tip.push('That recording would go up in ' + cut.parts.length + ' parts, and Lucida takes up to 100. Save it as an MP3 or M4A first, which is much smaller.'); continue; }
        if (cut && cut.whole) cut = null;
        if (!cut && f.size > lim.audioMB * 1e6) { tip.push(bigRecording(f.size, lim, why)); continue; }
      } else if (file.size > lim.fileMB * 1e6) { tip.push('That file is over ' + lim.fileMB + ' MB.' + (lim.fileMB < 40 ? ' Go Pro for up to 40 MB.' : '')); continue; }
      if (fam === 'image' && have.length >= lim.photos) { tip.push('That’s the most pictures for one make (' + lim.photos + ').'); continue; }
      have.push({ file, name: f.name || 'File', size: file.size, type: file.type || f.type, fam, ...(cut ? { cut } : {}) });
    }
    M.files = have; M.error = tip.length ? { message: tip[0], soft: true } : null; bump();
  }
  // What to say about a recording that is too long or too big to read (the server says the same when asked directly).
  const longRecording = (secs, lim) => 'That recording is ' + plural(Math.round(secs / 60), 'minute') + ' long. ' + (lim.minutes < 120 ? 'Free makes from up to ' + lim.minutes + ' minutes at a time. Go Pro for up to 120.' : 'Pro makes from up to ' + lim.minutes + ' minutes at a time.');
  const bigRecording = (size, lim, why) => 'That recording is ' + mb(size) + ', and Lucida reads up to ' + lim.audioMB + ' MB at a time. ' + (why && why.code === 'unsupported'
    ? 'It cuts MP3, WAV, Ogg, AAC and M4A recordings into parts by itself, but not this kind. Save it as an MP3 or M4A, or pick shorter recordings.' : 'It couldn’t read this one to cut it into parts. Save it again as an MP3 or M4A, or pick shorter recordings.');
  const baseName = n => String(n || 'Recording').replace(/\.[A-Za-z0-9]{1,5}$/, '').slice(0, 100) || 'Recording';
  const partName = (name, i, n, ext) => baseName(name) + ' (part ' + i + ' of ' + n + ').' + ext;
  const removeFile = i => { M.files = M.files.filter((_, n) => n !== i); M.error = null; bump(); };
  const setText = v => { M.text = String(v ?? ''); M.error = null; bump(); };
  const setTopic = v => { M.topic = String(v ?? ''); M.error = null; bump(); };
  const setUrl = v => { M.url = String(v ?? '').trim(); M.error = null; bump(); };
  const useTranscript = on => { M.transcript = !!on; M.error = null; bump(); };
  // The kinds of card: at least one stays on. Audio only counts while a language is set; without one it is off (and a person who had only audio on gets the usual kinds back).
  const setOpt = (k, v) => {
    const o = { ...M.opts, [k]: v };
    if (k === 'lang' && !v) o.audio = false;
    const on = ['basic', 'cloze'].filter(x => o[x]).length + (o.audio && o.lang ? 1 : 0);
    if (!on) { if (k === 'lang') { o.basic = true; o.cloze = true; } else return; }
    M.opts = o; bump();
  };
  const setKeepNotes = on => { M.keepNotes = !!on; bump(); };
  // Whether the deck the cards go into already has every page a Guide may have: then the notes can't be added (the server would keep the cards and drop the notes).
  const deckFull = () => { const d = ((state() || {}).decks || []).find(x => x.id === M.opts.deckId), g = d && d.guide, pages = (g && g.pages) || []; return !!(g && (String(g.text || '').trim() || pages.length) && pages.length >= (info().guidePages || 10)); };

  // ---------- recording a lecture ----------
  // The microphone, one file for every ten minutes (a long recording is several files, so no one request is long: the speech service gives up after a
  // minute); Pause and Resume; Stop makes the cards. The level is read from the microphone for a quiet meter.
  const SEGMENT = 10 * 60;
  const typeOf = () => ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  async function recStart() {
    if (rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { M.error = { message: 'This browser can’t record. Choose a recording file instead.', soft: true }; return bump(); }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { M.error = { message: 'Lucida can’t use the microphone. Allow it in your browser’s settings, then try again.', soft: true }; return bump(); }
    const type = typeOf(), r = rec = { stream, type, segs: [], mr: null, t0: 0, paused: 0, pausedAt: 0, state: 'recording', timer: 0, an: null, ctx: null, level: 0, levels: [] };
    try { const AC = window.AudioContext || window.webkitAudioContext; r.ctx = new AC(); r.an = r.ctx.createAnalyser(); r.an.fftSize = 1024; r.ctx.createMediaStreamSource(stream).connect(r.an); } catch { r.an = null; }
    const next = () => {
      const chunks = [], mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24000 });
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = () => { if (chunks.length) r.segs.push(new Blob(chunks, { type: (mr.mimeType || type || 'audio/webm').split(';')[0] })); r.flush && r.flush(); };
      mr.start(1000); r.mr = mr; r.segStart = performance.now(); r.segPaused = 0;
    };
    r.next = next; next(); r.t0 = performance.now();
    const buf = r.an ? new Float32Array(r.an.fftSize) : null;
    r.timer = setInterval(() => {
      const secs = recSecs();
      if (r.an && r.state === 'recording') { r.an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; r.level = Math.min(1, Math.pow(Math.sqrt(s / buf.length) * 5, .7)); r.levels.push(r.level); if (r.levels.length > 60) r.levels.shift(); }
      // A new file every ten minutes: the old one is finished first, so each is a whole recording of its own.
      if (r.state === 'recording' && performance.now() - r.segStart - r.segPaused > SEGMENT * 1000) { const old = r.mr; old.stop(); next(); }
      // The plan's limit: it stops by itself, and says so.
      if (secs >= info().minutes * 60) { M.error = { message: 'That’s the ' + plural(info().minutes, 'minute') + ' limit for one make.', soft: true }; recStop(); return; }
      bump();
    }, 250);
    M.rec = true; M.error = null; bump();
  }
  const recSecs = () => (rec ? ((rec.state === 'paused' ? rec.pausedAt : performance.now()) - rec.t0 - rec.paused) / 1000 : 0);
  function recPause() { if (!rec || rec.state !== 'recording') return; try { rec.mr.pause(); } catch { return; } rec.state = 'paused'; rec.pausedAt = performance.now(); bump(); }
  function recResume() { if (!rec || rec.state !== 'paused') return; try { rec.mr.resume(); } catch { return; } const gap = performance.now() - rec.pausedAt; rec.paused += gap; rec.segPaused += gap; rec.state = 'recording'; bump(); }
  function recEnd(discard) {
    if (!rec) return Promise.resolve([]);
    const r = rec; rec = null; clearInterval(r.timer); M.rec = null; M.seconds = [Math.round((r.state === 'paused' ? r.pausedAt : performance.now()) - r.t0 - r.paused) / 1000];
    return new Promise(done => {
      const fin = () => { r.stream.getTracks().forEach(t => t.stop()); if (r.ctx) r.ctx.close().catch(() => {}); done(discard ? [] : r.segs); };
      r.flush = fin;
      try { if (r.mr.state !== 'inactive') r.mr.stop(); else fin(); } catch { fin(); }
    });
  }
  async function recStop() {
    const blobs = await recEnd(false);
    if (!blobs.length) { bump(); return; }
    const ext = /mp4/.test(blobs[0].type) ? 'm4a' : /ogg/.test(blobs[0].type) ? 'ogg' : 'webm', when = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    M.files = blobs.map((b, i) => ({ file: new File([b], 'Recording ' + (i + 1) + '.' + ext, { type: b.type }), name: 'Recording ' + (i + 1) + '.' + ext, size: b.size, type: b.type, fam: 'audio' }));
    M.title = M.title || 'Lecture · ' + when;
    M.seconds = [];
    make();
  }
  const recDiscard = async () => { await recEnd(true); bump(); };

  // ---------- making ----------
  const sourceBody = () => {
    // (Audio cards are for learning a language, so they only go along when a language is set. Notes are asked for with the cards, except from a Guide page, which already is notes.)
    const o = M.opts, options = { count: o.count, kinds: [o.basic && 'basic', o.cloze && 'cloze', o.audio && o.lang && 'audio'].filter(Boolean), lang: o.lang, deckId: o.deckId, deckName: o.deckName, notes: !M.noNotes };
    if (M.from) return { fromSource: { deckId: M.from.deckId, id: M.from.id }, options };
    if (M.kind === 'topic') return { kind: 'topic', topic: M.topic, options };
    if (M.kind === 'video') return { kind: 'video', url: M.url, ...(M.transcript ? { text: M.text } : {}), ...(M.title ? { title: M.title } : {}), options };
    if (M.kind === 'paste') return { kind: 'text', text: M.text, title: M.title, options };
    return { kind: M.kind === 'record' ? 'recording' : M.kind === 'photo' ? 'photo' : 'file', title: M.title, options };
  };
  const ready = () => {
    if (M.from) return true;
    if (M.kind === 'topic') return M.topic.trim().length >= 2;
    if (M.kind === 'paste') return M.text.trim().length >= 20;
    if (M.kind === 'video') return M.transcript ? M.text.trim().length >= 20 && /youtu/.test(M.url) : /youtu/.test(M.url);
    return M.files.length > 0;
  };
  async function sendFile(f) {
    const r = await call('/api/make/upload', { name: f.name, type: f.type, size: f.size });
    let put;
    try { put = await fetch(r.put.url, { method: 'PUT', headers: r.put.headers, body: f.file }); }
    catch { throw Object.assign(new Error('Couldn’t send your file. Check your connection and try again.'), { network: true }); }
    if (put.status === 401) { location.assign('/sign-in?next=' + encodeURIComponent(location.pathname + location.search)); throw new Error('Signed out'); }
    if (!put.ok) throw Object.assign(new Error(put.status === 413 ? 'That file is too big to send.' : 'Couldn’t send your file. Try again.'), { status: put.status });
    return r.id;
  }
  // Each part, up to three at a time; a part that fails because of the network or the AI is tried again twice.
  async function steps(job, phase, n, mine, word) {
    let next = 0, done = 0;
    M.progress = { word, phase, i: 0, n };
    const worker = async () => {
      while (next < n && mine === run) {
        const i = next++;
        for (let tries = 0; ; tries++) {
          try { await call('/api/make/step', { job, phase, i }); break; }
          catch (e) { if (mine !== run) return; if (tries >= 2 || (e.status && e.status < 500 && e.status !== 429) || e.code === 'gone') throw e; await new Promise(r => setTimeout(r, 900 * (tries + 1))); }
        }
        done++; if (mine === run) { M.progress = { word, phase, i: done, n }; bump(); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, n) }, worker));
  }
  async function make() {
    if (!ready() || M.step === 'making') return;
    const mine = ++run, body = sourceBody();
    M.step = 'making'; M.error = null; M.cards = []; M.job = ''; M.progress = { word: M.files.length ? 'Sending your ' + (M.kind === 'photo' ? 'pictures' : M.kind === 'record' ? 'recording' : 'file') + '…' : words[M.kind] || 'Getting ready…', phase: 'send', i: 0, n: 1 }; bump();
    try {
      if (!M.from && ['file', 'photo', 'record'].includes(M.kind)) {
        // (A recording that was cut is sent a part at a time; the parts go to the server in order and are put back together there.)
        const list = M.files.flatMap(f => (f.cut ? f.cut.parts.map(p => ({ part: p, cut: f.cut, name: partName(f.name, p.i + 1, f.cut.parts.length, f.cut.ext) })) : [f]));
        const ids = [], seconds = [];
        for (const u of list) {
          let f = u;
          if (u.part) { const blob = await u.part.blob(); f = { file: blob, name: u.name, size: blob.size, type: u.cut.mime }; seconds.push(Math.round(u.part.seconds * 100) / 100); } else seconds.push(0);
          ids.push(await sendFile(f)); if (mine !== run) return; M.progress = { ...M.progress, i: ids.length, n: list.length }; bump();
        }
        body.uploads = ids;
        if (M.kind === 'record' && M.seconds.length) body.seconds = M.seconds; else if (seconds.some(Boolean)) body.seconds = seconds;
        const cutOnes = M.files.filter(f => f.cut);
        if (!body.title && cutOnes.length === 1 && M.files.length === 1) body.title = baseName(cutOnes[0].name);
      }
      M.progress = { word: words[M.kind] || 'Getting ready…', phase: 'start', i: 0, n: 1 }; bump();
      const s = await call('/api/make/start', body); if (mine !== run) return;
      M.job = s.job; M.name = s.name; try { sessionStorage.setItem('lucida.make', s.job); } catch { /* private window */ }
      let parts = s.parts;
      if (s.phase === 'read') {
        await steps(s.job, 'read', s.read, mine, words[M.kind] || 'Reading…'); if (mine !== run) return;
        parts = (await call('/api/make/plan', { job: s.job })).parts; if (mine !== run) return;
      }
      await steps(s.job, 'write', parts, mine, 'Writing cards…'); if (mine !== run) return;
      const f = await call('/api/make/finish', { job: s.job }); if (mine !== run) return;
      M.cards = f.cards.map(c => ({ ...c, key: 'k' + c.k, gone: false })); M.notes = f.notes || null; M.keepNotes = true; M.title = M.title || f.name; M.step = 'review'; bump();
    } catch (e) {
      if (mine !== run) return;
      M.step = 'error'; M.error = { message: e.message || 'Something went wrong. Try again.', pro: !!e.pro, code: e.code || '', network: !!e.network, again: !!M.job && again(e) }; bump();
    }
  }
  // Stops what's being made. The server gives today's make back if nothing was made yet.
  async function cancel() {
    run++; const job = M.job; const was = M.step;
    if (rec) await recEnd(true);
    M.step = M.kind ? 'add' : 'pick'; M.job = ''; M.error = null; M.cards = []; M.progress = { word: '', i: 0, n: 1 }; bump();
    try { sessionStorage.removeItem('lucida.make'); } catch { /* private window */ }
    if (job) call('/api/make/cancel', { job }).catch(() => {});
    return was;
  }
  // Tries the same thing again: from the part that failed (what was made is kept), or from the start.
  async function retry() { const job = M.job; if (job && M.error && M.error.again) { M.step = 'making'; M.error = null; const mine = ++run; bump(); try { await continueJob(job, mine); } catch (e) { if (mine === run) { M.step = 'error'; M.error = { message: e.message, pro: !!e.pro, code: e.code || '', again: again(e) }; bump(); } } } else { M.step = M.kind ? 'add' : 'pick'; M.error = null; M.job = ''; bump(); } }
  async function continueJob(job, mine) {
    const s = await call('/api/make/job', null, 'GET');
    if (!s.job || s.job !== job) throw Object.assign(new Error('That make isn’t there anymore. Start again.'), { code: 'gone' });
    let parts = s.parts;
    if (s.phase === 'read') { await steps(job, 'read', s.read, mine, words[M.kind] || 'Reading…'); if (mine !== run) return; parts = (await call('/api/make/plan', { job })).parts; }
    await steps(job, 'write', parts, mine, 'Writing cards…'); if (mine !== run) return;
    const f = await call('/api/make/finish', { job }); if (mine !== run) return;
    M.cards = f.cards.map(c => ({ ...c, key: 'k' + c.k, gone: false })); M.notes = f.notes || null; M.keepNotes = true; M.step = 'review'; bump();
  }

  // ---------- checking the cards ----------
  const edit = (key, patch) => { M.cards = M.cards.map(c => (c.key === key ? { ...c, ...patch } : c)); bump(); };
  const openCard = key => { M.editing = M.editing === key ? '' : key; bump(); };
  const remove = (key, gone = true) => { M.cards = M.cards.map(c => (c.key === key ? { ...c, gone } : c)); if (M.editing === key) M.editing = ''; bump(); };
  async function save() {
    if (M.saving) return;
    const keep = M.cards.filter(c => !c.gone).map(({ kind, front, back, text, at, speak, lang }) => ({ kind, front, back, text, at, ...(kind === 'audio' ? { speak, lang } : {}) }));
    if (!keep.length) { M.error = { message: 'There are no cards to save.', soft: true }; return bump(); }
    M.saving = true; M.error = null; bump();
    try {
      const o = M.opts, deck = o.deckId ? { id: o.deckId } : { name: o.deckName.trim() || M.title || M.name || 'New deck' };
      const r = await call('/api/make/save', { job: M.job, deck, cards: keep, ...(M.notes ? { notes: M.keepNotes && !deckFull() } : {}) });
      try { sessionStorage.removeItem('lucida.make'); } catch { /* private window */ }
      const id = r.deckId; M = fresh(); await reload(); bump(); go('/deck/' + id);
    } catch (e) { M.saving = false; M.error = { message: e.message, pro: !!e.pro, code: e.code || '', soft: true }; bump(); }
  }
  async function discard() { await cancel(); M = fresh(); bump(); go('/library'); }
  const close = () => { if (M.step === 'making') return; if (rec) recEnd(true); const was = M.from; M = fresh(); bump(); go(was ? '/deck/' + was.deckId : '/library'); };

  // ---------- questions for a Live game, about a topic ----------
  // The same steps as making cards (so the same limits count: today's makes), with nothing to check: the page that asked opens the room
  // with the questions. `say` gets what to tell the person. Resolves with { job, name, cards } (each card carries its question's four
  // answers), or null when it was cancelled. "Save as a deck" later keeps them (saveQuiz).
  let quizRun = 0, quizJob = '';
  async function quiz(topic, count, say) {
    const mine = ++quizRun;
    say('Thinking about your topic…');
    const s = await call('/api/make/start', { kind: 'topic', topic, options: { count, kinds: ['basic'], mode: 'quiz' } });
    quizJob = s.job;
    if (mine !== quizRun) { call('/api/make/cancel', { job: s.job }).catch(() => {}); return null; }
    say('Writing your questions…');
    for (let tries = 0; ; tries++) {
      try { await call('/api/make/step', { job: s.job, phase: 'write', i: 0 }); break; }
      catch (e) { if (mine !== quizRun) return null; if (tries >= 2 || (e.status && e.status < 500 && e.status !== 429) || e.code === 'gone') throw e; await new Promise(r => setTimeout(r, 900 * (tries + 1))); }
    }
    if (mine !== quizRun) return null;
    const f = await call('/api/make/finish', { job: s.job });
    if (mine !== quizRun) return null;
    quizJob = '';
    return { job: s.job, name: f.name, cards: f.cards };
  }
  // Stops the questions being written. The server gives today's make back if nothing was written yet.
  function cancelQuiz() { quizRun++; const job = quizJob; quizJob = ''; if (job) call('/api/make/cancel', { job }).catch(() => {}); }
  // Keeps a game's questions as a deck (each question is a card; its four answers stay with it, so Learn mode and Live use them again).
  async function saveQuiz(job, name, cards) {
    const r = await call('/api/make/save', { job, deck: { name }, cards });
    try { sessionStorage.removeItem('lucida.make'); } catch { /* private window */ }
    await reload();
    return r.deckId;
  }

  // ---------- what a screen draws ----------
  function view() {
    const lim = info(), secs = recSecs();
    return {
      step: M.step, kind: M.kind, from: M.from, on: lim.on !== false, videoOn: !!lim.video, limits: lim,
      files: M.files.map((f, i) => ({ i, name: f.name, size: mb(f.size) + (f.cut ? ' · ' + plural(f.cut.parts.length, 'part') : ''), fam: f.fam })), text: M.text, topic: M.topic, url: M.url, transcript: M.transcript, title: M.title, opts: M.opts,
      rec: M.rec ? { state: rec ? rec.state : 'saving', secs, levels: rec ? rec.levels.slice() : [], level: rec ? rec.level : 0, limit: lim.minutes * 60 } : null,
      notes: M.notes, keepNotes: M.keepNotes, notesFull: !!M.notes && deckFull(), progress: M.progress, cards: M.cards, editing: M.editing, error: M.error, saving: M.saving, ready: ready(), name: M.name || '', job: M.job
    };
  }
  return { view, enter, begin, choose, back, close, pickFiles, addFiles, removeFile, setText, setTopic, setUrl, useTranscript, setOpt, setKeepNotes, recStart, recPause, recResume, recStop, recDiscard,
    make, cancel, retry, edit, openCard, remove, save, discard, mb, quiz, cancelQuiz, saveQuiz };
}
