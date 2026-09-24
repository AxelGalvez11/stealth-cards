// The Google and Apple logos as the sign-in buttons draw them (the canvas, the web app, and the iPhone app), from the
// SVG files in design/logos: Google's in its own colors, Apple's in the text color.
import { readFileSync } from 'node:fs';
const inner = f => { const s = readFileSync(new URL('./logos/' + f, import.meta.url), 'utf8'); return s.slice(s.indexOf('>') + 1, s.lastIndexOf('</svg>')); };
export const G_LOGO = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">${inner('google.svg')}</svg>`;
export const APPLE_LOGO = `<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${inner('apple.svg')}</svg>`;
