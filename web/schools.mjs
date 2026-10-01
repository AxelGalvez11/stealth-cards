// The school list on the server (web/schools.json, made by design/schools.mjs from the US Department of Education's IPEDS directory):
// turning a school's id into its name, and a few typed words into the school they mean. The list is read the first time it's needed;
// if it can't be read, schools still work as typed names ("Other"), only picking by id doesn't.
import { schoolSearch } from './school.js';

let rows = null, byId = null;
async function load() {
  if (rows) return rows;
  try {
    // A literal address, so the host that bundles this server for Vercel brings the file along.
    const j = (await import('./schools.json', { with: { type: 'json' } })).default;
    rows = Array.isArray(j.rows) ? j.rows : [];
  } catch (e) { console.error('schools.json', e.message); rows = []; }
  byId = new Map(rows.map(r => [r[0], r]));
  return rows;
}
export const schoolList = load;
// A school by its id: [id, name, city, state, other names], or null.
export async function schoolById(id) { await load(); return byId.get(String(id ?? '')) || null; }
// The schools some typed words find, best first.
export async function findSchools(q, limit = 40) { return schoolSearch(await load(), q, limit); }
