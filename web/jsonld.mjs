// Structured data (JSON-LD) for the app's public pages, read by search engines and AI answers: a shared deck is a learning
// resource (a collection of flashcards, with its card count, author and date), a profile is a profile page. `m` is what
// social.metaFor says about the page (its `ld` holds the facts) and `origin` is where it is served. Pages nobody should find
// (noindex, not found) get nothing.
const SITE = 'https://lucida.cards';
const site = { '@type': 'WebSite', name: 'Lucida', url: SITE + '/' };
const day = s => String(s || '').slice(0, 10);
// JSON for a <script> tag: nothing in it can close the tag.
const script = o => '\n<script type="application/ld+json">' + JSON.stringify(o).split('<').join('\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029') + '</script>';
const crumbs = (url, list) => ({ '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: list.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(item ? { item } : {}) })) });

export function publicLd(m, origin) {
  const d = m && m.ld;
  if (!d || m.noindex || m.status === 404) return '';
  const url = origin + m.url, home = ['Lucida', SITE + '/'];
  if (d.kind === 'deck') {
    const by = d.owner && d.owner.handle ? { '@type': d.owner.kind === 'school' ? 'Organization' : 'Person', name: d.owner.name, url: origin + '/@' + d.owner.handle } : null;
    return script({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: m.title, description: m.description, isPartOf: site, mainEntity: { '@id': url + '#deck' }, breadcrumb: { '@id': url + '#breadcrumb' } },
      { '@type': ['LearningResource', 'Collection'], '@id': url + '#deck', name: d.name, url, description: d.description || d.cards + (d.cards === 1 ? ' flashcard' : ' flashcards'), learningResourceType: 'Flashcards', isAccessibleForFree: true,
        collectionSize: d.cards, ...(by ? { author: by } : {}), ...(d.updated ? { dateModified: day(d.updated) } : {}), ...(d.tags && d.tags.length ? { keywords: d.tags.join(', ') } : {}) },
      crumbs(url, [home, ...(by ? [['@' + d.owner.handle, origin + '/@' + d.owner.handle]] : []), [d.name, url]])] });
  }
  if (d.kind === 'profile') {
    const who = { '@type': d.org ? 'Organization' : 'Person', '@id': url + '#person', name: d.name, alternateName: '@' + d.handle, url, ...(d.bio ? { description: d.bio } : {}),
      ...(d.school && !d.org ? { affiliation: { '@type': 'Organization', name: d.school } } : {}), ...(d.subject ? { knowsAbout: d.subject } : {}) };
    return script({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'ProfilePage', '@id': url, url, name: m.title, description: m.description, isPartOf: site, ...(d.updated ? { dateModified: day(d.updated) } : {}), mainEntity: { '@id': url + '#person' }, breadcrumb: { '@id': url + '#breadcrumb' } },
      who, crumbs(url, [home, ['@' + d.handle, url]])] });
  }
  return '';
}
