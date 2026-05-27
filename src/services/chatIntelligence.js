const WOLOF_MARKERS = [
  'nanga', 'def', 'jërëjëf', 'jerejef', 'na nga', 'ndax', 'lan', 'ana', 'fan', 'lu', 'dama', 'maa ngi', 'mangi', 'sama', 'sa', 'ñu', 'ngu', 'dafay', 'laaj', 'mbay', 'jur', 'ganaar', 'nen', 'ndimbal', 'waaw', 'déedéet', 'deedeet', 'baax', 'xam', 'yoon', 'leegi', 'léegi', 'tay', 'suba', 'ngir', 'ak', 'ci', 'bi', 'yi'
];

const ENGLISH_MARKERS = [
  'what', 'how', 'when', 'why', 'which', 'recommend', 'feeding', 'broilers', 'layers', 'eggs', 'market', 'today', 'week', 'please', 'reminder', 'price', 'stock', 'farm'
];

const FRENCH_MARKERS = [
  'bonjour', 'salut', 'combien', 'pourquoi', 'comment', 'quand', 'œufs', 'oeufs', 'poules', 'aliment', 'alimentation', 'prix', 'marché', 'marche', 'alerte', 'rappel', 'stock', 'ferme', 'aujourd', 'semaine'
];

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

export function shouldSpeakLanguage(language) {
  // Avoid reading Wolof with a French browser voice. A dedicated Wolof TTS can replace this later.
  return language !== 'wo';
}

export function buildFarmChatReply(input = '', context = {}) {
  const language = detectChatLanguage(input);
  const text = normalize(input);
  const userName = context?.userName || 'vous';

  const hasEggs = ['oeuf', 'oeufs', 'egg', 'eggs', 'nen'].some((word) => text.includes(word));
  const hasFeed = ['aliment', 'alimentation', 'feeding', 'feed', 'broiler', 'pondeuse', 'ganaar'].some((word) => text.includes(word));
  const hasPrice = ['prix', 'price', 'marche', 'market'].some((word) => text.includes(word));
  const hasAlert = ['alerte', 'alert', 'rappel', 'reminder'].some((word) => text.includes(word));

  if (language === 'wo') {
    if (hasEggs) {
      return {
        language,
        text: '🥚 Waaw, man naa la dimbali ci toppatoo nen yi. Bindal ma limu nen yi tey, ma wax la ndax production bi baax na walla dafa wàññi.',
        actionHint: 'egg_tracking',
      };
    }
    if (hasFeed) {
      return {
        language,
        text: '🌾 Ci mbayum ganaar, ñam wu sell ak ndox mu set dañuy am solo. Wax ma ayu-bis bi ak atum ganaar yi, ma jox la ndigal bu gën a leer.',
        actionHint: 'feeding_advice',
      };
    }
    return {
      language,
      text: `Jërëjëf ${userName}. Maangi fii ngir la dimbali ci ferme bi. Mën nga wax ci wolof, français walla anglais. Lan nga bëgg ma toppatoo ?`,
      actionHint: 'general_help',
    };
  }

  if (language === 'en') {
    if (hasFeed) {
      return {
        language,
        text: '🌿 For broilers this week: keep clean water available, feed at fixed times, monitor heat stress, and record daily consumption. I can turn this into a daily reminder when actions are connected.',
        actionHint: 'feeding_advice',
      };
    }
    if (hasPrice) {
      return {
        language,
        text: '📈 I can help track market prices. Next step: connect the chat to your ERP price/stock tables so I can answer with your real data instead of a generic estimate.',
        actionHint: 'market_prices',
      };
    }
    return {
      language,
      text: 'I’m ready. You can ask me about eggs, feed, stock, alerts, farm tasks, or market prices. I will keep the answer in the same language as your message.',
      actionHint: 'general_help',
    };
  }

  if (hasEggs) {
    return {
      language,
      text: '🥚 Je peux suivre la production d’œufs. Pour l’instant, donne-moi le nombre du jour et je te réponds avec une analyse simple. Prochaine étape : connexion aux vraies données ERP.',
      actionHint: 'egg_tracking',
    };
  }

  if (hasFeed) {
    return {
      language,
      text: '🌾 Pour l’alimentation : vérifie l’eau propre, la régularité des horaires, la température et la consommation par lot. Donne-moi l’âge du lot et je te propose un plan plus précis.',
      actionHint: 'feeding_advice',
    };
  }

  if (hasAlert) {
    return {
      language,
      text: '✅ Je peux préparer une alerte. Dis-moi le sujet, l’heure et la fréquence. Exemple : “Rappelle-moi de nourrir les poules chaque jour à 8h”.',
      actionHint: 'create_alert',
    };
  }

  return {
    language,
    text: 'Je suis prêt. Tu peux me parler en wolof, français ou anglais, à propos des œufs, de l’alimentation, des stocks, des alertes, des tâches ou des prix du marché.',
    actionHint: 'general_help',
  };
}

export function speakChatReply(reply) {
  if (typeof window === 'undefined' || !reply?.text || !('speechSynthesis' in window)) return false;
  if (!shouldSpeakLanguage(reply.language)) return false;

  const utterance = new SpeechSynthesisUtterance(reply.text.replace(/[🥚🌿🌾📈✅]/g, '').trim());
  utterance.lang = reply.language === 'en' ? 'en-US' : 'fr-FR';
  utterance.rate = 0.98;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
