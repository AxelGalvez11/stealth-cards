// For the themes end-to-end test (e2e-themes.sh): a made-up person on the Free plan (a name that starts with "free") whose
// library has a theme, as if they had Pro when they picked it. The server won't set a theme for Free, so the library file is
// made through the server and then changed.
//   node themes-lapsed.mjs make <server> <name>      makes their decks and cards (through the server)
//   node themes-lapsed.mjs edit <data folder> <name> puts Frutiger Aero in their library file (the server is stopped)
import { readFileSync, writeFileSync } from 'node:fs';
const [mode, where, who] = process.argv.slice(2);
if (mode === 'make') {
  const act = async (type, o = {}) => {
    const r = await fetch(where + '/api/action', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'lc_dev=' + who }, body: JSON.stringify({ type, ...o }) });
    const j = await r.json(); if (!r.ok) throw new Error(type + ': ' + j.error); return j.result;
  };
  const id = (await act('deck.add', { name: 'Cell Biology', tags: ['Biology'] })).id;
  for (const [f, b] of [['What does the electron transport chain pump?', 'Protons'], ['Where does glycolysis happen?', 'In the cytoplasm']]) await act('card.add', { deckId: id, kind: 'basic', front: f, back: b });
  await act('settings.update', { patch: { welcomed: true, name: 'Lee Pono' } });
} else if (mode === 'edit') {
  const f = where + '/users/' + who + '.json', S = JSON.parse(readFileSync(f, 'utf8'));
  S.settings.theme = 'aero';
  writeFileSync(f, JSON.stringify(S));
} else { console.error('make or edit'); process.exit(1); }
