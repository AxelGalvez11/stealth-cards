// Makes ios/Lucida/Resources/grain.png: the canvas's film grain as one tile (128 points at 3x), from the same noise code
// the app uses (Design/Turbulence.swift). Run: swiftc -O ios/Lucida/Design/Turbulence.swift ios/tools/grain/main.swift -o /tmp/grain && /tmp/grain
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let n = 384
let bytes = Pixels.grainTile(points: 128, scale: 3)
let provider = CGDataProvider(data: Data(bytes) as CFData)!
let img = CGImage(width: n, height: n, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: n * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                  bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
let url = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "ios/Lucida/Resources/grain.png")
let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, img, nil)
CGImageDestinationFinalize(dest)
print("wrote", url.path)
