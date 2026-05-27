const WOLOF_MARKERS = [
  'nanga', 'def', 'jërëjëf', 'jerejef', 'na nga', 'ndax', 'lan', 'ana', 'fan', 'lu', 'dama', 'maa ngi', 'mangi', 'sama', 'sa', 'ñu', 'ngu', 'dafay', 'laaj', 'mbay', 'jur', 'ganaar', 'nen', 'ndimbal', 'waaw', 'déedéet', 'deedeet', 'baax', 'xam', 'yoon', 'leegi', 'léegi', 'tay', 'suba', 'ngir', 'ak', 'ci', 'bi', 'yi'
];

const ENGLISH_MARKERS = [
  'what', 'how', 'when', 'why', 'which', 'recommend', 'feeding', 'broilers', 'layers', 'eggs', 'market', 'today', 'week', 'please', 'reminder', 'price', 'stock', 'farm'
];

const FRENCH_MARKERS = [
  'bonjour', 'salut', 'combien', 'pourquoi', 'comment', 'quand', 'œufs', 'oeufs', 'poules', 'aliment', 'alimentation', 'prix', 'marché', 'marche', 'alerte', 'rappel', 'stock', 'ferme', 'aujourd', 'semaine'
];

const WOLOF_AUDIO_BY_ACTION = {
  welcome: '/audio/wolof/welcome.mp3',
  egg_tracking: '/audio/wolof/egg-tracking.mp3',
  feeding_advice: '/audio/wolof/feeding-advice.mp3',
  market_prices: '/audio/wolof/market-price.mp3',
  create_alert: '/audio/wolof/create-alert.mp3',
  general_help: '/audio/wolof/fallback.mp3',
  fallback: '/audio/wolof/fallback.mp3',
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreMarkers = (text, markers) => markers.reduce((score, marker) => (text.includes(normalize(marker)) ? score + 1 : score), 0);

export function detectChatLanguage(input = '') {
  const text = normalize(input);
  if (!text) return 'fr';

  const scores = {
    wo: scoreMarkers(text, WOLOF_MARKERS),
    en: scoreMarkers(text, ENGLISH_MARKERS),
    fr: scoreMarkers(text, FRENCH_MARKERS),
  };

  if (scores.wo >= Math.max(scores.fr, scores.en) && scores.wo > 0) return 'wo';
  if (scores.en > scores.fr && scores.en > 0) return 'en';
  return 'fr';
}

export function getLanguageLabel(language) {
  return {
    wo: 'Wolof',
    fr: 'Français',
    en: 'English',
  }[language] || 'Français';
}

export function getSpeechRecognitionLang(language = 'fr') {
  return {
    wo: 'wo-SN',
    fr: 'fr-FR',
    en: 'en-US',
  }[language] || 'fr-FR';
}

export function getSpeechSynthesisLang(language = 'fr') {
  return {
    wo: 'wo-SN',
    fr: 'fr-FR',
    en: 'en-US',
  }[language] || 'fr-FR';
}

export function getReplyDisplayMode(reply = {}) {
  return reply.language === 'wo' ? 'audio_only' : 'text';
}

export function getWolofAudioUrl(actionHint = 'fallback') {
  return WOLOF_AUDIO_BY_ACTION[actionHint] || WOLOF_AUDIO_BY_ACTION.fallback;
}

const withWolofAudio = (reply) => ({
  ...reply,
  displayMode: 'audio_only',
  audioUrl: getWolofAudioUrl(reply.actionHint),
});

export function buildFarmChatReply(input = '', context = {}) {
  const language = detectChatLanguage(input);
  const text = normalize(input);
  const userName = context?.userName || 'vous';

  const hasEggs = ['oeuf', 'oeufs', 'egg', 'eggs', 'nen'].some((word) => text.includes(word));
  const hasFeed = ['aliment', 'alimentation', 'feeding', 'feed', 'broiler', 'pondeuse', 'ganaar'].some((word) => text.includes(word));
  const hasPrice = ['prix', 'price', 'marche', 'market'].some((word) => text.includes(word));
  const hasAlert = ['alerte', 'alert', 'rappel', 'reminder', 'fattali'].some((word) => text.includes(word));

  if (language === 'wo') {
    if (hasEggs) {
      return withWolofAudio({
        language,
        text: 'Waaw, man naa la dimbali ci toppatoo nen yi. Wax ma limu nen yi tey, ma wax la ndax production bi baax na walla dafa wàññi.',
        actionHint: 'egg_tracking',
      });
    }
    if (hasFeed) {
      return withWolofAudio({
        language,
        text: 'Ci mbayum ganaar, ñam wu sell ak ndox mu set dañuy am solo. Wax ma ayu-bis bi ak atum ganaar yi, ma jox la ndigal bu gën a leer.',
        actionHint: 'feeding_advice',
      });
    }
    if (hasPrice) {
      return withWolofAudio({
        language,
        text: 'Man naa la dimbali ci toppatoo njëgu marse bi. Boo ma joxee produit bi ak marse bi, dinaa la jox tontu bu leer.',
        actionHint: 'market_prices',
      });
    }
    if (hasAlert) {
      return withWolofAudio({
        language,
        text: 'Waaw, man naa defal la fàttali. Wax ma lu ma wara fàttali, waxtu wi, ak ñaata yoon.',
        actionHint: 'create_alert',
      });
    }
    return withWolofAudio({
      language,
      text: `Jërëjëf ${userName}. Maangi fii ngir la dimbali ci ferme bi. Mën nga wax ci wolof, français walla anglais. Lan nga bëgg ma toppatoo ?`,
      actionHint: 'general_help',
    });
  }

  if (language === 'en') {
    if (hasFeed) {
      return {
        language,
        displayMode: 'text',
        text: '🌿 For broilers this week: keep clean water available, feed at fixed times, monitor heat stress, and record daily consumption. I can turn this into a daily reminder when actions are connected.',
        actionHint: 'feeding_advice',
      };
    }
    if (hasPrice) {
      return {
        language,
        displayMode: 'text',
        text: '📈 I can help track market prices. Next step: connect the chat to your ERP price/stock tables so I can answer with your real data instead of a generic estimate.',
        actionHint: 'market_prices',
      };
    }
    return {
      language,
      displayMode: 'text',
      text: 'I’m ready. You can ask me about eggs, feed, stock, alerts, farm tasks, or market prices. I will keep the answer in the same language as your message.',
      actionHint: 'general_help',
    };
  }

  if (hasEggs) {
    return {
      language,
      displayMode: 'text',
      text: '🥚 Je peux suivre la production d’œufs. Pour l’instant, donne-moi le nombre du jour et je te réponds avec une analyse simple. Prochaine étape : connexion aux vraies données ERP.',
      actionHint: 'egg_tracking',
    };
  }

  if (hasFeed) {
    return {
      language,
      displayMode: 'text',
      text: '🌾 Pour l’alimentation : vérifie l’eau propre, la régularité des horaires, la température et la consommation par lot. Donne-moi l’âge du lot et je te propose un plan plus précis.',
      actionHint: 'feeding_advice',
    };
  }

  if (hasAlert) {
    return {
      language,
      displayMode: 'text',
      text: '✅ Je peux préparer une alerte. Dis-moi le sujet, l’heure et la fréquence. Exemple : “Rappelle-moi de nourrir les poules chaque jour à 8h”.',
      actionHint: 'create_alert',
    };
  }

  return {
    language,
    displayMode: 'text',
    text: 'Je suis prêt. Tu peux me parler en wolof, français ou anglais, à propos des œufs, de l’alimentation, des stocks, des alertes, des tâches ou des prix du marché.',
    actionHint: 'general_help',
  };
}

async function playStaticAudio(audioUrl) {
  if (!audioUrl) return false;
  const audio = new Audio(audioUrl);
  await audio.play();
  return true;
}

export async function playWolofAudio(reply) {
  if (reply?.audioUrl) {
    try {
      await playStaticAudio(reply.audioUrl);
      return true;
    } catch {
      // Continue to dynamic TTS if the prerecorded file is not present yet.
    }
  }

  const endpoint = import.meta.env?.VITE_WOLOF_TTS_ENDPOINT || '';
  const apiKey = import.meta.env?.VITE_WOLOF_TTS_API_KEY || '';

  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ text: reply.text, lang: 'wo-SN', voice: 'wolof', actionHint: reply.actionHint }),
    });

    if (!response.ok) throw new Error('Service audio wolof indisponible');

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
    return true;
  }

  throw new Error(`Audio wolof manquant : ajoute le fichier ${reply?.audioUrl || getWolofAudioUrl(reply?.actionHint)}.`);
}

export async function speakChatReply(reply) {
  if (!reply?.text) return false;

  if (reply.language === 'wo') {
    return playWolofAudio(reply);
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

  const utterance = new SpeechSynthesisUtterance(reply.text.replace(/[🥚🌿🌾📈✅]/g, '').trim());
  utterance.lang = getSpeechSynthesisLang(reply.language);
  utterance.rate = 0.98;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
