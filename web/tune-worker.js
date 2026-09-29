// Tune to you (tune.js), run off the page in a worker, so the app keeps going while it fits. It gets the reviews and
// the standard parameters, reports how far along it is, and hands back the fit.
import { fit } from './tune.js';

onmessage = e => {
  try { postMessage({ result: fit(e.data.input, { w: e.data.w, progress: p => postMessage({ progress: p }) }) }); }
  catch (err) { postMessage({ error: String(err && err.message || err) }); }
};
