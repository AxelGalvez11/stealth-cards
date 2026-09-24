// Lucida Pro, paid through Stripe. Stripe tells this server about each payment and each change with a webhook to
// /api/stripe, signed with the endpoint's secret (STRIPE_WEBHOOK_SECRET), and the server keeps one row per subscription
// in Supabase (`pro` in supa.mjs). The server never calls Stripe, so it needs no Stripe key: paying, switching plans,
// and cancelling all happen on Stripe's own pages (plans.mjs).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pro as rows } from './supa.mjs';
import { PRO_LINKS, PORTAL } from './plans.mjs';

// Stripe signs each event: t=<unix time>,v1=<HMAC-SHA256 of "time.body" with the secret>. An event more than 5 minutes
// old is refused, so a copied one can't be sent again later.
export function signedBy(raw, header, secret, now = Date.now()) {
  const parts = String(header || '').split(','), t = (parts.find(p => p.startsWith('t=')) || '').slice(2);
  if (!secret || !/^\d+$/.test(t) || Math.abs(now / 1000 - +t) > 300) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(t + '.').update(raw).digest('hex'));
  return parts.filter(p => p.startsWith('v1=')).some(p => { const got = Buffer.from(p.slice(3)); return got.length === want.length && timingSafeEqual(got, want); });
}

const iso = s => (s ? new Date(s * 1000).toISOString() : null);
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// What an event means for someone's Pro. Checkout says who paid (the /pro page sent their user id along, and the email
// covers paying from somewhere else); the subscription's own events say whether it's on, which plan, until when, and
// whether it's set to end. Other events are fine to ignore.
export async function onEvent(e) {
  const o = (e && e.data && e.data.object) || {};
  if (e.type === 'checkout.session.completed' && o.mode === 'subscription' && o.subscription) {
    const email = String((o.customer_details && o.customer_details.email) || o.customer_email || '').trim().toLowerCase();
    await rows.checkout({ p_subscription: String(o.subscription), p_customer: String(o.customer || ''), p_user: UID.test(o.client_reference_id || '') ? o.client_reference_id : null, p_email: email || null });
    return true;
  }
  if (/^customer\.subscription\.(created|updated|deleted)$/.test(e.type) && o.id) {
    const item = (o.items && o.items.data && o.items.data[0]) || {}, price = item.price || o.plan || {};
    await rows.status({ p_subscription: String(o.id), p_customer: String(o.customer || ''), p_status: e.type.endsWith('deleted') ? 'canceled' : String(o.status || ''),
      p_plan: (price.recurring && price.recurring.interval) || price.interval || null,
      // When it renews, or when it ends if it's set to.
      p_period_end: iso(o.cancel_at || o.current_period_end || item.current_period_end), p_ending: !!(o.cancel_at_period_end || o.cancel_at), p_at: iso(e.created) });
    return true;
  }
  return false;
}

// Whether someone has Pro, remembered for a minute (the app's first load always asks again, so it's right just after
// paying). Past due still counts: Stripe keeps retrying the card for a while before it cancels.
const ON = new Set(['active', 'trialing', 'past_due']);
const seen = new Map();
export async function planOf(uid, email, fresh = false) {
  const hit = seen.get(uid);
  if (!fresh && hit && hit.until > Date.now()) return hit.plan;
  let plan;
  try {
    const list = await rows.of(uid, email);
    // Paid with this email before signing in: it's theirs now.
    await Promise.all(list.filter(r => !r.user_id).map(r => rows.claim(r.subscription, uid).catch(() => {})));
    const on = list.filter(r => ON.has(r.status)).sort((a, b) => String(b.period_end || '').localeCompare(String(a.period_end || '')))[0];
    plan = on ? { pro: true, every: on.plan === 'month' ? 'month' : on.plan === 'year' ? 'year' : '', until: on.period_end || '', ending: !!on.ending } : { pro: false };
  } catch (e) {
    // If the check itself fails, the app still opens (on Free until the next try).
    console.error(e); return { pro: false };
  }
  if (seen.size > 5000) seen.clear();
  seen.set(uid, { plan, until: Date.now() + 60000 });
  return plan;
}

// Stripe's checkout for Pro, told who is paying.
export function checkoutUrl(every, user) {
  const u = new URL(PRO_LINKS[every === 'month' ? 'monthly' : 'yearly']);
  u.searchParams.set('client_reference_id', user.id);
  if (user.email) u.searchParams.set('prefilled_email', user.email);
  return u.href;
}
// Stripe's page for changing or cancelling Pro, with the email filled in.
export function portalUrl(email) {
  if (!PORTAL) return '';
  const u = new URL(PORTAL);
  if (email) u.searchParams.set('prefilled_email', email);
  return u.href;
}
