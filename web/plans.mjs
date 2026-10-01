// Lucida Pro: where to pay, and where to change or cancel it. Both are Stripe's own pages. The canvas (design/build.mjs)
// and the server (billing.mjs) read these.
// Payment links (Stripe → Payment links, product "Lucida Pro": $5.99 a month or $49.99 a year). The server's /pro page adds
// who is paying (client_reference_id), so the webhook knows whose Pro it is.
export const PRO_LINKS = { monthly: 'https://buy.stripe.com/fZu7sMaaM2IN8SL7WW4F201', yearly: 'https://buy.stripe.com/bJe4gA6YA5UZ8SL9104F202' };
// Yearly was $39 (link …F200, switched off on 2026-09-25 when the owner made it $49.99).
// Stripe's customer portal (Settings → Billing → Customer portal → login link): Stripe emails a code to the address
// that paid, then shows the plan, the card, and the invoices, with a button to cancel (Pro then stays on until the end
// of the time paid for). Its "Return" link goes back to Settings.
export const PORTAL = 'https://billing.stripe.com/p/login/fZu8wQ3Mo6Z3b0Tcdc4F200';
// On Free, up to this many cards can have a picture or a sound. Pro has no limit.
export const FREE_MEDIA = 100;
// AI explanations of a card (ai.mjs): Free gets this many a day, Pro as many as it likes (up to a fair-use ceiling).
export const FREE_EXPLAINS = 3, PRO_EXPLAINS = 200;
// Making cards from files, photos, recordings, videos, text and topics (make.mjs). These numbers are the owner's to change; the
// server, the apps and the Pricing page all read them from here.
//   perDay: makes a day.    pages: pages in one make (a page is 3,000 characters of text; a slide or a scan is one page).
//   minutes: of recording or video in one make.    photos: pictures in one make.    fileMB: the biggest single file.
// The speech service takes audio files up to AUDIO_MB, so a recording is held to that too. One make returns at most CARDS_MAX cards.
export const MAKE = {
  free: { perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20 },
  pro: { perDay: 30, pages: 300, minutes: 120, photos: 50, fileMB: 40 }
};
export const MAKE_AUDIO_MB = 25, MAKE_CARDS_MAX = 100;
// A deck's Guide (like a README) and its extra pages: how long a page can be, how many pages a deck has, how many older versions are
// kept for each, and how far apart (in minutes) two kept versions are.
export const GUIDE = { chars: 40000, pages: 10, versions: 10, gapMin: 5 };
