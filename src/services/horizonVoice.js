const wolofHints = ['naka', 'ndax', 'dafa', 'am na', 'des na', 'xaalis', 'bor', 'doy', 'waaw', 'déedéet', 'deedeet', 'bi ', ' yi', 'nen'];
const englishHints = ['how ', 'what ', 'which ', 'show ', 'today', 'stock', 'sales', 'customer', 'money', 'paid', 'unpaid', 'humidity', 'temperature'];

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

export function speakHorizonText(text, preferredLang) {
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

export function stopHorizonVoice() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}
