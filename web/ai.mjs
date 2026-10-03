// Lucida's own AI: explanations of a card's answer, and answers to questions asked about the card, through OpenRouter (the owner's key, OPENROUTER_API_KEY). The
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

// What the AI is told about a card: its deck, the card's words, and what the answer is (a box of a picture (image occlusion) asks what's
// under the box: its label is the answer).
function cardOf(card, deck, question) {
  const box = card.kind === 'image' && card.box != null ? (card.boxes || []).find(b => b.id === card.box) : null;
  const front = card.kind === 'cloze' ? plain(card.text) : plain(card.front), back = card.kind === 'cloze' ? R.blanks(card.text, { math: 'show' }).join(', ') : box ? box.label : plain(card.back);
  return { box, front, lines: [deck && 'Deck: ' + deck, 'Card: ' + (front || (box ? '(a picture with one part hidden: what is it?)' : '(a picture)')), 'Answer: ' + back, card.note && 'Note on the card: ' + plain(card.note), question && question !== front && 'Asked as: ' + question].filter(Boolean) };
}
// One answer from the model: the careful request first; if nothing comes back, V4 Flash asked plainly (as Explain always did), so the choice
// of hosts can never stop an answer. Both together stay inside a minute. '' when neither answered. OPENROUTER_BASE lets tests answer instead.
async function reply(messages) {
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
  return await ask({ model: MODEL(), models: [...new Set([MODEL(), FALLBACK])], provider: PROVIDER, reasoning: { enabled: false } }, 20000)
    || await ask({ model: FALLBACK }, 25000);
}

// Why a card's answer is right, in a few sentences (a question asked in Learn mode gives more to go on).
export async function explain(card, { deck = '', question = '' } = {}) {
  const { lines } = cardOf(card, deck, question);
  const text = await reply([{ role: 'system', content: SYSTEM }, { role: 'user', content: lines.join('\n') }]);
  if (!text) throw new Error('The AI didn’t answer. Try again in a moment.');
  return text.slice(0, 1500);
}

// A question about a card, asked in Explain (the owner, 2026-10-02: "add a chatcomposer so user can ask question"). The model gets the card
// (its kind, its words, a picture's labels), the explanation it gave, and the conversation so far, and answers about this card only: it is
// not a general chatbot. Nothing of the conversation is kept: it comes with each question.
const KIND = { basic: 'Basic', cloze: 'Fill in the blank', image: 'Picture', audio: 'Audio' };
const ASK = 'A student studying one flashcard asks about it. Answer in one to four short sentences of plain English, about this card’s subject only; if the question is about something else, say in one sentence that you can only help with this card. No preamble, no headings, no lists. You may put one key term in **bold**.';
export async function followUp(card, { deck = '', question = '', explanation = '', turns = [], ask = '' } = {}) {
  const { lines } = cardOf(card, deck, question);
  const labels = card.kind === 'image' ? (card.boxes || []).map(b => plain(b.label)).filter(Boolean) : [];
  const about = ['Kind of card: ' + (KIND[card.kind] || 'Basic'), ...lines, labels.length && 'Labels on the picture: ' + labels.join(', ')].filter(Boolean).join('\n');
  const said = String(explanation || '').trim(), sys = { role: 'system', content: ASK };
  const talk = [...turns.flatMap(t => [{ role: 'user', content: t.q }, { role: 'assistant', content: t.a }]), { role: 'user', content: ask }];
  // (the explanation is the model's first answer; a card with none yet gets the card and the first question as one message)
  const messages = said ? [sys, { role: 'user', content: about + '\nExplain the answer.' }, { role: 'assistant', content: said }, ...talk]
    : [sys, { role: 'user', content: about + '\n\nQuestion: ' + talk[0].content }, ...talk.slice(1)];
  const text = await reply(messages);
  if (!text) throw new Error('The AI didn’t answer. Try again in a moment.');
  return text.slice(0, 1500);
}
