// Checks structured data (JSON-LD) against schema.org: every @type exists, every property is one that type has (or one of its
// parents has), and every value is the kind the property takes (text, a web address, a date, a number, or a node of the right
// type). design/schema-org.json is that part of schema.org, cut from the official vocabulary (schema.org release 30.1), for
// the types the site uses; a type missing from it is reported, so the file is extended on purpose. On top of schema.org, a few
// fields search engines ask for are required (a FAQ's questions need answers, a breadcrumb's steps need numbers and names, an
// article needs a date and an author, an offer needs a price).
//   checkJsonLd(data) → a list of problems (empty when it's fine)
import { readFileSync } from 'node:fs';

const S = JSON.parse(readFileSync(new URL('./schema-org.json', import.meta.url), 'utf8')).types;
const up = t => { const seen = new Set(); const go = x => { if (seen.has(x) || !S[x]) return; seen.add(x); S[x].sub.forEach(go); }; go(t); return [...seen]; };
const listOf = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const isUrl = s => /^https?:\/\/[^\s]+$/.test(s);
const PRIMITIVE = { Text: v => typeof v === 'string' && v.length > 0, URL: v => typeof v === 'string' && isUrl(v), Date: v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v), DateTime: v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v),
  Number: v => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)), Integer: v => Number.isInteger(v), Boolean: v => typeof v === 'boolean' };

export function checkJsonLd(data) {
  const problems = [], ids = new Map(), refs = [];
  const bad = (path, msg) => problems.push(path + ': ' + msg);
  const nodes = data && data['@graph'] ? data['@graph'] : [data];
  if (!data || data['@context'] !== 'https://schema.org') bad('@context', 'should be "https://schema.org"');

  const node = (n, path, expect) => {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return bad(path, 'should be an object');
    const keys = Object.keys(n).filter(k => k !== '@context');
    if (keys.length === 1 && keys[0] === '@id') { refs.push([path, n['@id']]); return; }
    const types = listOf(n['@type']);
    if (!types.length) return bad(path, 'has no @type');
    const known = types.filter(t => S[t]);
    for (const t of types) if (!S[t]) bad(path, 'the type "' + t + '" isn’t in design/schema-org.json (a typo, or one to add)');
    if (n['@id']) { if (ids.has(n['@id'])) bad(path, 'the @id ' + n['@id'] + ' is used twice'); ids.set(n['@id'], n); }
    const all = new Set(known.flatMap(up));
    if (expect && expect.length && !known.some(t => up(t).some(a => expect.includes(a))) && !expect.includes('Thing')) bad(path, types.join('/') + ' isn’t one of ' + expect.join(', '));
    const props = {};
    for (const t of all) Object.assign(props, S[t].props);
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith('@')) continue;
      if (!props[k]) { bad(path, '"' + k + '" isn’t a property of ' + types.join('/')); continue; }
      const ranges = props[k];
      for (const [i, x] of listOf(v).entries()) {
        const p = path + '.' + k + (Array.isArray(v) ? '[' + i + ']' : '');
        if (x && typeof x === 'object') {
          if (ranges.includes('Text') && !ranges.some(r => S[r]) && !x['@type']) bad(p, 'should be text');
          else node(x, p, ranges.filter(r => S[r]));
        } else {
          // A web address where a node goes stands for that node (a breadcrumb's "item", say).
          if (typeof x === 'string' && isUrl(x) && ranges.some(r => S[r])) continue;
          const ok = ranges.some(r => PRIMITIVE[r] && PRIMITIVE[r](x));
          if (!ok) bad(p, 'has ' + JSON.stringify(x) + ', which isn’t ' + ranges.filter(r => PRIMITIVE[r]).join(' or ') + (ranges.some(r => S[r]) ? ' (or a ' + ranges.filter(r => S[r]).join('/') + ')' : ''));
        }
      }
    }
    needs(n, path, all);
  };

  // What search engines ask for on top of schema.org.
  const has = (n, path, ...keys) => { for (const k of keys) if (n[k] === undefined || n[k] === '' || (Array.isArray(n[k]) && !n[k].length)) bad(path, 'needs "' + k + '"'); };
  const needs = (n, path, all) => {
    // The site's own organization (a top-level node) must say who it is; one named inside another (a school) only needs a name.
    if (all.has('Organization') && !all.has('Person')) has(n, path, ...(path.includes('.') ? ['name'] : ['name', 'url', 'logo', 'sameAs']));
    if (all.has('WebSite')) has(n, path, 'name', 'url');
    if (all.has('Article')) { has(n, path, 'headline', 'dateModified', 'author', 'publisher', 'image', 'mainEntityOfPage'); if (n.headline && n.headline.length > 110) bad(path, 'the headline is over 110 characters'); }
    if (all.has('SoftwareApplication')) has(n, path, 'name', 'applicationCategory', 'operatingSystem', 'offers');
    if (all.has('Offer')) has(n, path, 'price', 'priceCurrency');
    if (all.has('ProfilePage')) has(n, path, 'mainEntity');
    if (all.has('LearningResource')) has(n, path, 'name');
    if (all.has('WebPage')) has(n, path, 'url', 'name');
    if (n['@type'] === 'FAQPage' || listOf(n['@type']).includes('FAQPage')) has(n, path, 'mainEntity');
    if (all.has('Question')) { has(n, path, 'name', 'acceptedAnswer'); if (n.acceptedAnswer && typeof n.acceptedAnswer === 'object') has(n.acceptedAnswer, path + '.acceptedAnswer', 'text'); }
    if (listOf(n['@type']).includes('BreadcrumbList')) {
      const items = listOf(n.itemListElement);
      has(n, path, 'itemListElement');
      items.forEach((it, i) => { if (it.position !== i + 1) bad(path + '.itemListElement[' + i + ']', 'position should be ' + (i + 1)); has(it, path + '.itemListElement[' + i + ']', 'name'); if (i < items.length - 1) has(it, path + '.itemListElement[' + i + ']', 'item'); });
    }
  };

  nodes.forEach((n, i) => node(n, (data && data['@graph'] ? '@graph[' + i + ']' : 'root'), null));
  // A reference to another node must point at one in this document, unless it's an address elsewhere.
  for (const [path, id] of refs) if (!ids.has(id) && !/^https?:\/\/(?!lucida\.cards|app\.lucida\.cards)/.test(id)) bad(path, 'refers to ' + id + ', which isn’t in this data');
  return problems;
}
