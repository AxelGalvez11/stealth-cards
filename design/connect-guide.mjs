// The "Connect Lucida" page at lucida.cards/connect: how to add Lucida to Claude, ChatGPT, Grok, Gemini, Perplexity and
// Mistral, what to ask, what an AI can and can't do, and where the data goes. Claude's and ChatGPT's directories ask for a page
// like this, and so do people who add Lucida by hand. It follows what the server really does (web/oauth.mjs, web/mcp.mjs), so
// change it with them. build.mjs draws it as a board (SiteConnect, like Privacy and Terms); design/to-site.mjs makes the page.
// A body item is a paragraph, or ['list', ...items]; words can hold a little HTML (links, the address in a box).
import { CONTACT } from './legal.mjs';

export const MCP_ADDRESS = 'https://app.lucida.cards/mcp';
const ADDRESS = `<span style="display: inline-block; max-width: 100%; box-sizing: border-box; padding: 6px 12px; border-radius: 10px; background: {{t.surf}}; color: {{t.text}}; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 15px; font-weight: 500; overflow-wrap: anywhere; user-select: all;">${MCP_ADDRESS}</span>`;

export const CONNECT = {
  title: 'Connect Lucida to your AI',
  updated: 'October 2, 2026',
  intro: 'Lucida keeps your flashcards. Add it to Claude, ChatGPT, Grok, Gemini, Perplexity or Mistral, and your AI can make cards, fix them, and quiz you right in the chat. It takes about a minute.',
  sections: [
    { h: 'What you need', body: [
      ['list',
        'A Lucida account (it’s free). You sign in to it when you connect.',
        'An AI app that lets you add a connector, also called an MCP server, by its address.'],
      'The address to paste:',
      ADDRESS,
      'Use it exactly as written, with nothing after it. The address lucida.cards/mcp sends your AI to a different site, and then signing in fails.'
    ] },
    { h: 'Claude', body: [
      ['list',
        'Open claude.ai, then Customize, then Connectors.',
        'Choose Add custom connector. Name it Lucida and paste the address.',
        'Choose Connect. Sign in to Lucida if it asks, then press Allow.',
        'Start a chat, turn Lucida on from the + menu, and ask for cards.'],
      'In Claude Code, run <b>claude mcp add --transport http lucida ' + MCP_ADDRESS + '</b>, then <b>/mcp</b> inside Claude Code to sign in.'
    ] },
    { h: 'ChatGPT', body: [
      ['list',
        'Open ChatGPT, then Settings, then Apps (it may say Connectors).',
        'Turn on Developer mode in the advanced settings, and create a new app.',
        'Name it Lucida, paste the address, and pick OAuth for how it signs in.',
        'Sign in to Lucida and press Allow. Then add Lucida to a chat and ask for cards.'],
      'ChatGPT’s menus change often. Look for where it adds a custom connector or MCP server.'
    ] },
    { h: 'Grok, Gemini, Perplexity and Mistral', body: [
      ['list',
        '<b>Gemini:</b> on gemini.google.com, open Settings, then Connected Apps, then Add a custom app. Paste the address and follow the steps. Google offers this to personal Google accounts, 18 and over, in the US.',
        '<b>Grok:</b> open Connectors, add a custom connector, and paste the address. It may need a paid plan. On a Business plan, a team admin adds it at console.x.ai.',
        '<b>Perplexity:</b> open Account settings, then Connectors, then Custom connector, then Remote. Paste the address and choose OAuth.',
        '<b>Mistral (Le Chat):</b> open Connectors, then Add Connector, then the Custom MCP Connector tab. Paste the address and choose OAuth 2.1.'],
      'Sign in to Lucida when it asks, then press Allow. These menus change. If you don’t see the same words, look for where the app adds a custom connector, or MCP server, by its address.'
    ] },
    { h: 'If your app can’t sign in', body: [
      'Some tools, like Cursor, can’t sign in to Lucida. For them, open Settings, then Connect AI, and press “Private link for apps that can’t sign in”. It copies a link of your own that works without signing in. Keep it to yourself, because anyone with the link can reach your cards. “Make a new link” there turns the old one off.'
    ] },
    { h: 'Try asking', body: [
      ['list',
        '“Make 15 flashcards about the Krebs cycle and put them in a deck called Biology.”',
        '“What’s due today? Quiz me on it.”',
        '“Turn these lecture notes into fill-in-the-blank cards.” (paste the notes)',
        '“Write Learn mode questions for my Cell Biology deck.”',
        '“Which topics am I weakest at?” (Lucida Pro)',
        '“Find a public MCAT chemistry deck and add it to my library.”']
    ] },
    { h: 'What your AI can do', body: [
      ['list',
        'Read your decks, cards, and study stats.',
        'Add cards: a question and answer, fill in the blank, a picture with a question, or a sound to recognize.',
        'Change cards and decks, and write Learn mode questions.',
        'Delete cards, but only if you turn that on.',
        'Find decks other people share, add them to your library, and suggest changes to them.'],
      'You choose what it may do in Settings, then Connect AI. “Let me check AI cards first” holds every new card and change until you keep it. Two tools, what you’re weakest at and your review history, are part of Lucida Pro.'
    ] },
    { h: 'Limits', body: [
      ['list',
        'An AI can add up to 500 cards in one request.',
        'Free includes up to 100 pictures and sounds. Pro has no limit. Natural voices for sound cards and photo covers are part of Pro.',
        'A picture or sound can be up to 20 MB. It can come from a web link or from a file you upload in the chat.',
        'An AI sees up to 500 cards when it lists a deck, and the first 100 cards of a shared deck.']
    ] },
    { h: 'Your data', body: [
      ['list',
        'Your AI reads and changes only your own library, through the account you signed in with.',
        'Lucida keeps your cards and the list of apps you allowed. It doesn’t see your chats, only what your AI sends it, like the cards it makes. What you tell the AI app is covered by that company’s own privacy policy.',
        'Every app you allow is listed in Settings, then Connect AI, and Disconnect ends it at once.'],
      'Read the <a href="{{privacyHref}}" style="text-decoration: underline;">privacy policy</a>.'
    ] },
    { h: 'If it doesn’t work', body: [
      ['list',
        'Check the address. It has to be exactly ' + MCP_ADDRESS + '.',
        'Remove the connector and add it again.',
        `Write to ${CONTACT} and say which app you used and what it showed.`]
    ] },
    { h: 'Support', body: [
      `Write to ${CONTACT}.`
    ] }
  ]
};
