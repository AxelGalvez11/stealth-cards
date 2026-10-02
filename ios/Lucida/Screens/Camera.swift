// Lucida's own camera (the Photo source's Take a photo in Make cards), never the system's camera sheet (UIImagePickerController): a full screen over
// everything with the picture the camera sees, a close button, the flash (off, on, or auto), the switch between the cameras, and the shutter; once a
// picture is taken, Retake and Use photo. The phone asks for the camera once, in its own question (that stays). A phone with no camera, or one
// told no, says so in a few plain words. (PhoneMake's Camera board shows it; `-fakeCamera` gives a simulator, which has no camera, a picture to take.)
import SwiftUI
import AVFoundation

/// What opens the camera: what to do with the picture taken (it is `nil` when the camera was closed without one).
struct CameraRequest: Identifiable {
  let id = UUID()
  let done: (UIImage?) -> Void
}

/// Whether this phone has a camera to take a picture with (a debug build with `-fakeCamera` pretends it has).
enum CameraSupport {
  static var fake: Bool {
    #if DEBUG
    return ProcessInfo.processInfo.arguments.contains("-fakeCamera")
    #else
    return false
    #endif
  }
  static var available: Bool { fake || AVCaptureDevice.default(for: .video) != nil }
}

@MainActor
final class CameraModel: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
  enum State { case starting, ready, denied, missing }
  enum Flash: String { case off = "Off", on = "On", auto = "Auto"
    var next: Flash { self == .off ? .auto : self == .auto ? .on : .off }
    var av: AVCaptureDevice.FlashMode { self == .on ? .on : self == .auto ? .auto : .off }
  }
  @Published var state: State = .starting
  @Published var flash: Flash = .off
  @Published var front = false
  @Published var busy = false
  /// The picture just taken, to keep or retake.
  @Published var shot: UIImage?
  let session = AVCaptureSession()
  private let output = AVCapturePhotoOutput()
  private let queue = DispatchQueue(label: "lucida.camera")
  private var configured = false
  /// A design screen or a simulator test: no camera, a picture drawn to take.
  var pretend = false

  func start() {
    if pretend { state = .ready; return }
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: open()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { ok in Task { @MainActor in if ok { self.open() } else { self.state = .denied } } }
    default: state = .denied
    }
  }
  func stop() { if !pretend { let s = session; queue.async { if s.isRunning { s.stopRunning() } } } }

  private func device(_ front: Bool) -> AVCaptureDevice? { AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: front ? .front : .back) ?? AVCaptureDevice.default(for: .video) }

  private func open() {
    guard let dev = device(front), let input = try? AVCaptureDeviceInput(device: dev) else { state = .missing; return }
    let s = session, o = output
    queue.async {
      s.beginConfiguration()
      s.sessionPreset = .photo
      if s.canAddInput(input) { s.addInput(input) }
      if s.canAddOutput(o) { s.addOutput(o) }
      s.commitConfiguration()
      s.startRunning()
      Task { @MainActor in self.configured = true; self.state = .ready }
    }
  }

  func flip() {
    front.toggle()
    guard !pretend, configured, let dev = device(front), let input = try? AVCaptureDeviceInput(device: dev) else { return }
    let s = session
    queue.async {
      s.beginConfiguration()
      for old in s.inputs { s.removeInput(old) }
      if s.canAddInput(input) { s.addInput(input) }
      s.commitConfiguration()
    }
  }

  func capture() {
    guard !busy else { return }
    if pretend { shot = Self.pretendPicture(front: front); return }
    busy = true
    let settings = AVCapturePhotoSettings()
    if output.supportedFlashModes.contains(flash.av) { settings.flashMode = flash.av }
    output.capturePhoto(with: settings, delegate: self)
  }
  nonisolated func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    let image = photo.fileDataRepresentation().flatMap(UIImage.init(data:))
    Task { @MainActor in self.busy = false; if let image { self.shot = image } }
  }

  /// The picture a design screen or a simulator test "takes": soft colors with the camera it came from, 900 by 1200.
  static func pretendPicture(front: Bool) -> UIImage {
    let size = CGSize(width: 900, height: 1200)
    return UIGraphicsImageRenderer(size: size).image { ctx in
      let colors = (front ? [UIColor(red: 0.95, green: 0.78, blue: 0.62, alpha: 1), UIColor(red: 0.55, green: 0.42, blue: 0.62, alpha: 1)] : [UIColor(red: 0.62, green: 0.78, blue: 0.95, alpha: 1), UIColor(red: 0.29, green: 0.36, blue: 0.62, alpha: 1)]).map(\.cgColor)
      let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: [0, 1])!
      ctx.cgContext.drawLinearGradient(g, start: .zero, end: CGPoint(x: size.width, y: size.height), options: [])
    }
  }
}

/// The picture the camera sees.
private struct CameraPreview: UIViewRepresentable {
  let session: AVCaptureSession
  final class PreviewUIView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var preview: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
  }
  func makeUIView(context: Context) -> PreviewUIView {
    let v = PreviewUIView()
    v.preview.session = session
    v.preview.videoGravity = .resizeAspectFill
    return v
  }
  func updateUIView(_ v: PreviewUIView, context: Context) {}
}

struct CameraHost: View {
  @EnvironmentObject private var nav: Nav
  let request: CameraRequest
  var body: some View {
    CameraScreen { image in withAnimation(Motion.leave) { nav.camera = nil }; request.done(image) }
  }
}

struct CameraScreen: View {
  @EnvironmentObject private var store: Store
  let done: (UIImage?) -> Void
  @StateObject private var cam = CameraModel()
  @State private var taps = 0

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      switch cam.state {
      case .starting: LoadingMark(color: .white)
      case .denied: message("The camera is off for Lucida", "Turn it on in Settings to take a photo.", button: ("Open Settings", { if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) } }))
      case .missing: message("This phone has no camera", "You can choose a picture instead.", button: nil)
      case .ready: live
      }
      VStack {
        HStack {
          circle("close", "Close", id: "camera.close") { cam.stop(); done(nil) }
          Spacer()
          if cam.state == .ready && cam.shot == nil { flashButton }
        }
        .padding(.horizontal, 16).padding(.top, Screen.safeTop + 8)
        Spacer()
      }
    }
    .foregroundStyle(.white)
    // (Black behind the picture, so the phone's own status bar is light while the camera is up.)
    .studyChrome(dark: true)
    .onAppear { cam.pretend = store.demo || CameraSupport.fake; cam.start() }
    .onDisappear { cam.stop() }
    .accessibilityElement(children: .contain).accessibilityAddTraits(.isModal).accessibilityLabel("Camera")
    .haptic(.light, on: taps, "shutter")
  }

  /// The camera's picture, or the one just taken; and the buttons under it.
  private var live: some View {
    ZStack {
      if let shot = cam.shot {
        Image(uiImage: shot).resizable().scaledToFit().frame(maxWidth: .infinity, maxHeight: .infinity).accessibilityLabel("The photo you took")
      } else if cam.pretend {
        LinearGradient(colors: cam.front ? [Color(red: 0.95, green: 0.78, blue: 0.62), Color(red: 0.55, green: 0.42, blue: 0.62)] : [Color(red: 0.62, green: 0.78, blue: 0.95), Color(red: 0.29, green: 0.36, blue: 0.62)], startPoint: .topLeading, endPoint: .bottomTrailing)
          .ignoresSafeArea().accessibilityHidden(true)
      } else {
        CameraPreview(session: cam.session).ignoresSafeArea().accessibilityHidden(true)
      }
      VStack {
        Spacer()
        if cam.shot == nil { shutterRow } else { keepRow }
      }
      .padding(.bottom, 34)
    }
  }

  private var shutterRow: some View {
    ZStack {
      Button { taps += 1; cam.capture() } label: {
        ZStack {
          Circle().strokeBorder(Color.white, lineWidth: 4).frame(width: 76, height: 76)
          Circle().fill(Color.white).frame(width: 62, height: 62)
        }
        .opacity(cam.busy ? 0.6 : 1)
      }
      .buttonStyle(.press).disabled(cam.busy).accessibilityLabel("Take photo").accessibilityIdentifier("camera.shutter")
      HStack { Spacer(); circle("flip", "Switch camera", id: "camera.flip") { cam.flip() }.padding(.trailing, 28) }
    }
    .frame(maxWidth: .infinity)
  }

  private var keepRow: some View {
    HStack(spacing: 10) {
      Button { cam.shot = nil } label: {
        Text("Retake").css(15, .semibold).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(Color.white.opacity(0.18)))
      }
      .buttonStyle(.press).accessibilityIdentifier("camera.retake")
      Button { let s = cam.shot; cam.stop(); done(s) } label: {
        Text("Use photo").css(15, .semibold).foregroundStyle(.black).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(Color.white))
      }
      .buttonStyle(.press).accessibilityIdentifier("camera.use")
    }
    .padding(.horizontal, 20)
  }

  /// The flash: Off, then Auto, then On.
  private var flashButton: some View {
    Button { cam.flash = cam.flash.next } label: {
      HStack(spacing: 6) {
        Icon(cam.flash == .off ? "boltOff" : "bolt", 18, 2)
        if cam.flash == .auto { Text("Auto").css(13, .semibold) }
      }
      .padding(.horizontal, cam.flash == .auto ? 14 : 0).frame(minWidth: 44).frame(height: 44).background(Capsule().fill(Color.white.opacity(0.18)))
    }
    .buttonStyle(.press).accessibilityLabel("Flash, \(cam.flash.rawValue.lowercased())").accessibilityIdentifier("camera.flash")
  }

  private func circle(_ icon: String, _ label: String, id: String, _ action: @escaping () -> Void) -> some View {
    Button(action: action) { Icon(icon, 18, 2).frame(width: 44, height: 44).background(Circle().fill(Color.white.opacity(0.18))) }
      .buttonStyle(.press).accessibilityLabel(label).accessibilityIdentifier(id)
  }

  /// No camera, or no say-so: what is wrong in a few plain words.
  private func message(_ title: String, _ line: String, button: (String, () -> Void)?) -> some View {
    VStack(spacing: 10) {
      Text(title).css(20, .semibold, ls: -0.01).multilineTextAlignment(.center).accessibilityAddTraits(.isHeader)
      Text(line).css(14).foregroundStyle(Color.white.opacity(0.7)).multilineTextAlignment(.center)
      if let button {
        Button(action: button.1) { Text(button.0).css(15, .semibold).foregroundStyle(.black).padding(.horizontal, 22).frame(height: 48).background(Capsule().fill(Color.white)) }
          .buttonStyle(.press).padding(.top, 8)
      }
    }
    .padding(.horizontal, 32)
  }
}

extension Nav {
  /// Opens Lucida's camera over everything; `done` gets the picture, or nil.
  func openCamera(_ done: @escaping (UIImage?) -> Void) { withAnimation(Motion.sheet) { camera = CameraRequest(done: done) } }
}
