import { ArrowLeft, Camera, CheckCheck, Lock, Mic, MoreVertical, Paperclip, Phone, Send, Smile, Video } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { buildFarmChatReply, getLanguageLabel, shouldSpeakLanguage, speakChatReply } from '../services/chatIntelligence';

const brandLogo = '/brand-logo.png';

const quickPrompts = [
  'Production d’œufs',
  'Alimentation',
  'Prix du marché',
  'Créer une alerte',
  'Nanga def, sama ganaar yi naka laa leen wara dundale ?',
  'What should I feed broilers this week?',
];

const nowTime = () =>
  new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

const initialMessages = [
  {
    id: 1,
    side: 'assistant',
    time: nowTime(),
    language: 'wo',
    text: '👋 Nanga def ? Je suis ton assistant Horizon Farm. Tu peux me parler en wolof, français ou anglais. Pour le wolof, je réponds à l’écrit sans voix française afin d’éviter une mauvaise prononciation.',
  },
];

function MessageBubble({ message }) {
  const isUser = message.side === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-tr-md bg-[#d9fdd3] text-[#1f2c22]'
            : 'rounded-tl-md bg-white text-[#1f1f1f]'
        }`}
      >
        {message.audio ? (
          <div className="flex min-w-[260px] items-center gap-3 py-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-emerald-100">
              <img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" />
            </div>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-[#607167]" aria-label="Lire l’audio">
              <span className="ml-0.5 h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-current" />
            </button>
            <div className="flex flex-1 items-center gap-1 opacity-60" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, index) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="w-1 rounded-full bg-[#5d6d64]"
                  style={{ height: `${8 + ((index * 7) % 24)}px` }}
                />
              ))}
            </div>
            <span className="text-xs text-[#66756c]">{message.duration}</span>
          </div>
        ) : (
          <p className="whitespace-pre-line">{message.text}</p>
        )}

        {message.language ? (
          <div className="mt-2 w-fit rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#607167]">
            {getLanguageLabel(message.language)}
            {!isUser && !shouldSpeakLanguage(message.language) ? ' • texte uniquement' : ''}
          </div>
        ) : null}

        <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${isUser ? 'text-[#5d7364]' : 'text-[#8a8a8a]'}`}>
          <span>{message.time}</span>
          {isUser ? <CheckCheck size={15} className="text-[#4fc3f7]" /> : null}
        </div>
      </div>
    </div>
  );
}

function ChatPhone({ userName }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(() => initialMessages);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const nextIdRef = useRef(2);

  const canSend = useMemo(() => message.trim().length > 0 && !isThinking, [message, isThinking]);

  const pushExchange = (rawText) => {
    const cleanText = String(rawText || '').trim();
    if (!cleanText || isThinking) return;

    const userMessage = {
      id: nextIdRef.current,
      side: 'user',
      time: nowTime(),
      text: cleanText,
    };
    nextIdRef.current += 1;

    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setIsThinking(true);

    window.setTimeout(() => {
      const reply = buildFarmChatReply(cleanText, { userName });
      const assistantMessage = {
        id: nextIdRef.current,
        side: 'assistant',
        time: nowTime(),
        text: reply.text,
        language: reply.language,
        actionHint: reply.actionHint,
      };
      nextIdRef.current += 1;
      setMessages((current) => [...current, assistantMessage]);
      setIsThinking(false);

      if (voiceEnabled) speakChatReply(reply);
    }, 520);
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    pushExchange(message);
  };

  return (
    <section className="mx-auto flex h-[min(920px,100dvh)] w-full max-w-[470px] flex-col overflow-hidden rounded-[3rem] border-[10px] border-[#101010] bg-[#efe7dc] shadow-2xl ring-1 ring-black/10 md:h-[920px]">
      <div className="relative shrink-0 bg-[#075e54] px-4 pb-3 pt-5 text-white">
        <div className="absolute left-1/2 top-2 h-7 w-32 -translate-x-1/2 rounded-b-3xl rounded-t-xl bg-black" />
        <div className="mt-8 flex items-center gap-3">
          <button type="button" aria-label="Retour" className="rounded-full p-1.5 hover:bg-white/10">
            <ArrowLeft size={22} />
          </button>

          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-white/20">
            <img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[20px] font-black tracking-tight">Horizon Farm</h1>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[11px] font-black text-white">✓</span>
            </div>
            <p className="truncate text-sm text-white/80">En ligne • Wolof · Français · English</p>
          </div>

          <div className="flex items-center gap-1 text-white/95">
            <button type="button" aria-label="Appel vidéo" className="rounded-full p-2 hover:bg-white/10">
              <Video size={21} />
            </button>
            <button type="button" aria-label="Appel" className="rounded-full p-2 hover:bg-white/10">
              <Phone size={21} />
            </button>
            <button type="button" aria-label="Plus" className="rounded-full p-2 hover:bg-white/10">
              <MoreVertical size={21} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#efe7dc] bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.7)_0_1px,transparent_1px),radial-gradient(circle_at_75%_35%,rgba(7,94,84,.08)_0_1px,transparent_1px)] px-4 py-4">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-[#fff4cf] px-4 py-2 text-center text-xs font-semibold text-[#5f5333] shadow-sm">
          <Lock size={13} />
          <span>Messages protégés. Session ERP : {userName || 'utilisateur connecté'}.</span>
        </div>

        <div className="mx-auto w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#6d6256] shadow-sm">Aujourd’hui</div>

        {messages.map((item) => <MessageBubble key={item.id} message={item} />)}

        {isThinking ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm font-bold text-[#607167] shadow-sm">
              Horizon réfléchit…
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 bg-[#efe7dc] px-3 pb-4 pt-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setVoiceEnabled((value) => !value)}
            className={`rounded-full px-3 py-1.5 text-xs font-black shadow-sm ring-1 ring-black/5 ${
              voiceEnabled ? 'bg-[#d9fdd3] text-[#075e54]' : 'bg-white text-[#607167]'
            }`}
          >
            Voix FR/EN {voiceEnabled ? 'ON' : 'OFF'}
          </button>
          <span className="text-[11px] font-semibold text-[#7b6b5c]">Wolof : réponse écrite seulement</span>
        </div>

        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => pushExchange(prompt)}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#075e54] shadow-sm ring-1 ring-black/5"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
            <Smile size={22} className="shrink-0 text-[#7d8580]" />
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Écrivez un message"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8b948f]"
            />
            <Paperclip size={21} className="shrink-0 text-[#7d8580]" />
            <Camera size={21} className="shrink-0 text-[#7d8580]" />
          </div>
          <button
            type={canSend ? 'submit' : 'button'}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#008069] text-white shadow-lg disabled:opacity-60"
            aria-label={canSend ? 'Envoyer' : 'Parler'}
            disabled={isThinking}
          >
            {canSend ? <Send size={20} /> : <Mic size={24} />}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function ChatPage() {
  const { user, profile, loading, signOut } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'Horizon user';

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white text-[#075e54]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-[#075e54]" />
          <p className="text-sm font-black">Chargement de la conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-white px-0 py-0 md:grid md:place-items-center md:px-6 md:py-6">
      <div className="absolute right-4 top-4 z-10 hidden gap-2 md:flex">
        <span className="rounded-full bg-[#f2f7f4] px-4 py-2 text-xs font-bold text-[#075e54] ring-1 ring-[#d8e7df]">
          Connecté : {displayName}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full bg-[#075e54] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#064f47]"
        >
          Déconnexion
        </button>
      </div>
      <ChatPhone userName={displayName} />
    </main>
  );
}
