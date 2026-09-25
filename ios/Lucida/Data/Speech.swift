// A card's sound: its recording (from the server's /media), or its words read aloud in its language.
import AVFoundation

@MainActor
enum Speech {
  private static let voice = AVSpeechSynthesizer()
  private static var player: AVPlayer?

  static func play(_ c: CardFace, api: API) {
    if let a = c.audio, a != "mock", let url = api.mediaURL(a) { player = AVPlayer(url: url); player?.play(); return }
    let text = Rich.plain(c.speak.isEmpty ? c.front : c.speak, join: " ", showMath: true).trimmingCharacters(in: .whitespaces)
    guard !text.isEmpty else { return }
    voice.stopSpeaking(at: .immediate)
    let u = AVSpeechUtterance(string: text)
    if !c.lang.isEmpty { u.voice = AVSpeechSynthesisVoice(language: c.lang) }
    voice.speak(u)
  }
}
