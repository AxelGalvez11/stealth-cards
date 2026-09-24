// Lucida Pro: where to pay, and where to change or cancel it. Both are Stripe's own pages. The canvas (design/build.mjs)
// and the server (billing.mjs) read these.
// Payment links (Stripe → Payment links, product "Lucida Pro": $5.99 a month or $39 a year). The server's /pro page adds
// who is paying (client_reference_id), so the webhook knows whose Pro it is.
export const PRO_LINKS = { monthly: 'https://buy.stripe.com/fZu7sMaaM2IN8SL7WW4F201', yearly: 'https://buy.stripe.com/fZu8wQ3Mo6Z3b0Tcdc4F200' };
// Stripe's customer portal (Settings → Billing → Customer portal → login link): Stripe emails a code to the address
// that paid, then shows the plan, the card, and the invoices, with a button to cancel (Pro then stays on until the end
// of the time paid for). Its "Return" link goes back to Settings.
export const PORTAL = 'https://billing.stripe.com/p/login/fZu8wQ3Mo6Z3b0Tcdc4F200';
// On Free, up to this many cards can have a picture or a sound. Pro has no limit.
export const FREE_MEDIA = 100;
