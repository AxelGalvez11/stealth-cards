# Logos

- `lucida.svg`: the Lucida app icon (three white dots on a black rounded square), for app stores and sign-in pages that ask for a logo.
- `lucida-mark.svg`: the three dots on their own (black; the app draws them in the text color).
- `google.svg` and `apple.svg`: the logos on the "Continue with Google" and "Continue with Apple" buttons. `design/build.mjs` reads these two for the canvas and the web app, and `design/to-ios.mjs` passes them on to the iPhone app, where the Apple logo takes the text color.
