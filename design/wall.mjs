// The flashcards on the sign-in and landing walls: one card from each sample deck, as [deck, front, back].
// A deck's name picks its gradient; the columns are set so neighboring cards never share a color family.
// In a front, {} is a blank (the back fills it in place), ♪ an audio card, and `…` code. A back's second line
// (after \n) is smaller.
export const WALL_CARDS = [
  [['Cell Biology', 'The {} is the powerhouse of the cell.', 'mitochondrion'], ['Psychology', 'Who proposed classical conditioning?', 'Ivan Pavlov'], ['Calculus', 'd/dx (x²) = ?', '2x'], ['Anatomy', 'Largest bone in the body?', 'The femur'], ['Pharmacology', 'Ibuprofen blocks which enzyme?', 'COX-1 and COX-2'], ['Spanish Verbs', 'Yo {} dos hermanos.', 'tengo']],
  [['Organic Chemistry', 'C₆H₆', 'Benzene'], ['Italian', 'Buongiorno', 'Good morning'], ['Music Theory', 'How many sharps in D major?', 'Two: F♯ and C♯'], ['Python', '`len([1, 2, 3])`', '`3`'], ['Philosophy', 'Cogito, ergo sum', 'I think, therefore I am'], ['Art History', 'Who painted The Starry Night?', 'Vincent van Gogh']],
  [['Ecology', 'What is a keystone species?', 'One its ecosystem depends on'], ['Geography', 'Capital of Australia?', 'Canberra'], ['Japanese', 'でんしゃ', 'train'], ['Physics', 'F = m · a', 'Newton’s second law'], ['Genetics', 'Adenine pairs with {}.', 'thymine'], ['Astronomy', 'Closest star to Earth?', 'The Sun']],
  [['French', 'la bibliothèque', 'the library'], ['Latin', 'Carpe diem', 'Seize the day'], ['Korean', '♪', '안녕하세요\nhello'], ['Physiology', 'Normal resting heart rate?', '60–100 beats a minute'], ['Statistics', 'What does p < 0.05 mean?', 'Significant at the 5% level'], ['Botany', 'Where does photosynthesis happen?', 'In the chloroplasts']]
];

// Every gradient the site and the app draw from a picture (design/art.mjs), at the shape of the cards that show it:
// each wall deck's (cards are 3:2), and the dark Midnight band at the end of the landing page, wide and on a phone.
export const ART = [
  ...[...new Set(WALL_CARDS.flat().map(([deck]) => deck))].map(deck => ({ deck, w: 480, h: 320 })),
  { palette: 'Midnight', variant: 'wide', w: 960, h: 256 }, { palette: 'Midnight', w: 480, h: 420 }
];
