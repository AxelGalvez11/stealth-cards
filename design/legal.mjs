// The Privacy Policy and Terms of Service at lucida.cards/privacy and lucida.cards/terms, in plain words, describing
// what Lucida actually does (see web/: auth.mjs, store.mjs, supa.mjs, mcp.mjs, media.mjs, voice.mjs). Keep them in
// step with the app. build.mjs draws each as a board; design/to-site.mjs turns them into pages.
// A body item is a paragraph, or ['list', ...items].
// Support: the address Lucida's sign-in emails come from (Resend). It needs receiving turned on in Resend (an MX record
// on lucida.cards) before replies arrive.
export const CONTACT = 'team@lucida.cards';
export const UPDATED = 'October 1, 2026';

export const PRIVACY = {
  title: 'Privacy Policy',
  intro: 'Lucida is a flashcard app that your AI apps can connect to. This page explains what we keep, why, and what you can do about it. We don’t sell your data and we don’t show ads.',
  sections: [
    { h: 'What we keep', body: [
      ['list',
        'Your email address, so we can send you sign-in codes. If you sign in with Google or Apple, we get your email and name from them. If you set a password, it’s kept only in scrambled form.',
        'What you put in Lucida: your decks, cards, pictures and sounds, your reviews and grades, and your settings.',
        'What a deck keeps about where its cards came from: its Guide (the page you write under a deck) and its Sources, which are the files, recordings, videos, pasted text and topics you made cards from, with the file or recording itself if you kept it. Sources are private to you, even on a shared deck; a shared deck’s page may say how many it has, and shows its Guide.',
        'Your personal AI link, the private address your AI apps use to reach your cards, and the AI apps you allowed to sign in to Lucida (their name, the site they belong to, and when you connected them). Their sign-in keys are kept only in scrambled form.',
        'Your profile, if you share decks or edit it: your name, @handle, picture, and what you add about yourself.',
        'If you buy Pro: whether you have it and until when. Stripe or Apple takes the payment; we never see your card number.',
        'Reports you send, and the people you block.',
        'Basic technical records. Our hosting and database providers log things like IP addresses and request times, so they can keep Lucida running and secure.']
    ] },
    { h: 'How we use it', body: [
      ['list',
        'To run Lucida: show your cards, plan your reviews, keep you signed in, and send sign-in codes.',
        'To make what you ask for: cards from a file, pictures, a recording, a link, pasted text or a topic, and questions for a live game.',
        'To show what you share to the people you share it with.',
        'To keep it safe: stop abuse, look at reports, and fix problems.'],
      'We don’t sell your data, use it for ads, or use your cards to train AI models.'
    ] },
    { h: 'What others can see', body: [
      'A deck you share publicly, and your profile, can be seen by anyone, including search engines. A Link only deck is seen only by people with its link. Private decks are only yours.',
      'If someone studies or copies your deck, they see it as you shared it. A copy stays theirs if you stop sharing.'
    ] },
    { h: 'AI apps you connect', body: [
      'When you add Lucida to Claude, ChatGPT, or another AI app, you either sign in to Lucida and press Allow, or paste your private link. That app can then read and change your cards, within what you allow on the Connect AI page. What you share with the AI app itself is covered by that company’s privacy policy.',
      'You can cut off one app at a time with Disconnect on the Connect AI page, or every app that uses your private link at once by making a new link there. They stop working right away.'
    ] },
    { h: 'Who helps us run Lucida', body: [
      ['list',
        'Vercel hosts the website and the app.',
        'Supabase stores your account, cards, pictures, and sounds, in the United States.',
        'Resend sends our emails.',
        'Stripe takes payments for Pro on the web, and Apple for Pro bought in the iPhone app.',
        'When you ask Lucida to explain an answer, the card’s text goes to OpenRouter, which passes it to an AI model that writes the explanation.',
        'When you ask Lucida to make cards (or live questions) from a file, pictures, a recording, pasted text or a topic, what the AI needs goes to OpenRouter, which passes it to an AI model that writes them: the text Lucida pulled out of your file, your pictures or scanned pages, or your topic. A recording goes first to a speech-to-text model, which turns it into text. We ask for services that say they don’t keep what they’re sent or train on it. They see only what you chose to make cards from, never your other cards.',
        'When you give Lucida a YouTube link, the link goes to Google (Gemini), which watches the public video and writes notes from it for Lucida.',
        'The files you upload to make cards are kept in your own private storage while Lucida works, and deleted when it’s done, unless you keep them as the deck’s Source. A file you never finish with is deleted the next time you make cards, or when you delete your data.',
        'Themes load their fonts from Google Fonts.',
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
        'Delete a Source to remove its file and recording (the cards stay). Deleting a deck, your data or your account removes its Sources too.',
        'Make a deck private again, or block someone, at any time.',
        `To delete your account completely, including your email address, use Delete account in Settings, or write to ${CONTACT}. Backups expire on their own soon after.`]
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
      'You need to be at least 13 to use Lucida. Keep your email account, your password (if you set one), and your Lucida AI link to yourself: anyone with them can reach your cards. You’re responsible for what happens in your account, so tell us if something looks wrong.'
    ] },
    { h: 'Your cards', body: [
      'Your cards are yours. You let us store, copy, and show them only to run Lucida for you, for example to show them to you and to the AI apps you connect. Only add things you have the right to use, and only make cards from files, recordings and videos you may use.',
      'When you share a deck, you also let the people you share it with see it, study it, and copy it into their own library. Their copies stay theirs.'
    ] },
    { h: 'Cards made by AI', body: [
      'Lucida’s own AI, and the AI apps you connect, can make mistakes, and so can the cards and questions they make. Lucida shows you new cards before they’re saved. Check what matters, especially before an exam, and don’t rely on Lucida for medical, legal, or other professional advice.'
    ] },
    { h: 'Fair use', body: [
      'Please don’t:',
      ['list',
        'break the law, or add things that aren’t yours to share;',
        'try to reach other people’s accounts or data;',
        'overload, attack, or get around the limits of Lucida;',
        'use Lucida to send spam or harm anyone;',
        'harass anyone, or share hateful, sexual, or violent content.'],
      'We may remove what breaks these rules and suspend the accounts that post it. If you see something that does, report it from its ⋯ menu; we look at every report. You can also block anyone you don’t want to hear from.'
    ] },
    { h: 'The service', body: [
      'Lucida is free to use. Lucida Pro adds more tools for $5.99 a month or $49.99 a year. It renews on its own until you cancel. Cancel at any time: on the web in Settings, or for Pro bought in the iPhone app, in your iPhone’s Settings under Subscriptions. Pro stays on until the end of the time you paid for. If a price changes, we’ll tell you before it applies to you.',
      'We keep improving Lucida, so features can change, and we may stop offering parts of it.'
    ] },
    { h: 'Ending', body: [
      `You can stop using Lucida at any time, and delete your account in Settings or by writing to ${CONTACT}.`
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
