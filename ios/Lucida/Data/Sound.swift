// Sound for audio cards (web/sound.js, ported): recording from the microphone with a live waveform, and playing a clip
// with its real waveform, where the part already played fills in as it goes and a tap or a drag on it jumps there.
// A clip's shape (its peaks) is worked out once, from the file, and saved with its card, so it shows at once next time.
// Words read by the device's own voice (audio cards with no sound file) have no file to measure, so their waveform comes
// from the words, and it follows the voice word by word. While a clip plays, the waveforms on screen follow it every
// frame (see SoundViews.swift); the screens themselves only redraw when a clip starts, pauses, or ends.
import AVFoundation
import CryptoKit
import SwiftUI

/// What plays: a sound file (with its saved waveform), or words for the device's voice, in a language.
struct Clip: Equatable {
  var audio: String? = nil
  var wave: Wave? = nil
  var speak = ""
  var lang = ""
  /// The words the voice says.
  var said: String { Rich.plain(speak, join: " ", showMath: true).trimmingCharacters(in: .whitespacesAndNewlines) }
  var file: String? { audio.flatMap { $0.isEmpty ? nil : $0 } }
  var speech: Bool { file == nil }
  /// Which clip this is: a file, or words in a language ("" when there's nothing to play).
  var key: String { if let f = file { return "a:" + f }; let s = said; return s.isEmpty ? "" : "s:" + lang + ":" + s }
}

/// A clip's shape: peaks from 0 (silence) to 1 (its loudest moment), and how long it is. `guess`: worked out from words.
struct SoundShape: Equatable { var peaks: [Double]; var dur: Double; var guess = false; var busy = false }

/// What a player shows for a clip (web db.sound): its shape, its length, and where it's at, if it's the one playing.
struct SoundVM: Equatable {
  var key = "", peaks: [Double] = WaveCode.flat, dur: Double = 0, speech = false, on = false, frac: Double = 0, busy = false
  /// How long the clip is, rounded (a clip under a second still says 0:01).
  var total: String { WaveCode.clock(dur > 0 ? max(1, dur.rounded()) : 0) }
  var hasTime: Bool { !speech && dur > 0 }
}

/// A recording under way: the levels so far (one per 60 ms), the level now, how far the bars have slid, and the time.
struct RecView { var levels: [Double] = [], level: Double = 0, slide: Double = 0, secs: Double = 0, saving = false }

enum WaveCode {
  /// A shape has 96 peaks; a card keeps it as about a hundred letters, one per peak, in 64 steps.
  static let count = 96
  static let abc = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
  static let flat = [Double](repeating: 0, count: count)
  static func pack(_ peaks: [Double], _ dur: Double) -> Wave {
    Wave(d: (dur * 100).rounded() / 100, p: String(peaks.map { abc[max(0, min(63, Int(($0 * 63).rounded())))] }))
  }
  static func unpack(_ w: Wave?) -> SoundShape? {
    guard let w, w.p.count >= 8 else { return nil }
    return SoundShape(peaks: w.p.map { ch in Double(abc.firstIndex(of: ch) ?? 0) / 63 }, dur: max(0, w.d))
  }
  /// n numbers from a longer (or shorter) list: the loudest in each stretch, so short sounds still show.
  static func fit(_ list: [Double], _ n: Int) -> [Double] {
    guard !list.isEmpty else { return [Double](repeating: 0, count: n) }
    return (0..<n).map { i in
      let a = i * list.count / n, b = max(a + 1, (i + 1) * list.count / n)
      return list[min(a, list.count - 1)..<min(b, list.count)].max() ?? 0
    }
  }
  /// Seconds as 0:07.
  static func clock(_ s: Double) -> String { let s = max(0, Int(s.isFinite ? s.rounded(.down) : 0)); return "\(s / 60):" + String(format: "%02d", s % 60) }

  /// Reads a sound file into its shape: each peak is how loud that stretch is (half its loudest moment, half its
  /// average), so speech reads as words; scaled to the clip's loudest moment, but a near-silent clip stays low.
  static func shape(of url: URL) throws -> SoundShape {
    let f = try AVAudioFile(forReading: url)
    let fmt = f.processingFormat, n = Int(f.length), chans = Int(fmt.channelCount)
    guard n > 0, chans > 0, let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: 16384) else { throw CocoaError(.fileReadCorruptFile) }
    var peak = [Float](repeating: 0, count: count), sum = [Double](repeating: 0, count: count), seen = [Int](repeating: 0, count: count)
    var at = 0
    while at < n {
      try f.read(into: buf, frameCount: min(16384, AVAudioFrameCount(n - at)))
      let m = Int(buf.frameLength)
      guard m > 0, let data = buf.floatChannelData else { break }
      for j in 0..<m {
        var x: Float = 0
        for c in 0..<chans { let y = abs(data[c][j]); if y > x { x = y } }
        let bin = min(count - 1, (at + j) * count / n)
        if x > peak[bin] { peak[bin] = x }
        sum[bin] += Double(x * x); seen[bin] += 1
      }
      at += m
    }
    let raw = (0..<count).map { Double(peak[$0]) / 2 + (sum[$0] / Double(max(1, seen[$0]))).squareRoot() }
    let top = max(0.04, raw.max() ?? 0)
    return SoundShape(peaks: raw.map { (pow($0 / top, 0.8) * 1000).rounded() / 1000 }, dur: Double(n) / fmt.sampleRate)
  }

  // Words read aloud: a rise and fall for each word, louder on its vowels, with a gap between words.
  private static func cjk(_ u: UInt16) -> Bool { (0x3040...0x30FF).contains(u) || (0x3400...0x9FFF).contains(u) || (0xAC00...0xD7AF).contains(u) }
  private static func space(_ u: UInt16) -> Bool { UnicodeScalar(u).map { Character($0).isWhitespace } ?? false }
  private static func vowel(_ u: UInt16) -> Bool {
    cjk(u) || (UnicodeScalar(u).map { "aeiouyáéíóúàèìòùäëïöüâêîôûåæøœ".contains(Character($0).lowercased()) } ?? false)
  }
  static func words(_ text: String) -> [Double] {
    let s = Array(text.trimmingCharacters(in: .whitespacesAndNewlines).utf16), L = s.count
    guard L > 0 else { return flat }
    let stops = Set(".,;:!?、。，！？".utf16)
    return (0..<count).map { i in
      let at = (Double(i) + 0.5) / Double(count) * Double(L), k = min(L - 1, Int(at)), c = s[k]
      if space(c) || stops.contains(c) { return 0.06 }
      var a = k, b = k + 1
      while a > 0 && !space(s[a - 1]) { a -= 1 }
      while b < L && !space(s[b]) { b += 1 }
      let x = min(1, max(0, (at - Double(a)) / Double(b - a))), rise = pow(sin(Double.pi * x), 0.45)
      let wobble = 0.78 + 0.22 * abs(sin(Double(c) * 1.37 + Double(i) * 0.91))
      return max(0.1, (rise * (vowel(c) ? 1 : 0.72) * wobble * 1000).rounded() / 1000)
    }
  }
  /// About how many letters a voice says in a second.
  static func pace(_ text: String) -> Double { text.utf16.contains(where: cjk) ? 7 : 14 }
}

@MainActor
final class Sound: NSObject, ObservableObject {
  static let shared = Sound()

  /// The clip playing, or paused partway (`scrub`: where a finger is dragging it).
  struct Current { var key: String; var clip: Clip; var speech: Bool; var units: [UInt16]; var on: Bool; var frac: Double; var scrub: Double? }
  @Published private(set) var cur: Current?
  /// Shapes measured on this phone, by file.
  enum Measured: Equatable { case busy, failed, done(SoundShape) }
  @Published private(set) var shapes: [String: Measured] = [:]
  /// Recording: on while the microphone is on or the clip is being saved (`saving`).
  @Published private(set) var recording = false
  @Published private(set) var saving = false

  /// A file's shape measured here is saved with the cards that play it; another card may already have one.
  var measured: ((String, Wave) -> Void)?
  var known: ((String) -> Wave?)?

  private var player: AVAudioPlayer?
  private var playerFile: URL?
  private let synth = AVSpeechSynthesizer()
  private var utterance: AVSpeechUtterance?
  /// Where the voice is: the letter it last started saying, and when (`told`: the voice said so).
  private var sp: (at: Int, t: Double, told: Bool)?
  private var spFrom = 0
  private var worded: [String: SoundShape] = [:]
  private var files: [String: URL] = [:]
  private var loading: [String: Task<URL?, Never>] = [:]
  private var watch: Timer?

  override init() {
    super.init()
    synth.delegate = self
    let nc = NotificationCenter.default
    // Another app took the sound, or the headphones came out: the clip pauses where it is.
    nc.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] n in
      guard (n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt).flatMap(AVAudioSession.InterruptionType.init) == .began else { return }
      Task { @MainActor in self?.pausedOutside() }
    }
    nc.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] n in
      guard (n.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt).flatMap(AVAudioSession.RouteChangeReason.init) == .oldDeviceUnavailable else { return }
      Task { @MainActor in self?.pause() }
    }
  }

  private static var now: Double { CACurrentMediaTime() }

  // ---------- shapes ----------
  /// A clip's shape: saved with its card (or with another card that plays the same file), measured already, or measured
  /// now (flat until then). Words get theirs from the words.
  func shape(_ c: Clip) -> SoundShape {
    guard let file = c.file else {
      let t = c.said
      if let s = worded[t] { return s }
      let s = SoundShape(peaks: WaveCode.words(t), dur: Double(t.utf16.count) / WaveCode.pace(t), guess: true)
      worded[t] = s
      return s
    }
    if let w = WaveCode.unpack(c.wave) ?? WaveCode.unpack(known?(file)) { return w }
    switch shapes[file] {
    case .done(let s): return s
    case .failed: return SoundShape(peaks: WaveCode.flat, dur: 0)
    case .busy: return SoundShape(peaks: WaveCode.flat, dur: 0, busy: true)
    case nil:
      // Not while a screen is being drawn.
      DispatchQueue.main.async { [weak self] in self?.measure(file) }
      return SoundShape(peaks: WaveCode.flat, dur: 0, busy: true)
    }
  }
  private func measure(_ file: String) {
    guard shapes[file] == nil else { return }
    shapes[file] = .busy
    Task {
      var s: SoundShape? = nil
      // Bigger files still play, but aren't measured: reading them could run a phone out of memory.
      if let local = await self.local(file), ((try? local.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) <= 12_000_000 {
        s = await Task.detached { try? WaveCode.shape(of: local) }.value
      }
      if let s, s.dur > 0 { shapes[file] = .done(s); measured?(file, WaveCode.pack(s.peaks, s.dur)) } else { shapes[file] = .failed }
    }
  }

  /// What a player shows for a clip.
  func view(_ c: Clip?) -> SoundVM {
    guard let c, !c.key.isEmpty else { return SoundVM() }
    let s = shape(c), k = c.key, here = cur?.key == k
    return SoundVM(key: k, peaks: s.peaks, dur: s.guess ? 0 : s.dur > 0 ? s.dur : here ? durOf() : 0, speech: c.speech, on: here && cur!.on, frac: here ? pos() : 0, busy: s.busy)
  }
  /// Where a clip is right now (from 0 to 1), and whether it's playing: players read it every frame.
  func live(_ key: String) -> (frac: Double, on: Bool) {
    guard let c = cur, c.key == key else { return (0, false) }
    return (pos(), c.on)
  }

  // ---------- the file ----------
  private static let dir: URL = {
    let d = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("sound", isDirectory: true)
    try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
    return d
  }()
  private static func name(_ file: String) -> String { SHA256.hash(data: Data(file.utf8)).prefix(12).map { String(format: "%02x", $0) }.joined() }
  /// The clip's file on this phone (fetched once).
  func local(_ file: String) async -> URL? {
    if let f = files[file], FileManager.default.fileExists(atPath: f.path) { return f }
    if let t = loading[file] { return await t.value }
    let t = Task<URL?, Never> {
      guard let url = API.media(file), let got = try? await URLSession.shared.data(from: url) else { return nil }
      let (data, resp) = got
      guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode), !data.isEmpty else { return nil }
      let ext = ["audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm", "audio/aac": "aac"][http.mimeType ?? ""]
        ?? ((resp.url ?? url).pathExtension.isEmpty ? "m4a" : (resp.url ?? url).pathExtension)
      let dest = Sound.dir.appendingPathComponent(Sound.name(file) + "." + ext)
      do { try data.write(to: dest, options: .atomic) } catch { return nil }
      return dest
    }
    loading[file] = t
    let f = await t.value
    loading[file] = nil
    if let f { files[file] = f }
    return f
  }
  /// A file picked on this phone: its shape (measured before it was sent) and the file itself, so it plays and shows at
  /// once.
  func adopt(_ local: URL, _ s: SoundShape?, as file: String) {
    if let s { shapes[file] = .done(s) }
    keep(local, as: file)
  }
  /// A clip made on this phone is already here: it plays without fetching it again.
  private func keep(_ local: URL, as file: String) {
    let dest = Sound.dir.appendingPathComponent(Sound.name(file) + "." + (local.pathExtension.isEmpty ? "m4a" : local.pathExtension))
    try? FileManager.default.removeItem(at: dest)
    if (try? FileManager.default.moveItem(at: local, to: dest)) != nil { files[file] = dest }
  }

  // ---------- playing ----------
  private func durOf() -> Double {
    guard let c = cur else { return 0 }
    if !c.speech, let p = player, p.duration > 0 { return p.duration }
    return shape(c.clip).dur
  }
  private func pos() -> Double {
    guard let c = cur else { return 0 }
    if let s = c.scrub { return s }
    if !c.on { return c.frac }
    if c.speech { return spoken() }
    let d = durOf()
    guard d > 0, let p = player else { return c.frac }
    return min(1, p.currentTime / d)
  }
  /// Where the voice is: the word it last started (it says which), moving on at speaking pace, but not past the end of
  /// that word. A voice that never says goes by time alone.
  private func spoken() -> Double {
    guard let c = cur else { return 0 }
    guard let sp else { return c.frac }
    let n = max(1, c.units.count), ahead = Double(sp.at) + (Sound.now - sp.t) * WaveCode.pace(c.clip.said)
    if !sp.told { return min(0.98, ahead / Double(n)) }
    var end = sp.at
    while end < c.units.count && !(UnicodeScalar(c.units[end]).map { Character($0).isWhitespace } ?? false) { end += 1 }
    return min(1, min(ahead, Double(end + 1)) / Double(n))
  }
  /// The voice starts from the beginning of the word at f.
  private func speakFrom(_ f: Double) {
    guard let c = cur else { return }
    let u = c.units
    var at = min(u.count, Int(f * Double(u.count)))
    while at > 0 && !(UnicodeScalar(u[at - 1]).map { Character($0).isWhitespace } ?? false) { at -= 1 }
    synth.stopSpeaking(at: .immediate)
    let rest = String(utf16CodeUnits: Array(u[at...]), count: u.count - at)
    let v = AVSpeechUtterance(string: rest)
    if !c.clip.lang.isEmpty { v.voice = AVSpeechSynthesisVoice(language: c.clip.lang) }
    utterance = v; spFrom = at; sp = (at, Sound.now, false)
    activate()
    synth.speak(v)
  }
  private func activate() {
    guard !recording else { return }
    let s = AVAudioSession.sharedInstance()
    try? s.setCategory(.playback, mode: .default)
    try? s.setActive(true)
  }
  private func halt() {
    guard let c = cur else { return }
    if c.speech { utterance = nil; if c.on { synth.stopSpeaking(at: .immediate) } } else { player?.pause() }
    watch?.invalidate(); watch = nil
    cur = nil
  }
  private func start(_ c: Clip) {
    halt()
    cur = Current(key: c.key, clip: c, speech: c.speech, units: c.speech ? Array(c.said.utf16) : [], on: false, frac: 0, scrub: nil)
  }
  private func ended() {
    guard var c = cur else { return }
    c.on = false; c.frac = 0; c.scrub = nil
    cur = c
    utterance = nil; sp = nil
    watch?.invalidate(); watch = nil
  }
  private func seekTo(_ f: Double) {
    guard let p = player, p.duration > 0 else { return }
    p.currentTime = min(f, 0.999) * p.duration
  }
  /// Plays a clip, or pauses it if it's playing. `again`: from the start (a card that comes up plays on its own).
  func play(_ c: Clip, again: Bool = false) {
    let k = c.key
    guard !k.isEmpty else { return }
    if cur == nil || cur!.key != k || again { start(c) } else if cur!.on { pause(); return }
    cur!.clip = c
    cur!.on = true
    if cur!.speech { speakFrom(cur!.frac); return }
    Task { await startPlayer(c.file!, key: k) }
  }
  private func startPlayer(_ file: String, key: String) async {
    let local = await self.local(file)
    guard let c = cur, c.key == key, c.on else { return }
    guard let local else { cur!.on = false; return }
    if playerFile != local || player == nil {
      player = try? AVAudioPlayer(contentsOf: local)
      player?.delegate = self
      playerFile = local
    }
    guard let p = player else { cur!.on = false; playerFile = nil; return }
    activate()
    p.currentTime = min(c.frac, 0.999) * p.duration
    if !p.play() { cur!.on = false; return }
    // A clip paused from outside (another app took the sound) shows it's paused.
    watch?.invalidate()
    watch = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
      Task { @MainActor in guard let self, let p = self.player, let c = self.cur, c.on, !c.speech, !p.isPlaying else { return }; self.pausedOutside() }
    }
  }
  private func pausedOutside() {
    guard let c = cur, c.on, !c.speech else { return }
    guard let p = player, !p.isPlaying else { return }
    cur!.frac = p.duration > 0 ? min(1, p.currentTime / p.duration) : c.frac
    cur!.on = false
    watch?.invalidate(); watch = nil
  }
  func pause() {
    guard let c = cur, c.on else { return }
    let f = pos()
    cur!.frac = f; cur!.on = false
    if c.speech { utterance = nil; sp = nil; synth.stopSpeaking(at: .immediate) } else { player?.pause() }
    watch?.invalidate(); watch = nil
  }
  /// A tap or a drag on a waveform. While dragging (`dragging`) only the waveform follows; letting go moves the sound
  /// there. f nil: the drag was called off.
  func seek(_ c: Clip, _ f: Double?, dragging: Bool) {
    let k = c.key
    guard !k.isEmpty else { return }
    if cur == nil || cur!.key != k { guard f != nil else { return }; start(c) }
    if dragging { cur!.scrub = f; return }
    cur!.scrub = nil
    guard var f else { return }
    f = min(max(f, 0), 0.999)
    if !cur!.on { cur!.frac = f } else if cur!.speech { speakFrom(f) } else { seekTo(f) }
  }
  /// Stops whatever plays (leaving a screen).
  func stop() { halt() }

  // ---------- recording ----------
  private var recorder: AVAudioRecorder?
  private var rec = RecView()
  private var t0: Double = 0, peak: Double = 0, next: Double = 60, discard = false
  private var meter: CADisplayLink?
  private var done: (((url: String, wave: Wave)?, String?) -> Void)?
  private var upload: ((Data) async throws -> String)?
  /// The live waveform and time, read every frame.
  var recLive: RecView { rec }

  /// Starts recording; `done` gets the clip once it's stopped and saved (its link and waveform), or what went wrong.
  func record(upload: @escaping (Data) async throws -> String, done: @escaping ((url: String, wave: Wave)?, String?) -> Void) async {
    guard !recording else { return }
    halt()
    guard await AVAudioApplication.requestRecordPermission() else { done(nil, "Lucida can’t use the microphone. You can turn it on in Settings → Lucida."); return }
    let file = FileManager.default.temporaryDirectory.appendingPathComponent("rec-" + UUID().uuidString + ".m4a")
    let settings: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 44100, AVNumberOfChannelsKey: 1, AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue]
    do {
      let s = AVAudioSession.sharedInstance()
      try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
      try s.setActive(true)
      let r = try AVAudioRecorder(url: file, settings: settings)
      r.isMeteringEnabled = true
      r.delegate = self
      guard r.record() else { throw CocoaError(.fileWriteUnknown) }
      recorder = r
    } catch {
      try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
      done(nil, "Couldn’t start recording. Try again."); return
    }
    self.upload = upload; self.done = done
    rec = RecView(); t0 = Sound.now; peak = 0; next = 60; discard = false
    recording = true; saving = false
    meter = CADisplayLink(target: self, selector: #selector(tick))
    meter?.add(to: .main, forMode: .common)
  }
  /// Every frame: how loud it is now (the loudest moment of each 60 ms makes a bar). The bars rise and settle smoothly and
  /// slide along as it records; with Reduce Motion they just show the levels.
  @objc private func tick() {
    guard let r = recorder, recording, !saving else { return }
    r.updateMeters()
    let rms = pow(10, Double(r.averagePower(forChannel: 0)) / 20), level = min(1, pow(rms * 5, 0.7))
    let ms = (Sound.now - t0) * 1000
    peak = max(peak, level)
    while ms >= next { rec.levels.append(peak); peak = level; next += 60 }
    if rec.levels.count > 400 { rec.levels.removeFirst(rec.levels.count - 400) }
    let calm = UIAccessibility.isReduceMotionEnabled
    rec.level = calm ? peak : rec.level + (peak - rec.level) * 0.45
    rec.slide = calm ? 0 : 1 - (next - ms) / 60
    rec.secs = ms / 1000
  }
  /// Stops recording (a second tap on Record, or Stop). `discard`: throw it away (leaving the editor, another kind of card).
  func stopRecording(discard: Bool = false) {
    guard recording, !saving, let r = recorder else { return }
    self.discard = discard
    rec.secs = (Sound.now - t0)
    saving = true; rec.saving = true
    meter?.invalidate(); meter = nil
    r.stop()
  }
  private func finished(_ file: URL) {
    let levels = rec.levels, secs = rec.secs, throwAway = discard, upload = self.upload, done = self.done
    recorder = nil; self.upload = nil; self.done = nil
    try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
    Task {
      var out: (url: String, wave: Wave)? = nil, problem: String? = nil
      if !throwAway, let data = try? Data(contentsOf: file), !data.isEmpty, let upload {
        var s = await Task.detached { try? WaveCode.shape(of: file) }.value
        // Then its shape is the levels the live waveform showed.
        if s == nil || s!.dur <= 0 { let lv = WaveCode.fit(levels, WaveCode.count), top = max(0.2, lv.max() ?? 0); s = SoundShape(peaks: lv.map { $0 / top }, dur: secs) }
        do {
          let url = try await upload(data)
          shapes[url] = .done(s!)
          keep(file, as: url)
          out = (url, WaveCode.pack(s!.peaks, s!.dur))
        } catch { problem = (error as? LocalizedError)?.errorDescription ?? "Couldn’t save the recording. Try again." }
      }
      try? FileManager.default.removeItem(at: file)
      recording = false; saving = false; rec = RecView()
      done?(out, problem)
    }
  }
}

extension Sound: AVAudioPlayerDelegate, AVAudioRecorderDelegate, AVSpeechSynthesizerDelegate {
  nonisolated func audioPlayerDidFinishPlaying(_ p: AVAudioPlayer, successfully flag: Bool) {
    Task { @MainActor in if p === self.player, let c = self.cur, !c.speech { self.ended() } }
  }
  nonisolated func audioRecorderDidFinishRecording(_ r: AVAudioRecorder, successfully flag: Bool) {
    let url = r.url
    Task { @MainActor in self.finished(url) }
  }
  nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, willSpeakRangeOfSpeechString range: NSRange, utterance u: AVSpeechUtterance) {
    Task { @MainActor in if u === self.utterance { self.sp = (self.spFrom + range.location, Sound.now, true) } }
  }
  nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
    Task { @MainActor in if u === self.utterance, self.cur != nil { self.ended() } }
  }
}

extension Store {
  /// What a player shows for a clip: its waveform and where it's at. The design screens have the canvas's sample clip
  /// (2.6 seconds, a little way in), which plays or pauses and jumps where it's tapped, but doesn't move.
  func sound(_ c: Clip?) -> SoundVM {
    guard let c, !c.key.isEmpty else { return SoundVM() }
    if demo { return SoundVM(key: c.key, peaks: Generated.sampleWave, dur: 2.6, speech: c.speech, on: demoPlaying, frac: demoFrac) }
    return Sound.shared.view(c)
  }
  /// Where a clip is right now and whether it's playing (read every frame while it plays).
  func soundLive(_ key: String) -> (frac: Double, on: Bool) { demo ? (demoFrac, demoPlaying) : Sound.shared.live(key) }
  /// Plays a clip, or pauses it (`again`: from the start).
  func playSound(_ c: Clip?, again: Bool = false) {
    guard let c else { return }
    if demo { demoPlaying.toggle() } else { Sound.shared.play(c, again: again) }
  }
  func seekSound(_ c: Clip?, _ f: Double?, dragging: Bool) {
    guard let c else { return }
    if demo { if let f { demoFrac = f } } else { Sound.shared.seek(c, f, dragging: dragging) }
  }
  func stopSound() { if !demo { Sound.shared.stop() } }

  // ---------- recording ----------
  var isRecording: Bool { demo ? demoRecording : Sound.shared.recording }
  var recSaving: Bool { demo ? false : Sound.shared.saving }
  /// The recording's live waveform and time (the design screen: the sample clip's levels, 3 seconds in).
  func recLive() -> RecView {
    demo ? RecView(levels: (0..<70).map { Generated.sampleWave[($0 * 3 + 30) % 96] }, level: 0.55, secs: 3.4) : Sound.shared.recLive
  }
  /// Record, then Stop: the new clip (its link and its waveform) comes back once it's saved.
  func toggleRecord(_ got: @escaping ((url: String, wave: Wave)) -> Void) {
    if demo { demoRecording.toggle(); return }
    if Sound.shared.recording { Sound.shared.stopRecording(); return }
    let api = self.api
    Task {
      await Sound.shared.record(upload: { try await api.upload($0, type: "audio/mp4") }) { [weak self] clip, err in
        if let err { self?.error = err }
        if let clip { got(clip) }
      }
    }
  }
  /// Throws a recording away (leaving the editor, or another kind of card).
  func discardRecording() { if demo { demoRecording = false } else { Sound.shared.stopRecording(discard: true) } }

  /// A sound file you pick is measured here first, then sent (web/sound.js pick).
  func pickSound(_ url: URL) async -> (url: String, wave: Wave?)? {
    let types = ["mp3": "audio/mpeg", "m4a": "audio/mp4", "mp4": "audio/mp4", "wav": "audio/wav", "wave": "audio/wav", "ogg": "audio/ogg", "oga": "audio/ogg", "webm": "audio/webm"]
    let ext = url.pathExtension.lowercased()
    guard let type = types[ext] else { error = "That isn’t a sound Lucida can play (MP3, M4A, WAV, OGG, or WebM)."; return nil }
    let scoped = url.startAccessingSecurityScopedResource()
    let data = try? Data(contentsOf: url)
    if scoped { url.stopAccessingSecurityScopedResource() }
    guard let data, !data.isEmpty else { error = "Couldn’t read that file."; return nil }
    guard data.count <= 20_000_000 else { error = "That file is over 20 MB."; return nil }
    let local = FileManager.default.temporaryDirectory.appendingPathComponent("pick-" + UUID().uuidString + "." + ext)
    try? data.write(to: local)
    let s: SoundShape? = data.count <= 12_000_000 ? await Task.detached { try? WaveCode.shape(of: local) }.value : nil
    do {
      let link = try await api.upload(data, type: type)
      Sound.shared.adopt(local, s, as: link)
      return (link, s.map { WaveCode.pack($0.peaks, $0.dur) })
    } catch {
      try? FileManager.default.removeItem(at: local)
      self.error = (error as? LocalizedError)?.errorDescription ?? "That didn’t upload."
      return nil
    }
  }
}
