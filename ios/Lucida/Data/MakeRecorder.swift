// Recording a lecture (web/make.js recStart, recPause, recResume, recStop): the microphone, one file for every ten minutes (so no one
// request is long, and no file goes near the speech service's 25 MB: ten minutes at 24 kbps is about 1.8 MB), Pause and Resume, a plain
// timer and a quiet level meter, and a stop of its own at the plan's minutes. Each file is AAC in an .m4a, mono, 22.05 kHz at about
// 24 kbps (a lecture stays small). Discard throws the audio away. (The server takes several audio files in one make and adds each one's
// length to the next one's times, so the words of a long lecture keep running times across its files.)
//
// The simulator has no microphone, so a debug build can run it with a file standing in for the microphone (`stand`: the -makeRecording
// launch argument): the timer, the meter, Pause, Resume and Stop all run as they do for real (with `speed` making the clock run that many
// times faster, to reach a ten-minute file or the plan's limit in seconds), and what comes out is that file, once for each segment.
import Foundation
import AVFoundation
import Combine
#if canImport(UIKit)
import UIKit
#endif

/// One file of a recording: where it is and how long it is.
struct MakeSegment { var url: URL; var seconds: Double }

@MainActor
final class MakeRecorder: ObservableObject {
  enum State { case idle, recording, paused, saving }
  /// A new file is started every this many seconds (ten minutes).
  static let fileSeconds: Double = 10 * 60
  @Published private(set) var state: State = .idle
  /// How long it has been recording (seconds), not counting the time it was paused.
  @Published private(set) var secs: Double = 0
  /// How loud it was, the last 60 readings (0 to 1), for the quiet meter.
  @Published private(set) var levels: [Double] = []
  /// The microphone is on (recording or paused): Back and the X give way to Pause, Stop and Discard.
  var live: Bool { state == .recording || state == .paused }
  /// The plan's limit in seconds (it stops by itself there, once), and how long one file is (ten minutes).
  var limit: Double = 7200
  var segmentSeconds: Double = MakeRecorder.fileSeconds
  var onLimit: (() -> Void)?
  /// Debug builds: a file standing in for the microphone, and how many times faster its clock runs.
  var stand: URL?
  var speed: Double = 1

  private var rec: AVAudioRecorder?
  private var segments: [MakeSegment] = []
  private var folder: URL?
  /// Seconds in the files already finished; the stand-in clock; when the stand-in's file began.
  private var base: Double = 0, fakeSecs: Double = 0, fakeFrom: Double = 0
  private var timer: Timer?
  private var told = false
  private var interruption: NSObjectProtocol?

  // ---------- start ----------
  /// Starts the microphone. Returns what to tell the person when it can't, or nil.
  func start() async -> String? {
    guard state == .idle else { return nil }
    segments = []; base = 0; fakeSecs = 0; fakeFrom = 0; secs = 0; levels = []; told = false
    folder = FileManager.default.temporaryDirectory.appendingPathComponent("lucida-rec-" + UUID().uuidString, isDirectory: true)
    try? FileManager.default.createDirectory(at: folder!, withIntermediateDirectories: true)
    if stand == nil {
      #if os(iOS)
      guard await AVAudioApplication.requestRecordPermission() else { return "Lucida can’t use the microphone. You can turn it on in Settings → Lucida." }
      let s = AVAudioSession.sharedInstance()
      do { try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker]); try s.setActive(true) }
      catch { return "Couldn’t start recording. Try again." }
      interruption = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] n in
        // A call or an alarm: the recording waits (Resume goes on), so what is said while it's away isn't missing without a sign.
        guard (n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt).flatMap(AVAudioSession.InterruptionType.init) == .began else { return }
        Task { @MainActor in self?.pause() }
      }
      #endif
      guard beginSegment() else { finish(); return "Couldn’t start recording. Try again." }
    }
    state = .recording
    #if canImport(UIKit)
    UIApplication.shared.isIdleTimerDisabled = true
    #endif
    timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in Task { @MainActor in self?.tick() } }
    RunLoop.main.add(timer!, forMode: .common)
    return nil
  }
  private func beginSegment() -> Bool {
    guard let folder else { return false }
    let url = folder.appendingPathComponent("Recording \(segments.count + 1).m4a")
    let settings: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 22050, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 24000]
    guard let r = try? AVAudioRecorder(url: url, settings: settings) else { return false }
    r.isMeteringEnabled = true
    guard r.record() else { return false }
    rec = r
    return true
  }

  // ---------- while it goes ----------
  private func tick() {
    guard live else { return }
    if state == .recording {
      if stand != nil {
        let dt = 0.25 * speed
        fakeSecs += dt; secs = fakeSecs
        // (A made-up level that rises and falls, so the meter moves.)
        levels = Array((levels + [min(1, 0.18 + 0.5 * abs(sin(fakeSecs * 3.1)) * (0.6 + 0.4 * sin(fakeSecs * 1.3)))]).suffix(60))
        if fakeSecs - fakeFrom >= segmentSeconds { closeStandSegment(at: fakeFrom + segmentSeconds); fakeFrom += segmentSeconds }
      } else if let r = rec {
        r.updateMeters()
        let rms = pow(10, Double(r.averagePower(forChannel: 0)) / 20)
        levels = Array((levels + [min(1, pow(rms * 5, 0.7))]).suffix(60))
        secs = base + r.currentTime
        // A new file every ten minutes: the old one is finished first, so each is a whole recording of its own.
        if r.currentTime >= segmentSeconds {
          let t = r.currentTime; r.stop(); segments.append(MakeSegment(url: r.url, seconds: t)); base += t
          if !beginSegment() { pause() }
        }
      }
      // The plan's limit: it stops by itself, and says so (the flow says it).
      if secs >= limit && !told { told = true; onLimit?() }
    }
  }
  private func closeStandSegment(at end: Double) {
    guard let stand, let folder else { return }
    let url = folder.appendingPathComponent("Recording \(segments.count + 1)." + stand.pathExtension)
    try? FileManager.default.copyItem(at: stand, to: url)
    segments.append(MakeSegment(url: url, seconds: end - fakeFrom))
  }

  func pause() {
    guard state == .recording else { return }
    rec?.pause()
    state = .paused
  }
  func resume() {
    guard state == .paused else { return }
    if stand == nil { guard rec?.record() == true else { return } }
    state = .recording
  }

  /// A design screen: shows the recorder as the canvas's sample has it (nothing records).
  func show(_ s: State, secs: Double, levels: [Double]) { state = s; self.secs = secs; self.levels = levels }

  // ---------- the end ----------
  /// Stops it and gives the files, in order (nothing when it wasn't recording).
  func stop() async -> [MakeSegment] {
    guard live else { return [] }
    state = .saving
    timer?.invalidate(); timer = nil
    if stand != nil { closeStandSegment(at: fakeSecs) }
    else if let r = rec { let t = r.currentTime; r.stop(); segments.append(MakeSegment(url: r.url, seconds: t)) }
    let out = segments
    finish()
    return out
  }
  /// Throws the audio away.
  func discard() {
    guard state != .idle else { return }
    timer?.invalidate(); timer = nil
    rec?.stop(); rec?.deleteRecording()
    if let folder { try? FileManager.default.removeItem(at: folder) }
    finish()
  }
  private func finish() {
    rec = nil; segments = []; state = .idle; secs = 0; levels = []
    if let o = interruption { NotificationCenter.default.removeObserver(o); interruption = nil }
    #if os(iOS)
    try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
    #endif
    #if canImport(UIKit)
    UIApplication.shared.isIdleTimerDisabled = false
    #endif
  }
}
