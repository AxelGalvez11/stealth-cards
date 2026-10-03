// Lucida's own quiz questions for Learn mode: one question for each of up to 20 cards, written by DeepSeek through OpenRouter
// (the owner's key, OPENROUTER_API_KEY) with the same models and hosts as Explain (ai.mjs). Only a card's front, back and
// note go to the AI. Each question is saved on its card (store.mjs saveQuiz) in the shape of the questions an AI app writes
// over MCP (add_quiz), marked as Lucida's, so a card is paid for once and Learn mode reuses the question.
import R from './rich.js';

export const BATCH = 20;
const MODEL = () => process.env.LUCIDA_AI_MODEL || 'deepseek/deepseek-v4.1-flash', FALLBACK = 'deepseek/deepseek-v4-flash';
// As Explain: only hosts that keep nothing and train on nothing, running the model at 8 bits or better, the quickest first. This request
// has a JSON schema, so only hosts that honour it may answer (require_parameters). No thinking: twenty short questions don't need it.
const PROVIDER = { data_collection: 'deny', quantizations: ['fp8', 'fp16', 'bf16', 'fp32'], sort: 'latency', require_parameters: true };

const SYSTEM = [
  'You write quiz questions for a student who is studying flashcards. For each numbered card write exactly one question that tests what the card teaches.',
  'Use only what the card says (its front, back and note). Never add outside facts and never contradict the card.',
  'Pick the type that fits the card:',
  '- multiple_choice: the question asks for the card\'s answer. "answer" is the right answer. "wrong" has exactly 3 believable wrong answers about the same subject, of the same kind and about the same length as the right one. Each wrong answer must really be wrong. Never "all of the above" or "none of the above".',
  '- true_false: "question" is one statement about the card that is true or false. "answer" is "true" or "false". "wrong" is an empty list. Make a false statement a small, believable change of the truth. Make about half of the statements false.',
  '- fill_blank: "question" is one sentence from or based on the card, with its key word or phrase replaced by ____ (four underscores, once). "answer" is the missing word or phrase (short). "wrong" has exactly 3 believable wrong words or phrases that could fit the blank. Leave the answer out of the rest of the sentence.',
  '"why" is one short sentence (plain words) saying why the answer is right, from the card. Write in the language of the card. Keep every question short and clear.',
  'Answer with JSON only.'
].join('\n');

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['questions'],
  properties: { questions: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['card', 'type', 'question', 'answer', 'wrong', 'why'],
    properties: {
      card: { type: 'integer', description: 'The number of the card this question is about' },
      type: { type: 'string', enum: ['multiple_choice', 'true_false', 'fill_blank'] },
      question: { type: 'string' }, answer: { type: 'string' },
      wrong: { type: 'array', items: { type: 'string' } }, why: { type: 'string' }
    } } } }
};

const flat = md => R.plain(String(md || ''), { join: ' ', math: 'show' }).trim();
/** What a card says, as the AI sees it: its front, back and note (a fill-in-the-blank card: its sentence with ____, and the words that go there). */
export function cardWords(c) {
  if (!c || (c.kind !== 'basic' && c.kind !== 'cloze')) return null;
  const front = c.kind === 'cloze' ? R.plain(String(c.text || ''), { cloze: true, blank: '____', join: ' ', math: 'show' }).trim() : flat(c.front);
  const back = c.kind === 'cloze' ? R.blanks(String(c.text || ''), { math: 'show' }).join(', ').trim() : flat(c.back);
  if (!front || !back) return null;
  return { front: front.slice(0, 500), back: back.slice(0, 300), note: flat(c.note).slice(0, 400) };
}

const one = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
const key = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const NONE = /^(all|none|both|neither) of the (above|these)|^(a|b|c|d) and (a|b|c|d)$/i;

/** One question the AI wrote, checked and put in the shape add_quiz questions have; null when it isn't good enough. */
export function checkQuestion(x) {
  if (!x || typeof x !== 'object') return null;
  const type = String(x.type || '').toLowerCase().replace(/[\s-]+/g, '_'), why = one(x.why, 240);
  let question = one(x.question, 400);
  if (question.length < 6) return null;
  if (type === 'true_false' || type === 'truefalse') {
    const a = String(x.answer).trim().toLowerCase();
    return a === 'true' || a === 'false' ? { kind: 'true_false', question, answer: a, why } : null;
  }
  const answer = one(x.answer, 160);
  if (!answer || !Array.isArray(x.wrong)) return null;
  // The wrong answers: distinct, never the right one, never "all of the above"; three of them.
  const seen = new Set([key(answer)]), wrong = [];
  for (const w of x.wrong) { const t = one(w, 160), k = key(t); if (!t || !k || seen.has(k) || NONE.test(t)) continue; seen.add(k); wrong.push(t); }
  if (wrong.length < 3 || key(answer) === key(question)) return null;
  if (type === 'multiple_choice' || type === 'choice' || type === 'multiplechoice') return { kind: 'choice', question, answer, wrong: wrong.slice(0, 3), why };
  if (type === 'fill_blank' || type === 'fill_in_the_blank' || type === 'blank') {
    question = question.replace(/_{3,}|\[\s*(?:blank|\.{3}|…)?\s*\]|\.{4,}/gi, '____');
    if ((question.match(/____/g) || []).length !== 1 || answer.length > 60) return null;
    // A sentence that already says the missing word gives the answer away.
    const rest = key(question.replace('____', ' ')), a = key(answer);
    if (a.length >= 4 && (' ' + rest + ' ').includes(' ' + a + ' ')) return null;
    return { kind: 'blank', question, answer, wrong: wrong.slice(0, 3), why };
  }
  return null;
}

// The AI's answer as a list of questions: JSON, maybe in a code fence, maybe after thinking.
function parse(text) {
  const t = String(text || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/```(?:json)?/gi, '');
  const open = t.search(/[{[]/);
  if (open < 0) return [];
  const closer = t[open] === '{' ? '}' : ']';
  for (let end = t.lastIndexOf(closer); end > open; end = t.lastIndexOf(closer, end - 1)) {
    try { const j = JSON.parse(t.slice(open, end + 1)), list = Array.isArray(j) ? j : j && j.questions; if (Array.isArray(list)) return list; } catch { /* a shorter piece */ }
  }
  return [];
}

/**
 * Questions for up to BATCH cards of one deck: { questions: { cardId: [question] }, tried: [cardId ...] }. `tried` are the cards the AI
 * answered about without a question that passed the checks (they aren't asked again until the card changes). Throws when nothing came
 * back at all. Two requests at most: the careful one, then plain V4 Flash (as Explain), so the choice of hosts can never stop it.
 */
export async function writeQuiz(cards, { deck = '' } = {}) {
  const items = cards.slice(0, BATCH).map(c => ({ c, w: cardWords(c) })).filter(x => x.w);
  if (!items.length) return { questions: {}, tried: [] };
  const lines = [];
  if (deck) lines.push('Deck: ' + one(deck, 120));
  lines.push('Write one question for each of these ' + items.length + ' cards.');
  items.forEach((x, i) => { lines.push('', 'Card ' + (i + 1), 'Front: ' + x.w.front, 'Back: ' + x.w.back); if (x.w.note) lines.push('Note: ' + x.w.note); });
  const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: lines.join('\n') }];
  const format = { type: 'json_schema', json_schema: { name: 'quiz', strict: true, schema: SCHEMA } };
  // One request: the questions that passed the checks (card number → question), or null when nothing came back to read.
  const ask = async (how, ms) => {
    const res = await fetch((process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1') + '/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(ms),
      headers: { authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'content-type': 'application/json', 'HTTP-Referer': 'https://lucida.cards', 'X-Title': 'Lucida' },
      body: JSON.stringify({ ...how, max_tokens: 6000, temperature: 0.4, response_format: format, messages })
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const j = await res.json().catch(() => ({})), list = parse((((j.choices || [])[0] || {}).message || {}).content);
    if (!list.length) return null;
    const got = new Map();
    for (const x of list) {
      const n = Math.round(+(x && x.card));
      if (!(n >= 1 && n <= items.length) || got.has(n)) continue;
      const q = checkQuestion(x);
      if (q) got.set(n, q);
    }
    return got;
  };
  // The careful request first; when it gives no question we can use, V4 Flash asked plainly. Both together stay inside two minutes.
  let got = await ask({ model: MODEL(), models: [...new Set([MODEL(), FALLBACK])], provider: PROVIDER, reasoning: { enabled: false } }, 60000), answered = !!got;
  if (!got || !got.size) {
    const again = await ask({ model: FALLBACK }, 60000);
    if (again) { answered = true; if (!got || again.size > got.size) got = again; }
  }
  if (!answered) throw new Error('The AI didn’t answer. Try again in a moment.');
  const questions = {}, tried = [];
  items.forEach((x, i) => { const q = got.get(i + 1); if (q) questions[x.c.id] = [q]; else tried.push(x.c.id); });
  return { questions, tried };
}
