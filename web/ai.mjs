// Lucida's own AI: explanations of a card's answer, through OpenRouter (the owner's key, OPENROUTER_API_KEY). The
// model is DeepSeek unless LUCIDA_AI_MODEL names another. Quiz questions don't come from here: people's own AI apps
// write those over MCP (mcp.mjs), so they cost Lucida nothing.
import R from './rich.js';

export const aiReady = () => !!process.env.OPENROUTER_API_KEY;
const MODEL = () => process.env.LUCIDA_AI_MODEL || 'deepseek/deepseek-v4-flash';
const SYSTEM = 'You explain flashcards to a student who is studying them. In two to four short sentences of plain English, explain why the answer is right: the key idea behind it, and a way to remember it. No preamble, no headings, no lists, no restating the question. You may put one key term in **bold**.';
const plain = x => R.plain(String(x || ''), { join: ' ', math: 'show', cloze: true, blank: '____' }).trim();

// Why a card's answer is right, in a few sentences (a question asked in Learn mode gives more to go on).
export async function explain(card, { deck = '', question = '' } = {}) {
  // A box of a picture (image occlusion) asks what's under the box: its label is the answer.
  const box = card.kind === 'image' && card.box != null ? (card.boxes || []).find(b => b.id === card.box) : null;
  const front = card.kind === 'cloze' ? plain(card.text) : plain(card.front), back = card.kind === 'cloze' ? R.blanks(card.text, { math: 'show' }).join(', ') : box ? box.label : plain(card.back);
  const lines = [deck && 'Deck: ' + deck, 'Card: ' + (front || (box ? '(a picture with one part hidden: what is it?)' : '(a picture)')), 'Answer: ' + back, card.note && 'Note on the card: ' + plain(card.note), question && question !== front && 'Asked as: ' + question].filter(Boolean);
  // OPENROUTER_BASE lets tests answer instead of OpenRouter.
  const res = await fetch((process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1') + '/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(30000),
    headers: { authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'content-type': 'application/json', 'HTTP-Referer': 'https://lucida.cards', 'X-Title': 'Lucida' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 320, temperature: 0.3, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: lines.join('\n') }] })
  }).catch(() => null);
  if (!res || !res.ok) throw new Error('The AI didn’t answer. Try again in a moment.');
  const j = await res.json().catch(() => ({}));
  const text = String((((j.choices || [])[0] || {}).message || {}).content || '').trim();
  if (!text) throw new Error('The AI didn’t answer. Try again in a moment.');
  return text.slice(0, 1500);
}
