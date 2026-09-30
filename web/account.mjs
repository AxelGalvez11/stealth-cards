// Delete account (Settings → Account; Apple requires it inside the app). Everything about the person goes: their library and
// files, everything the study network holds (social.mjs forget: profile, follows, saves, News, suggestions, classes, shared
// decks and their public pictures), the people they blocked and who blocked them, their Live rooms, their purchases' rows
// (Apple's and Stripe's), and last of all the sign-in account itself, so there is nothing left to sign back into: signing
// in again with the same email makes a brand new account with an empty library.
// Two rules about order:
//   * A Stripe subscription is cancelled first. If Stripe can't be reached (or the server has no STRIPE_SECRET_KEY) nothing
//     has been deleted yet and the person is told to cancel Pro first.
//   * The sign-in account goes last. If a step fails the person is still signed in and can try again (every step can run
//     twice); and no data is ever left without an account to reach it.
// Apple's subscriptions can't be cancelled by us: the person does that in iPhone Settings → Subscriptions. The answer says
// whether they had one that is still on, so the app can say so.
import { cloud, library, files, rooms, pro as proRows, admin, rest, val } from './supa.mjs';
import * as social from './social.mjs';
import { cancelStripe, dropPlan } from './billing.mjs';
import { purchasesOf, activePlan, erase as eraseApple } from './apple.mjs';
import { eraseDev } from './store.mjs';

// Blocks and Apple purchases have tables of their own (supabase/appstore.sql). If that SQL hasn't run yet, deleting an account
// still has to work, so a failure on those two is only logged.
const tolerate = (what, p) => Promise.resolve(p).catch(e => console.error(what, e.message));

export async function deleteAccount({ uid, email = '' }) {
  const apple = !!activePlan(await purchasesOf(uid).catch(() => []));
  if (cloud()) await cancelStripe(uid, email);
  // (forget removes the blocks they made; the ones against them stay through "Delete my data" but go with the account.)
  await social.forget(uid);
  await tolerate('blocks', rest('/blocks?blocked=eq.' + val(uid), { method: 'DELETE' }));
  if (cloud()) {
    await files.clear(uid);
    await rooms.clearHost(uid);
    await library.remove(uid);
    await proRows.remove(uid, email);
  } else eraseDev(uid);
  await tolerate('apple purchases', eraseApple(uid));
  if (cloud()) await admin.deleteUser(uid);
  dropPlan(uid);
  return { apple };
}
