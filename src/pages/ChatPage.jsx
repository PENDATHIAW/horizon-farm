import { CheckCheck, LogOut, Mic, Paperclip, Phone, Play, Send, Smile, Square, Volume2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLanguageLabel, speakChatReply } from '../services/chatIntelligence';
import { askErpFromChat } from '../services/erpChatBridge';
import { transcribeVoiceNote } from '../services/voiceTranscription';

const brandLogo = '/brand-logo.png';

const quickPrompts = [
  { label: 'Équipements', fr: 'Quels équipements demandent une attention ?', en: 'Which equipment needs attention?', wo: 'Ban jumtukaay lañu wara seet ?' },
  { label: 'Tâches', fr: 'Quelles tâches sont en retard ?', en: 'Which tasks are late?', wo: 'Yan liggéey yi lañu yeex ?' },
  { label: 'Clients', fr: 'Quels clients ont un suivi à faire ?', en: 'Which clients need follow-up?', wo: 'Yan client lañu wara toppatoo ?' },
  { label: 'Alertes', fr: 'Montre-moi les alertes importantes', en: 'Show me important alerts', wo: 'Won ma alert yi am solo' },
];

const audioByAction = {
  fallback: '/audio/wolof/fallback.mp3',
  egg_tracking: '/audio/wolof/egg-tracking.mp3',
  feeding_advice: '/audio/wolof/feeding-advice.mp3',
  market_prices: '/audio/wolof/market-price.mp3',
  create_alert: '/audio/wolof/create-alert.mp3',
};

const fallbackReplies = {
  fr: 'Je suis prêt. Pose-moi une question sur n’importe quelle partie de l’ERP Horizon Farm : animaux, ventes, finances, équipements, tâches, alertes, cultures, documents ou stocks.',
  en: 'I’m ready. Ask me about any Horizon Farm ERP area: animals, sales, finance, equipment, tasks, alerts, crops, documents, or stock.',
  wo: 'Maangi fii. Mën nga laaj lu jëm ci ERP Horizon Farm: jur, jaay, xaalis, jumtukaay, liggéey, alert, tool yi, document walla stock.',
};

const nowTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function buildFallbackReply(language = 'fr', shouldSpeak = false) {
  return {
    side: 'assistant',
    language,
    text: fallbackReplies[language] || fallbackReplies.fr,
    displayMode: shouldSpeak && language === 'wo' ? 'audio_only' : 'text',
    audioUrl: shouldSpeak && language === 'wo' ? audioByAction.fallback : undefined,
  };
}

function AudioWave({ active = false }) {
  return (
    <div className="flex flex-1 items-center gap-1 opacity-70" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, index) => (
        <span key={index} className={`w-1 rounded-full ${active ? 'bg-leaf' : 'bg-slate'}`} style={{ height: `${9 + ((index * 5) % 24)}px` }} />
      ))}
    </div>
  );
}

function MessageBubble({ message, onReplayAudio }) {
  const isUser = message.side === 'user';
  const isAudio = message.displayMode === 'audio_only' || message.audio;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-2 text-body leading-relaxed shadow-card ${isUser ? 'rounded-tr-md bg-positive-bg text-ink' : 'rounded-tl-md bg-white text-ink'}`}>
        {isAudio ? (
          <div className="flex min-w-[230px] items-center gap-3 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-positive">
              <img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" />
            </div>
            <button type="button" onClick={() => onReplayAudio?.(message)} className="grid h-9 w-9 place-items-center rounded-full bg-leaf text-white shadow-card" aria-label="Lire l’audio">
              <Play size={16} className="ml-1" />
            </button>
            <AudioWave active={!isUser} />
            <span className="text-xs font-semibold text-slate">{message.duration || 'audio'}</span>
          </div>
        ) : (
          <p className="whitespace-pre-line">{message.text}</p>
        )}
        {message.transcript ? <div className="mt-2 rounded-xl bg-positive-bg px-2 py-1 text-meta font-semibold text-leaf">Transcrit : {message.transcript}</div> : null}
        {message.status ? <div className="mt-2 rounded-xl bg-white/70 px-2 py-1 text-meta font-semibold text-slate">{message.status}</div> : null}
        {message.erp ? <div className="mt-2 rounded-xl bg-positive-bg px-2 py-1 text-meta font-semibold text-leaf">ERP • {message.erp.module || message.erp.table}</div> : null}
        {message.language ? <div className="mt-2 w-fit rounded-full bg-earth/30 px-2 py-1 text-meta font-semibold uppercase tracking-normal text-slate">{getLanguageLabel(message.language)}{isAudio ? ' • vocal' : ''}</div> : null}
        <div className={`mt-1 flex items-center justify-end gap-1 text-meta ${isUser ? 'text-slate' : 'text-slate'}`}>
          <span>{message.time}</span>
          {isUser ? <CheckCheck size={15} className="text-positive" /> : null}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState('fr');
  const [messages, setMessages] = useState(() => [{ id: 1, side: 'assistant', time: nowTime(), language: 'fr', text: 'Bienvenue sur Horizon Chat. Pose une question sur l’ERP ou envoie une note vocale.' }]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [notice, setNotice] = useState('');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startRef = useRef(0);
  const nextIdRef = useRef(2);

  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'Horizon user';
  const role = profile?.role || user?.user_metadata?.role || 'visiteur';
  const canSend = useMemo(() => message.trim().length > 0 && !isThinking && !isRecording, [message, isThinking, isRecording]);

  const addMessage = (data) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setMessages((current) => [...current, { id, time: nowTime(), ...data }]);
    return id;
  };

  const updateMessage = (id, patch) => setMessages((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const playAudioUrl = async (url) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    await audio.play();
  };

  const replayAudio = async (msg) => {
    try {
      if (msg.audioUrl) await playAudioUrl(msg.audioUrl);
      else await speakChatReply(msg);
      setNotice('');
    } catch (error) {
      setNotice(error.message || 'Audio indisponible.');
    }
  };

  const answer = async ({ text, fromAudio = false }) => {
    let reply;
    try {
      reply = await askErpFromChat({ text, language, role });
    } catch (error) {
      reply = { side: 'assistant', language, text: error.message || 'Lecture ERP indisponible pour le moment.', displayMode: 'text', status: 'ERP indisponible' };
    }

    if (!reply) reply = buildFallbackReply(language, fromAudio && voiceEnabled);
    if (fromAudio && voiceEnabled && language === 'wo' && !reply.audioUrl) {
      reply = { ...reply, displayMode: 'audio_only', audioUrl: audioByAction.fallback };
    }

    const replyId = addMessage(reply);
    if (fromAudio && voiceEnabled) {
      try {
        if (reply.audioUrl) await playAudioUrl(reply.audioUrl);
        else await speakChatReply(reply);
      } catch (error) {
        updateMessage(replyId, { status: error.message || 'Réponse vocale indisponible.' });
      }
    }
  };

  const sendText = (rawText = message) => {
    const cleanText = String(rawText || '').trim();
    if (!cleanText || isThinking) return;
    addMessage({ side: 'user', text: cleanText });
    setMessage('');
    setIsThinking(true);
    window.setTimeout(async () => {
      await answer({ text: cleanText, fromAudio: false });
      setIsThinking(false);
    }, 300);
  };

  const startVoiceNote = async (clickEvent) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('Note vocale non supportée par ce navigateur.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;
      startRef.current = clickEvent?.timeStamp || 0;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async (stopEvent) => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) {
          setNotice('Aucun son enregistré. Réessaie en autorisant le micro.');
          return;
        }
        const audioUrl = URL.createObjectURL(blob);
        const duration = Math.max(1, Math.round(((stopEvent?.timeStamp || startRef.current) - startRef.current) / 1000));
        const userVoiceId = addMessage({ side: 'user', text: 'Note vocale', audio: true, audioUrl, duration: `0:${String(duration).padStart(2, '0')}`, status: 'Transcription en cours…' });
        try {
          const transcript = await transcribeVoiceNote(blob, language);
          updateMessage(userVoiceId, { status: 'Note vocale comprise.', transcript });
          setIsThinking(true);
          await answer({ text: transcript || 'note vocale', fromAudio: true });
          setIsThinking(false);
        } catch (error) {
          updateMessage(userVoiceId, { status: error.message || 'Transcription indisponible.' });
          setNotice(error.message || 'Transcription indisponible.');
        }
      };
      recorder.start(500);
      setIsRecording(true);
      setNotice('Enregistrement en cours… appuie sur le bouton rouge pour envoyer.');
    } catch (error) {
      setNotice(error?.name === 'NotAllowedError' ? 'Autorise le micro pour enregistrer.' : 'Impossible de démarrer le micro.');
    }
  };

  const stopVoiceNote = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.requestData?.();
      window.setTimeout(() => recorder.stop(), 120);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.assign('/chat');
    } catch (error) {
      setNotice(error.message || 'Déconnexion impossible.');
    }
  };

  if (loading) {
    return <main className="grid min-h-dvh place-items-center bg-white text-leaf"><p className="text-sm font-semibold">Chargement Horizon Chat…</p></main>;
  }

  return (
    <main className="min-h-dvh bg-white md:grid md:place-items-center md:px-4 md:py-4">
      <section className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-mist shadow-float md:h-[880px] md:rounded-card md:border md:border-line">
        <header className="shrink-0 bg-leaf px-4 pb-3 pt-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white"><img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" /></div>
            <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-semibold">Horizon Farm</h1><p className="truncate text-sm text-white/80">{displayName} • {role}</p></div>
            <button type="button" onClick={() => setVoiceEnabled((v) => !v)} className="rounded-full p-2 hover:bg-white/10" aria-label="Activer/désactiver la voix"><Volume2 size={21} className={voiceEnabled ? 'text-white' : 'text-white/40'} /></button>
            <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Appel"><Phone size={21} /></button>
            <button type="button" onClick={handleSignOut} className="rounded-full p-2 hover:bg-white/10" aria-label="Déconnexion"><LogOut size={21} /></button>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-mist px-4 py-4">
          <div className="mx-auto w-fit rounded-xl bg-vigilance-bg px-4 py-2 text-center text-xs font-semibold text-slate shadow-card">Messages protégés • données ERP selon votre rôle</div>
          {messages.map((item) => <MessageBubble key={item.id} message={item} onReplayAudio={replayAudio} />)}
          {isThinking ? <div className="w-fit rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate shadow-card">Horizon consulte l’ERP…</div> : null}
        </div>

        <footer className="shrink-0 bg-mist px-3 pb-4 pt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-line">
              {[['wo', 'Wolof'], ['fr', 'FR'], ['en', 'EN']].map(([key, label]) => <button key={key} type="button" onClick={() => setLanguage(key)} className={`rounded-full px-3 py-1 text-xs font-semibold ${language === key ? 'bg-leaf text-white' : 'text-slate'}`}>{label}</button>)}
            </div>
            <span className="text-meta font-semibold text-slate">Réponse : {isRecording ? 'enregistrement' : getLanguageLabel(language)}</span>
          </div>
          {notice ? <div className="mb-2 rounded-xl bg-white/80 px-3 py-2 text-meta font-semibold text-slate shadow-card">{notice}</div> : null}
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">{quickPrompts.map((prompt) => <button key={prompt.label} type="button" onClick={() => sendText(prompt[language] || prompt.label)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-leaf shadow-card ring-1 ring-line">{prompt.label}</button>)}</div>
          <form onSubmit={(event) => { event.preventDefault(); sendText(); }} className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-card"><Smile size={22} className="text-slate" /><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={isRecording ? 'Enregistrement…' : 'Demande quelque chose à l’ERP'} className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-slate" /><Paperclip size={21} className="text-slate" /></div>
            <button type={canSend ? 'submit' : 'button'} onClick={canSend ? undefined : (isRecording ? stopVoiceNote : startVoiceNote)} className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-float ${isRecording ? 'bg-urgent' : 'bg-positive'}`} disabled={isThinking} aria-label={canSend ? 'Envoyer' : isRecording ? 'Arrêter' : 'Enregistrer'}>{canSend ? <Send size={20} /> : isRecording ? <Square size={20} /> : <Mic size={24} />}</button>
          </form>
        </footer>
      </section>
    </main>
  );
}
