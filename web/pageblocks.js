// STAND-IN, replaced by the full converter (built beside guide.js's Note blocks). Same exports, so web/pages.mjs works meanwhile.
export const NOTE_BLOCK_TYPES = ['heading', 'text', 'quote', 'list', 'callout', 'toggle', 'table', 'chain', 'code', 'image', 'divider', 'card', 'embed'];
const rid = () => 'b' + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
export function normalizeNote(input) {
  if (typeof input === 'string') return markdownToNote(input);
  if (input && typeof input.markdown === 'string') return markdownToNote(input.markdown);
  const blocks = (input && Array.isArray(input.blocks) ? input.blocks : []).filter(b => b && NOTE_BLOCK_TYPES.includes(b.type)).slice(0, 2000);
  const seen = new Set();
  for (const b of blocks) { if (typeof b.id !== 'string' || seen.has(b.id)) b.id = rid(); seen.add(b.id); }
  return { blocks };
}
export function markdownToNote(md) { return { blocks: String(md || '').split(/\n{2,}/).filter(x => x.trim()).map(text => ({ id: rid(), type: 'text', text })) }; }
export function noteToMarkdown(note) { return ((note && note.blocks) || []).map(b => b.text || b.title || '').filter(Boolean).join('\n\n'); }
export function blockMarkdown(note, id) { const b = ((note && note.blocks) || []).find(x => x.id === id); return b ? noteToMarkdown({ blocks: [b] }) : ''; }
