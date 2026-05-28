import { ArrowLeft, Camera, CheckCheck, Lock, Mic, MoreVertical, Paperclip, Phone, Play, Send, Smile, Square, Volume2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { buildFarmChatReply, getLanguageLabel, getReplyDisplayMode, getSpeechRecognitionLang, speakChatReply } from '../services/chatIntelligence';

const brandLogo = '/brand-logo.png';
const BrowserSpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition || null : null;

const quickPrompts = [
  { label: 'Production d’œufs', wo: 'ñata nen ngeen am tey production bi baax na', fr: 'Production d’œufs', en: 'Egg production today' },
  { label: 'Alimentation', wo: 'sama ganaar yi naka laa leen wara dundale', fr: 'Alimentation', en: 'What should I feed broilers this week?' },
  { label: 'Prix du marché', wo: 'naka laay toppatoo njëgu marse bi', fr: 'Prix du marché', en: 'Market prices' },
  { label: 'Créer une alerte', wo: 'defal ma fàttaliku pour suba', fr: 'Créer une alerte', en: 'Create a reminder' },
];

const languageModes = [
  { key: 'wo', label: 'Wolof' },
  { key: 'fr', label: 'FR' },
  { key: 'en', label: 'EN' },
];

const nowTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const initialMessages = [
  {
    id: 1,
    side: 'assistant',
    time: nowTime(),
    language: 'wo',
    displayMode: 'audio_only',
    text: 'Nanga def ? Man maay sa assistant Horizon Farm. Waxal wolof, français walla anglais.',
    actionHint: 'welcome',
    audioUrl: '/audio/wolof/welcome.mp3',
  },
];

function AudioWave({ active = false }) {
  return (
    <div className="flex flex-1 items-center gap-1 opacity-70" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, index) => (
        <span key={index} className={`w-1 rounded-full ${active ? 'bg-[#075e54]' : 'bg-[#5d6d64]'}`} style={{ height: `${8 + ((index * 7) % 24)}px` }} />
      ))}
    </div>
  );
}

function MessageBubble({ message, onReplayAudio }) {
  const isUser = message.side === 'user';
  const isAudioOnly = message.displayMode === 'audio_only' || message.audio;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm ${isUser ? 'rounded-tr-md bg-[#d9fdd3] text-[#1f2c22]' : 'rounded-tl-md bg-white text-[#1f1f1f]'}`}>
        {isAudioOnly ? (
          <div className="flex min-w-[250px] items-center gap-3 py-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-emerald-100">
              <img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" />
            </div>
            <button type="button" onClick={() => onReplayAudio?.(message)} className="grid h-9 w-9 place-items-center rounded-full bg-[#075e54] text-white shadow-sm" aria-label="Lire le message vocal">
              <Play size={16} className="ml-0.5" />
            </button>
            <AudioWave active={message.side === 'assistant'} />
            <span className="text-xs font-bold text-[#66756c]">{message.duration || 'audio'}</span>
          </div>
        ) : (
          <p className="whitespace-pre-line">{message.text}</p>
        )}

        {message.transcriptionStatus ? <div className="mt-2 rounded-xl bg-white/70 px-2 py-1 text-[11px] font-bold text-[#607167]">{message.transcriptionStatus}</div> : null}
        {message.audioError ? <div className="mt-2 rounded-xl bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">{message.audioError}</div> : null}
        {message.language ? <div className="mt-2 w-fit rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#607167]">{getLanguageLabel(message.language)}{isAudioOnly ? ' • vocal' : ''}</div> : null}

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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechLanguage, setSpeechLanguage] = useState('wo');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const nextIdRef = useRef(2);

  const canSend = useMemo(() => message.trim().length > 0 && !isThinking, [message, isThinking]);

  const addMessage = (msg) => {
    setMessages((current) => [...current, { id: nextIdRef.current, time: nowTime(), ...msg }]);
    nextIdRef.current += 1;
    return nextIdRef.current - 1;
  };

  const replayAudio = async (msg) => {
    try {
      if (msg.audioUrl && msg.side === 'user') {
        await new Audio(msg.audioUrl).play();
      } else {
        await speakChatReply(msg);
      }
      setVoiceNotice('');
    } catch (error) {
      setVoiceNotice(error.message || 'Audio indisponible');
    }
  };

  const updateMessage = (messageId, patch) => {
    setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, ...patch } : item)));
  };

  const replyToText = (cleanText) => {
    setIsThinking(true);
    window.setTimeout(() => {
      const reply = buildFarmChatReply(cleanText, { userName });
      const assistantMessageId = addMessage({ side: 'assistant', text: reply.text, language: reply.language, displayMode: getReplyDisplayMode(reply), actionHint: reply.actionHint, audioUrl: reply.audioUrl });
      setIsThinking(false);

      if (voiceEnabled || reply.language === 'wo') {
        speakChatReply(reply).then(() => setVoiceNotice('')).catch((error) => {
          const audioMessage = reply.language === 'wo' ? error.message || `Audio wolof à importer : ${reply.audioUrl || '/audio/wolof/fallback.mp3'}` : error.message || 'Audio indisponible';
          updateMessage(assistantMessageId, { audioError: audioMessage });
          setVoiceNotice(audioMessage);
        });
      }
    }, 520);
  };

  const pushExchange = (rawText, options = {}) => {
    const cleanText = String(rawText || '').trim();
    if (!cleanText || isThinking) return;
    addMessage({ side: 'user', text: options.userLabel || cleanText, audio: options.fromVoice, duration: options.fromVoice ? 'vocal' : undefined });
    setMessage('');
    replyToText(cleanText);
  };

  const startSpeechRecognition = () => {
    transcriptRef.current = '';
    if (!BrowserSpeechRecognition) return;

    try {
      const recognition = new BrowserSpeechRecognition();
      recognition.lang = getSpeechRecognitionLang(speechLanguage);
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
        if (transcript) transcriptRef.current = transcript;
      };
      recognition.onerror = () => {};
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore stale speech recognition sessions
    }
  };

  const startVoiceNote = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceNotice('Note vocale non supportée par ce navigateur. Essaie Chrome ou Safari récent, avec HTTPS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      setRecordingStartedAt(Date.now());
      startSpeechRecognition();

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopSpeechRecognition();
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const durationSeconds = recordingStartedAt ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000)) : 1;
        const transcript = transcriptRef.current.trim();
        const voiceNoteId = addMessage({
          side: 'user',
          text: 'Note vocale',
          audio: true,
          audioUrl,
          duration: `0:${String(durationSeconds).padStart(2, '0')}`,
          transcriptionStatus: transcript ? 'Transcription reçue, réponse en cours…' : 'Note vocale reçue, transcription non disponible.',
        });
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingStartedAt(null);

        if (transcript) {
          updateMessage(voiceNoteId, { transcriptionStatus: 'Note vocale comprise.' });
          replyToText(transcript);
        } else {
          addMessage({ side: 'assistant', text: 'Note vocale reçue. Je peux la lire, mais la transcription automatique n’a pas encore reconnu le contenu.', language: 'fr', displayMode: 'text' });
          setVoiceNotice('Note vocale envoyée. Transcription non disponible sur ce navigateur/langue.');
        }
      };

      recorder.start();
      setIsRecording(true);
      setVoiceNotice('Enregistrement en cours… appuie encore sur le bouton rouge pour envoyer.');
    } catch (error) {
      setIsRecording(false);
      setVoiceNotice(error?.name === 'NotAllowedError' ? 'Autorise le micro pour enregistrer une note vocale.' : 'Impossible de démarrer la note vocale.');
    }
  };

  const stopVoiceNote = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    pushExchange(message);
  };

  const handleQuickPrompt = (prompt) => {
    const value = prompt[speechLanguage] || prompt.fr || prompt.label;
    pushExchange(value, { userLabel: prompt.label });
  };

  return (
    <section className="mx-auto flex h-[min(920px,100dvh)] w-full max-w-[470px] flex-col overflow-hidden rounded-[3rem] border-[10px] border-[#101010] bg-[#efe7dc] shadow-2xl ring-1 ring-black/10 md:h-[920px]">
      <div className="relative shrink-0 bg-[#075e54] px-4 pb-3 pt-5 text-white">
        <div className="absolute left-1/2 top-2 h-7 w-32 -translate-x-1/2 rounded-b-3xl rounded-t-xl bg-black" />
        <div className="mt-8 flex items-center gap-3">
          <button type="button" aria-label="Retour" className="rounded-full p-1.5 hover:bg-white/10"><ArrowLeft size={22} /></button>
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-white/20"><img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><h1 className="truncate text-[20px] font-black tracking-tight">Horizon Farm</h1><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[11px] font-black text-white">✓</span></div><p className="truncate text-sm text-white/80">Vocal • Wolof · Français · English</p></div>
          <div className="flex items-center gap-1 text-white/95"><button type="button" aria-label="Voix" onClick={() => setVoiceEnabled((value) => !value)} className="rounded-full p-2 hover:bg-white/10"><Volume2 size={21} className={voiceEnabled ? 'text-white' : 'text-white/45'} /></button><button type="button" aria-label="Appel" className="rounded-full p-2 hover:bg-white/10"><Phone size={21} /></button><button type="button" aria-label="Plus" className="rounded-full p-2 hover:bg-white/10"><MoreVertical size={21} /></button></div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#efe7dc] bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.7)_0_1px,transparent_1px),radial-gradient(circle_at_75%_35%,rgba(7,94,84,.08)_0_1px,transparent_1px)] px-4 py-4">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-[#fff4cf] px-4 py-2 text-center text-xs font-semibold text-[#5f5333] shadow-sm"><Lock size={13} /><span>Messages protégés. Session ERP : {userName || 'utilisateur connecté'}.</span></div>
        <div className="mx-auto w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#6d6256] shadow-sm">Aujourd’hui</div>
        {messages.map((item) => <MessageBubble key={item.id} message={item} onReplayAudio={replayAudio} />)}
        {isThinking ? <div className="flex justify-start"><div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm font-bold text-[#607167] shadow-sm">Horizon prépare la réponse vocale…</div></div> : null}
      </div>

      <div className="shrink-0 bg-[#efe7dc] px-3 pb-4 pt-2">
        <div className="mb-2 flex items-center justify-between gap-2"><div className="flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">{languageModes.map((mode) => <button key={mode.key} type="button" onClick={() => setSpeechLanguage(mode.key)} className={`rounded-full px-3 py-1 text-xs font-black ${speechLanguage === mode.key ? 'bg-[#075e54] text-white' : 'text-[#607167]'}`}>{mode.label}</button>)}</div><span className="text-[11px] font-semibold text-[#7b6b5c]">Micro : {isRecording ? 'enregistrement' : getLanguageLabel(speechLanguage)}</span></div>
        {voiceNotice ? <div className="mb-2 rounded-xl bg-white/80 px-3 py-2 text-[11px] font-bold text-[#607167] shadow-sm">{voiceNotice}</div> : null}
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">{quickPrompts.map((prompt) => <button key={prompt.label} type="button" onClick={() => handleQuickPrompt(prompt)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#075e54] shadow-sm ring-1 ring-black/5">{prompt.label}</button>)}</div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><Smile size={22} className="shrink-0 text-[#7d8580]" /><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={isRecording ? 'Enregistrement…' : 'Écrivez ou appuyez sur micro'} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8b948f]" /><Paperclip size={21} className="shrink-0 text-[#7d8580]" /><Camera size={21} className="shrink-0 text-[#7d8580]" /></div>
          <button type={canSend ? 'submit' : 'button'} onClick={canSend ? undefined : (isRecording ? stopVoiceNote : startVoiceNote)} className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg disabled:opacity-60 ${isRecording ? 'bg-red-500' : 'bg-[#008069]'}`} aria-label={canSend ? 'Envoyer' : isRecording ? 'Arrêter et envoyer' : 'Enregistrer une note vocale'} disabled={isThinking}>{canSend ? <Send size={20} /> : isRecording ? <Square size={20} /> : <Mic size={24} />}</button>
        </form>
      </div>
    </section>
  );
}

export default function ChatPage() {
  const { user, profile, loading, signOut } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'Horizon user';

  if (loading) {
    return <div className="grid min-h-dvh place-items-center bg-white text-[#075e54]"><div className="text-center"><div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-[#075e54]" /><p className="text-sm font-black">Chargement de la conversation...</p></div></div>;
  }

  return (
    <main className="min-h-dvh bg-white px-0 py-0 md:grid md:place-items-center md:px-6 md:py-6">
      <div className="absolute right-4 top-4 z-10 hidden gap-2 md:flex"><span className="rounded-full bg-[#f2f7f4] px-4 py-2 text-xs font-bold text-[#075e54] ring-1 ring-[#d8e7df]">Connecté : {displayName}</span><button type="button" onClick={signOut} className="rounded-full bg-[#075e54] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#064f47]">Déconnexion</button></div>
      <ChatPhone userName={displayName} />
    </main>
  );
}
