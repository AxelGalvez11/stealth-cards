// Lucida's own AI: explanations of a card's answer, through OpenRouter (the owner's key, OPENROUTER_API_KEY). The
// model is DeepSeek V4.1 Flash unless LUCIDA_AI_MODEL names another, with V4 Flash taking over when no host can answer.
// Quiz questions don't come from here: people's own AI apps write those over MCP (mcp.mjs), so they cost Lucida nothing.
import R from './rich.js';

export const aiReady = () => !!process.env.OPENROUTER_API_KEY;
const MODEL = () => process.env.LUCIDA_AI_MODEL || 'deepseek/deepseek-v4.1-flash', FALLBACK = 'deepseek/deepseek-v4-flash';
// Which hosts may answer: ones that don't keep or train on what they're sent, running the model at 8 bits or better
// (the cheapest hosts run 4-bit copies, which answer worse), the quickest first. No thinking: an explanation should
// show in a second or two, and two to four sentences don't need it.
const PROVIDER = { data_collection: 'deny', quantizations: ['fp8', 'fp16', 'bf16', 'fp32'], sort: 'latency' };
const SYSTEM = 'You explain flashcards to a student who is studying them. In two to four short sentences of plain English, explain why the answer is right: the key idea behind it, and a way to remember it. No preamble, no headings, no lists, no restating the question. You may put one key term in **bold**.';
const plain = x => R.plain(String(x || ''), { join: ' ', math: 'show', cloze: true, blank: '____' }).trim();

// Why a card's answer is right, in a few sentences (a question asked in Learn mode gives more to go on).
export async function explain(card, { deck = '', question = '' } = {}) {
  // A box of a picture (image occlusion) asks what's under the box: its label is the answer.
  const box = card.kind === 'image' && card.box != null ? (card.boxes || []).find(b => b.id === card.box) : null;
  const front = card.kind === 'cloze' ? plain(card.text) : plain(card.front), back = card.kind === 'cloze' ? R.blanks(card.text, { math: 'show' }).join(', ') : box ? box.label : plain(card.back);
  const lines = [deck && 'Deck: ' + deck, 'Card: ' + (front || (box ? '(a picture with one part hidden: what is it?)' : '(a picture)')), 'Answer: ' + back, card.note && 'Note on the card: ' + plain(card.note), question && question !== front && 'Asked as: ' + question].filter(Boolean);
  const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: lines.join('\n') }];
  // One request; '' when nothing usable came back. OPENROUTER_BASE lets tests answer instead of OpenRouter.
  const ask = async (how, ms) => {
    const res = await fetch((process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1') + '/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(ms),
      headers: { authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'content-type': 'application/json', 'HTTP-Referer': 'https://lucida.cards', 'X-Title': 'Lucida' },
      body: JSON.stringify({ ...how, max_tokens: 600, temperature: 0.3, messages })
    }).catch(() => null);
    if (!res || !res.ok) return '';
    const j = await res.json().catch(() => ({}));
    // A host that thinks anyway may put its thinking in the answer between <think> marks: only the answer is kept.
    return String((((j.choices || [])[0] || {}).message || {}).content || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  };
  // The careful request first; if nothing comes back, V4 Flash asked plainly (as Explain always did), so the choice
  // of hosts can never stop an explanation. Both together stay inside a minute.
  const text = await ask({ model: MODEL(), models: [...new Set([MODEL(), FALLBACK])], provider: PROVIDER, reasoning: { enabled: false } }, 20000)
    || await ask({ model: FALLBACK }, 25000);
  if (!text) throw new Error('The AI didn’t answer. Try again in a moment.');
  return text.slice(0, 1500);
}
