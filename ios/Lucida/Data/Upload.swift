// What goes up to your library's storage (db.js upload). Online a request can't be over 4.5 MB (the host's limit), so
// every picture goes up as a JPEG at most 2400 pixels across (a profile photo 512), and a file still over 4 MB is turned
// away with a plain message instead of failing on the way. The server refuses a file whose first bytes don't match the
// type it's sent as, so a sound goes up as what its bytes say it is.
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum Upload {
  static let limit = 4 * 1024 * 1024
  static let over = "That file is over 4 MB. Try a smaller or shorter one."
  /// How many pixels across a picture can be: a card's picture, a deck's header or background. A profile photo only
  /// ever shows small.
  static let side = 2400, profileSide = 512

  /// A picture as a JPEG at most `side` pixels on its longest side, upright (a rotated phone photo stays that way), with
  /// see-through parts on white and none of the photo's metadata (like where it was taken). An iPhone photo (HEIC)
  /// becomes a JPEG like any other. Nil: this phone can't open it.
  static func jpeg(_ data: Data, side: Int = side) -> Data? {
    guard let src = CGImageSourceCreateWithData(data as CFData, nil), CGImageSourceGetCount(src) > 0 else { return nil }
    let o: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true,
                              kCGImageSourceThumbnailMaxPixelSize: side]
    guard var img = CGImageSourceCreateThumbnailAtIndex(src, 0, o as CFDictionary) else { return nil }
    if ![.none, .noneSkipFirst, .noneSkipLast].contains(img.alphaInfo), let flat = onWhite(img) { img = flat }
    // Like the web: 86% quality, or 60% for the rare picture that's still too big.
    var out = Data()
    for q in [0.86, 0.6] {
      let buf = NSMutableData()
      guard let dst = CGImageDestinationCreateWithData(buf, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
      CGImageDestinationAddImage(dst, img, [kCGImageDestinationLossyCompressionQuality: q] as CFDictionary)
      guard CGImageDestinationFinalize(dst) else { return nil }
      out = buf as Data
      if out.count <= limit { break }
    }
    return out
  }

  private static func onWhite(_ img: CGImage) -> CGImage? {
    let space = img.colorSpace?.model == .rgb ? img.colorSpace! : CGColorSpace(name: CGColorSpace.sRGB)!
    guard let c = CGContext(data: nil, width: img.width, height: img.height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
    let r = CGRect(x: 0, y: 0, width: img.width, height: img.height)
    c.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); c.fill(r)
    c.draw(img, in: r)
    return c.makeImage()
  }

  /// What a file really is, from its first bytes (web/sniff.js).
  static func sniff(_ d: Data) -> String? {
    guard d.count >= 12 else { return nil }
    let b = [UInt8](d.prefix(12))
    func ascii(_ from: Int, _ to: Int) -> String { String(bytes: b[from..<to], encoding: .isoLatin1) ?? "" }
    if b[0] == 0x89 && ascii(1, 4) == "PNG" { return "image/png" }
    if b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF { return "image/jpeg" }
    if ascii(0, 4) == "GIF8" { return "image/gif" }
    if ascii(0, 4) == "RIFF" && ascii(8, 12) == "WEBP" { return "image/webp" }
    if ascii(0, 4) == "RIFF" && ascii(8, 12) == "WAVE" { return "audio/wav" }
    if ascii(4, 8) == "ftyp" && ["heic", "heix", "hevc", "mif1", "msf1"].contains(ascii(8, 12)) { return "image/heic" }
    if ascii(4, 8) == "ftyp" { return "audio/mp4" }
    if ascii(0, 3) == "ID3" || (b[0] == 0xFF && (b[1] & 0xE0) == 0xE0) { return "audio/mpeg" }
    if ascii(0, 4) == "OggS" { return "audio/ogg" }
    if b[0] == 0x1A && b[1] == 0x45 && b[2] == 0xDF && b[3] == 0xA3 { return "audio/webm" }
    return nil
  }
}
