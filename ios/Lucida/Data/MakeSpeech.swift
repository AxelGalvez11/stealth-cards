// The device's own voice, for an audio card in the review (a small speaker button beside the words): AVSpeechSynthesizer says them in the card's
// language (a BCP 47 code like es-ES, or just es). Nothing is recorded or kept: the cards the make saves are the app's own audio cards, which
// the voice reads every time. One voice at a time: a new tap, or leaving, stops the one that is talking.
import Foundation
import AVFoundation

@MainActor
final class MakeSpeech: NSObject {
  static let shared = MakeSpeech()
  private let synth = AVSpeechSynthesizer()

  /// The voice for a language code: an exact match, else the first voice whose language begins with it (es finds es-ES or es-MX), else the system's default.
  static func voice(for lang: String) -> AVSpeechSynthesisVoice? {
    guard !lang.isEmpty else { return nil }
    if let v = AVSpeechSynthesisVoice(language: lang) { return v }
    let base = lang.split(separator: "-").first.map(String.init)?.lowercased() ?? lang.lowercased()
    return AVSpeechSynthesisVoice.speechVoices().first { $0.language.lowercased() == base || $0.language.lowercased().hasPrefix(base + "-") }
  }

  /// Says `words` in `lang` (nothing when there are no words).
  func say(_ words: String, lang: String) {
    let text = words.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return }
    synth.stopSpeaking(at: .immediate)
    #if os(iOS)
    // (Sound plays through the speaker even when the ring switch is on silent, like the app's own cards, and doesn't wait for a recording that ended.)
    let s = AVAudioSession.sharedInstance()
    try? s.setCategory(.playback, mode: .spokenAudio)
    try? s.setActive(true)
    #endif
    let u = AVSpeechUtterance(string: text)
    u.voice = MakeSpeech.voice(for: lang)
    synth.speak(u)
  }
  func stop() { synth.stopSpeaking(at: .immediate) }
}
