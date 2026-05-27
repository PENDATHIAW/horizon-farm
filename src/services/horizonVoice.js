const wolofHints = ['naka', 'ndax', 'dafa', 'am na', 'des na', 'xaalis', 'bor', 'doy', 'waaw', 'déedéet', 'deedeet', 'jamm', 'kan', 'ku ', 'moo', 'looy', 'bi ', ' yi', 'nen'];
const englishHints = ['how ', 'what ', 'which ', 'show ', 'today', 'stock', 'sales', 'customer', 'money', 'paid', 'unpaid', 'humidity', 'temperature'];
let currentAudio = null;

function normalized(text = '') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function detectVoiceLanguage(text = '') {
  const clean = normalized(text);
  if (wolofHints.some((word) => clean.includes(normalized(word)))) return 'wo-SN';
  if (englishHints.some((word) => clean.includes(word))) return 'en-US';
  return 'fr-FR';
}

function pickVoice(lang) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices.length) return null;
  const exact = voices.find((voice) => normalized(voice.lang) === normalized(lang));
  if (exact) return exact;
  if (lang === 'wo-SN') return voices.find((voice) => normalized(voice.lang).startsWith('fr')) || voices.find((voice) => normalized(voice.lang).startsWith('en')) || null;
  return voices.find((voice) => normalized(voice.lang).startsWith(normalized(lang).slice(0, 2))) || null;
}

function speakWithBrowser(text, preferredLang) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return false;
  const lang = preferredLang || detectVoiceLanguage(text);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').trim());
  utterance.lang = lang;
  utterance.rate = lang === 'wo-SN' ? 0.92 : 0.96;
  utterance.pitch = 1;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

async function speakWithAiVoice(text, preferredLang) {
  if (typeof window === 'undefined' || !text) return false;
  const response = await fetch('/api/horizon-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language: preferredLang || detectVoiceLanguage(text) }),
  });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.includes('audio')) return false;
  const blob = await response.blob();
  if (!blob.size) return false;
  stopHorizonVoice();
  const url = URL.createObjectURL(blob);
  currentAudio = new Audio(url);
  currentAudio.onended = () => URL.revokeObjectURL(url);
  currentAudio.onerror = () => URL.revokeObjectURL(url);
  await currentAudio.play();
  return true;
}

export async function speakHorizonText(text, preferredLang) {
  try {
    const ok = await speakWithAiVoice(text, preferredLang);
    if (ok) return true;
  } catch {
    // fallback below
  }
  return speakWithBrowser(text, preferredLang);
}

export function stopHorizonVoice() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}
