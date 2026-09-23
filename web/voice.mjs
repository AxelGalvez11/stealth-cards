// Voices for audio cards that AI apps make: the AI sends the words, and Lucida turns them into speech with
// ElevenLabs or OpenAI, whichever key is in .env (see README). With no key, the app reads the words aloud
// with the device's own voice instead, so audio cards still work.
const env = process.env;
const ELEVEN_VOICE = () => env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

// Which voice makes the audio (used to name saved files), or '' when there's no key.
export const voiceId = () => env.ELEVENLABS_API_KEY ? 'elevenlabs:' + ELEVEN_VOICE() + ':' + (env.ELEVENLABS_MODEL || 'eleven_multilingual_v2')
  : env.OPENAI_API_KEY ? 'openai:' + (env.OPENAI_VOICE || 'alloy') + ':' + (env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts') : '';

const failed = async (who, r) => new Error(who + ' couldn’t make the audio (' + r.status + (r.status === 401 ? ', check the key in .env' : '') + '): ' + (await r.text()).slice(0, 160));

// MP3 speech for `text`; `lang` is a language code like "es" or "ja-JP".
export async function speech(text, lang) {
  if (env.ELEVENLABS_API_KEY) {
    const url = (env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io') + '/v1/text-to-speech/' + encodeURIComponent(ELEVEN_VOICE()) + '?output_format=mp3_44100_128';
    const ask = code => fetch(url, {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', ...(code ? { language_code: code } : {}) })
    });
    const code = lang ? String(lang).slice(0, 2).toLowerCase() : '';
    let r = await ask(code);
    // Some models don't take a language and pick it up from the words instead.
    if (!r.ok && code && [400, 422].includes(r.status)) r = await ask('');
    if (!r.ok) throw await failed('ElevenLabs', r);
    return Buffer.from(await r.arrayBuffer());
  }
  if (env.OPENAI_API_KEY) {
    const r = await fetch((env.OPENAI_BASE_URL || 'https://api.openai.com') + '/v1/audio/speech', {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: env.OPENAI_VOICE || 'alloy', input: text, response_format: 'mp3' })
    });
    if (!r.ok) throw await failed('OpenAI', r);
    return Buffer.from(await r.arrayBuffer());
  }
  return null;
}
