// Cutting a long recording that was picked from Files into parts the speech service can take (used by MakeFlow.addFiles). The speech service gives
// up after a minute of working and takes a file of at most 25 MB (sent as base64, which makes it a third bigger), and Pro promises 120 minutes (two
// hours of a 64 kbps voice recording is about 57 MB), so a recording over 18 MB, or longer than ten minutes, goes up as several files, each at most
// ten minutes and 18 MB and as even as can be (ten minutes and two minutes become two of six), in order: the server writes each one out as text and
// adds each one's length as a time offset to the next, so the words keep their running times (0:00, then 10:00, 20:00, ...). These are the web's
// own numbers (web/audiosplit.js). The recorder's own files are already ten minutes each and never come here.
//
// AVFoundation does the cutting: one AVAssetExportSession for each part, over that part's own time range, writing an .m4a to a folder of this
// app's own. The recording is read from its file as the export goes along, never held in memory. `duration(of:)` only asks for the length (so
// MakeFlow can turn away a recording longer than the plan makes from before anything is cut); `cut` makes the parts. Nothing here draws anything
// (it builds for the Mac too, for ios/tests/make-check.sh).
import Foundation
import AVFoundation

/// One part of a recording that was cut up: its own file, how big it is, and how long it is.
struct MakePart: Equatable { var url: URL, size: Int, seconds: Double }

/// Tells a cut that is under way that nobody wants it anymore (the person went Back): it stops before the next part and leaves nothing behind.
final class MakeStop: @unchecked Sendable {
  private let lock = NSLock()
  private var flag = false
  var stopped: Bool { lock.lock(); defer { lock.unlock() }; return flag }
  func stop() { lock.lock(); flag = true; lock.unlock() }
}

enum MakeSplit {
  /// A recording over this many bytes, or longer than this many seconds, is cut up; each part is at most this long and at most this big.
  static let bigBytes = 18_000_000
  static let longSeconds: Double = 10 * 60
  /// What a part of the sound can weigh once it is written again as AAC (a second of sound takes at most this many bytes: 256 kbps).
  static let mostBytesPerSecond = 32_000.0

  /// The time range of each part for a recording `total` seconds long and `size` bytes: as many parts as it takes to keep each at most ten
  /// minutes and 18 MB (what a part weighs is the recording's own size at the same rate, and no more than AAC can take), and all of them as long
  /// as each other.
  static func ranges(_ total: Double, size: Int = 0) -> [(from: Double, to: Double)] {
    guard total.isFinite, total > 0 else { return [] }
    let weight = min(Double(size), total * mostBytesPerSecond)
    let n = max(1, Int((total / longSeconds).rounded(.up)), Int((weight / Double(bigBytes)).rounded(.up)))
    return (0..<n).map { (total * Double($0) / Double(n), total * Double($0 + 1) / Double(n)) }
  }

  /// Whether a recording of this size and length is cut up before it goes.
  static func needsCutting(size: Int, seconds: Double) -> Bool { size > bigBytes || seconds > longSeconds }

  /// How long a sound is in seconds, as AVFoundation reads it (nil when it can't be read: not a sound it knows, or broken).
  static func duration(of source: URL) async -> Double? {
    guard let length = try? await AVURLAsset(url: source).load(.duration), length.seconds.isFinite, length.seconds > 0 else { return nil }
    return length.seconds
  }

  /// Cuts `source` (`size` bytes, `total` seconds long) into even parts of at most ten minutes in `folder`, in order, and tells `progress` how many
  /// parts are done and how many there will be. Nil when it can't be done (AVFoundation couldn't read it, an export failed, or `stop` said to give
  /// up); nothing is left in the folder then.
  static func cut(_ source: URL, size: Int, seconds total: Double, into folder: URL, stop: MakeStop? = nil, progress: (@Sendable (Int, Int) -> Void)? = nil) async -> [MakePart]? {
    let asset = AVURLAsset(url: source), fm = FileManager.default
    guard let tracks = try? await asset.loadTracks(withMediaType: .audio), !tracks.isEmpty else { return nil }
    let cuts = ranges(total, size: size)
    guard !cuts.isEmpty else { return nil }
    try? fm.createDirectory(at: folder, withIntermediateDirectories: true)
    var parts: [MakePart] = []
    func undo() { for p in parts { try? fm.removeItem(at: p.url) } }
    progress?(0, cuts.count)
    for (i, cut) in cuts.enumerated() {
      guard !Task.isCancelled, stop?.stopped != true, let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else { undo(); return nil }
      session.timeRange = CMTimeRange(start: CMTime(seconds: cut.from, preferredTimescale: 600), end: CMTime(seconds: cut.to, preferredTimescale: 600))
      let url = folder.appendingPathComponent("Part \(i + 1).m4a")
      do { try await session.export(to: url, as: .m4a) } catch { try? fm.removeItem(at: url); undo(); return nil }
      let bytes = (try? fm.attributesOfItem(atPath: url.path)[.size] as? Int) ?? 0
      guard bytes > 0 else { try? fm.removeItem(at: url); undo(); return nil }
      parts.append(MakePart(url: url, size: bytes, seconds: cut.to - cut.from))
      progress?(i + 1, cuts.count)
    }
    return parts
  }
}
