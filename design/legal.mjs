// The Privacy Policy and Terms of Service at lucida.cards/privacy and lucida.cards/terms, in plain words, describing
// what Lucida actually does (see web/: auth.mjs, store.mjs, supa.mjs, mcp.mjs, media.mjs, voice.mjs). Keep them in
// step with the app. build.mjs draws each as a board; design/to-site.mjs turns them into pages.
// A body item is a paragraph, or ['list', ...items].
export const CONTACT = '[CONTACT EMAIL]';
export const UPDATED = 'September 23, 2026';

export const PRIVACY = {
  title: 'Privacy Policy',
  intro: 'Lucida is a flashcard app that your AI apps can connect to. This page explains what we keep, why, and what you can do about it. We don’t sell your data and we don’t show ads.',
  sections: [
    { h: 'What we keep', body: [
      ['list',
        'Your email address, so we can send you sign-in codes. If you sign in with Google or Apple, we get your email and name from them.',
        'What you put in Lucida: your decks, cards, pictures and sounds, your reviews and grades, and your settings.',
        'Your personal AI link, the private address your AI apps use to reach your cards.',
        'Basic technical records. Our hosting and database providers log things like IP addresses and request times, so they can keep Lucida running and secure.']
    ] },
    { h: 'How we use it', body: [
      ['list',
        'To run Lucida: show your cards, plan your reviews, keep you signed in, and send sign-in codes.',
        'To keep it safe: stop abuse and fix problems.'],
      'We don’t sell your data, use it for ads, or use your cards to train AI models.'
    ] },
    { h: 'AI apps you connect', body: [
      'When you add your Lucida link to Claude, ChatGPT, or another AI app, that app can read and change your cards, within what you allow on the Connect AI page. What you share with the AI app itself is covered by that company’s privacy policy.',
      'You can cut off every AI app at once by making a new link on the Connect AI page. The old one stops working right away.'
    ] },
    { h: 'Who helps us run Lucida', body: [
      ['list',
        'Vercel hosts the website and the app.',
        'Supabase stores your account, cards, pictures, and sounds, in the United States.',
        'Resend sends our emails.',
        'When Lucida makes a voice for a sound card, the card’s text goes to the speech service that makes it.',
        'When you or your AI add a picture or sound from a link, Lucida downloads it from that site.'],
      'They only get what they need to do their part.'
    ] },
    { h: 'Cookies', body: [
      'We use cookies only to keep you signed in. No ad or tracking cookies.'
    ] },
    { h: 'Your choices', body: [
      ['list',
        'Export every deck, card, and review from Settings whenever you want.',
        'Delete decks and cards at any time, or everything at once from Settings.',
        `To delete your account completely, including your email address, write to ${CONTACT}. We do it within 30 days; backups expire on their own soon after.`]
    ] },
    { h: 'Children', body: [
      'Lucida isn’t meant for children under 13, and we don’t knowingly keep their information.'
    ] },
    { h: 'Changes', body: [
      'If we change this policy, we’ll update the date at the top. For big changes, we’ll tell you in the app or by email first.'
    ] },
    { h: 'Questions', body: [
      `Write to ${CONTACT}.`
    ] }
  ]
};

export const TERMS = {
  title: 'Terms of Service',
  intro: 'These terms cover your use of Lucida, the website at lucida.cards and the app at app.lucida.cards. By using Lucida, you agree to them. If you don’t, please don’t use it.',
  sections: [
    { h: 'Your account', body: [
      'You need to be at least 13 to use Lucida. Keep your email account and your Lucida AI link to yourself: anyone with the link can reach your cards. You’re responsible for what happens in your account, so tell us if something looks wrong.'
    ] },
    { h: 'Your cards', body: [
      'Your cards are yours. You let us store, copy, and show them only to run Lucida for you, for example to show them to you and to the AI apps you connect. Only add things you have the right to use.'
    ] },
    { h: 'Cards made by AI', body: [
      'AI apps can make mistakes, and so can the cards they make. Check what matters, especially before an exam, and don’t rely on Lucida for medical, legal, or other professional advice.'
    ] },
    { h: 'Fair use', body: [
      'Please don’t:',
      ['list',
        'break the law, or add things that aren’t yours to share;',
        'try to reach other people’s accounts or data;',
        'overload, attack, or get around the limits of Lucida;',
        'use Lucida to send spam or harm anyone.'],
      'We may suspend accounts that do.'
    ] },
    { h: 'The service', body: [
      'Lucida is free for now. If that changes, we’ll tell you before you pay for anything. We keep improving Lucida, so features can change, and we may stop offering parts of it.'
    ] },
    { h: 'Ending', body: [
      `You can stop using Lucida at any time, and ask us to delete your account at ${CONTACT}.`
    ] },
    { h: 'No guarantees', body: [
      'Lucida is provided as is. As far as the law allows, we don’t promise it will always be available or free of mistakes, and we aren’t responsible for indirect losses or lost data. Keep an export of anything you can’t lose.'
    ] },
    { h: 'Changes to these terms', body: [
      'If we change these terms, we’ll update the date at the top, and tell you about big changes first. Using Lucida after a change means you accept it.'
    ] },
    { h: 'Questions', body: [
      `Write to ${CONTACT}.`
    ] }
  ]
};
