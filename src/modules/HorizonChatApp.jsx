import { BarChart3, Camera, ChevronDown, Globe2, Mic, SendHorizontal, Sparkles, ThermometerSun, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import useHorizonChat from '../hooks/useHorizonChat';

const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
const number = (value) => Number(value || 0).toLocaleString('fr-FR');
const time = (value) => new Date(value || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const starterPrompts = [
  'Naka stock aliment bi ?',
  'Ku ma war xaalis ?',
  'Kaan moo feebar ?',
  'Humidité ak température bi naka ?',
  'How much cash today?',
  'Prépare une vente de 2 tablettes',
];

function DataCard({ card }) {
  if (!card) return null;
  return <div className="mt-2 rounded-2xl border border-[#dbe8dc] bg-[#fbfdfb] p-3"><p className="text-sm font-black text-[#11351f]">{card.title}</p><div className="mt-2 space-y-1.5">{(card.rows || []).slice(0, 5).map((row) => <div key={`${row.label}-${row.value}`} className="flex justify-between gap-3 text-xs"><span className="text-[#6f8b73]">{row.label}</span><b className="text-right text-[#11351f]">{row.value}</b></div>)}</div></div>;
}

function Summary({ open, onClose, stats, sensorAlerts, onAsk }) {
  if (!open) return null;
  const statRows = [['Caisse', money(stats.caisse)], ['Ponte', `${number(stats.latestPonte)} œufs`], ['Stock critique', number(stats.stockCritique)], ['Créances', money(stats.creances)]];
  return <div className="absolute inset-0 z-30 bg-black/20"><div className="absolute inset-x-3 top-20 rounded-[1.5rem] border border-[#dbe8dc] bg-[#fbfdfb] p-4 shadow-2xl"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#15803d]">Résumé ferme</p><h2 className="mt-1 text-lg font-black text-[#11351f]">Données utiles maintenant</h2></div><button type="button" onClick={onClose} className="rounded-full p-2 text-[#6f8b73] hover:bg-[#eef7ef]" aria-label="Fermer"><X size={18} /></button></div><div className="flex gap-2 overflow-x-auto pb-1">{statRows.map(([label, value]) => <div key={label} className="min-w-[118px] rounded-2xl border border-[#dbe8dc] bg-white px-3 py-2 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#6f8b73]">{label}</p><p className="mt-1 truncate text-sm font-black text-[#11351f]">{value}</p></div>)}</div><div className="mt-4 rounded-2xl border border-[#e7efe8] bg-white p-3"><div className="mb-2 flex items-center gap-2 text-sm font-black text-[#11351f]"><ThermometerSun size={16} /> Alertes terrain</div>{sensorAlerts.length ? <div className="space-y-2">{sensorAlerts.slice(0, 3).map((alert) => <button key={alert.id} type="button" onClick={() => { onAsk(alert.prompt); onClose(); }} className="w-full rounded-xl bg-[#f7fbf7] px-3 py-2 text-left text-xs text-[#11351f]"><b>{alert.title}</b><span className="block text-[#6f8b73]">{alert.text}</span></button>)}</div> : <p className="text-xs text-[#6f8b73]">Aucune alerte capteur importante pour le moment.</p>}</div></div></div>;
}

function Header({ online, sensorAlerts, onOpenSummary, voiceEnabled, onToggleVoice, onSpeakLast }) {
  return <header className="shrink-0 bg-[#11351f] px-4 py-3 text-white"><div className="flex items-center gap-3"><BrandLogo variant="compact" /><div className="min-w-0 flex-1"><h1 className="text-base font-black leading-tight">Horizon</h1><p className="text-xs text-white/75">{online ? 'En ligne' : 'Hors ligne'} · français, wolof, english</p></div><button type="button" onClick={onOpenSummary} aria-label="Résumé ferme" className="relative min-h-10 min-w-10 rounded-full inline-flex items-center justify-center hover:bg-white/10"><BarChart3 size={18} />{sensorAlerts.length ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-300" /> : null}</button><button type="button" onClick={onToggleVoice} onDoubleClick={onSpeakLast} aria-label={voiceEnabled ? 'Désactiver la voix IA' : 'Activer la voix IA'} className={`min-h-10 min-w-10 rounded-full inline-flex items-center justify-center ${voiceEnabled ? 'bg-white text-[#11351f]' : 'hover:bg-white/10 text-white'}`}>{voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div><button type="button" onClick={onOpenSummary} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white/8 px-3 py-2 text-left text-xs text-white/80"><span className="flex items-center gap-2"><Globe2 size={14} /> Demande-moi le stock, la ponte, les ventes, les capteurs…</span><ChevronDown size={15} /></button>{voiceEnabled ? <p className="mt-2 text-[11px] text-white/65">Voix IA activée. Double-tape l’icône pour relire la dernière réponse.</p> : null}</header>;
}

function StarterPanel({ onAsk }) {
  return <div className="rounded-[1.6rem] border border-[#dbe8dc] bg-white p-4 shadow-sm"><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eef7ef] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#15803d]"><Sparkles size={13} /> Assistant ferme</div><h2 className="text-lg font-black text-[#11351f]">Parle à Horizon comme à quelqu’un sur le terrain.</h2><p className="mt-1 text-sm leading-relaxed text-[#6f8b73]">Français, wolof ou anglais. Horizon lit l’ERP, les capteurs, les caméras, les ventes, le stock, la santé et les tâches.</p><div className="mt-3 flex flex-wrap gap-2">{starterPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => onAsk(prompt)} className="rounded-full border border-[#dbe8dc] bg-[#fbfdfb] px-3 py-2 text-xs font-bold text-[#11351f] hover:border-[#15803d] hover:text-[#15803d]">{prompt}</button>)}</div></div>;
}

function Bubble({ message, onQuickReply }) {
  const outgoing = message.direction === 'out';
  const sensor = message.intent === 'sensor_alert' || message.intent === 'camera_alert';
  return <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[86%] rounded-[1.35rem] px-3.5 py-2.5 shadow-sm ${outgoing ? 'rounded-br-md bg-[#dff4e4] text-[#11351f]' : sensor ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-[#11351f]' : 'rounded-bl-md bg-white text-[#11351f]'}`}>{sensor ? <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-700"><Camera size={13} /> Alerte terrain</div> : null}<p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p><DataCard card={message.data_card} />{!outgoing && message.quick_replies?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.quick_replies.map((reply) => <button key={reply.label || reply} type="button" onClick={() => onQuickReply(reply.label || reply)} className="rounded-full border border-[#dbe8dc] bg-white px-3 py-1.5 text-xs font-bold text-[#15803d] shadow-sm">{reply.label || reply}</button>)}</div> : null}<div className="mt-1 text-right text-[10px] text-[#6f8b73]">{time(message.created_at)} {outgoing ? '✓✓' : ''}</div></div></div>;
}

function Body({ messages, onQuickReply, sending }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);
  const showStarter = messages.length <= 1;
  return <main className="min-h-0 flex-1 overflow-y-auto bg-[#f6faf6] px-3 py-4 space-y-3" aria-label="Conversation Horizon">{showStarter ? <StarterPanel onAsk={onQuickReply} /> : null}{messages.map((message) => <Bubble key={message.id} message={message} onQuickReply={onQuickReply} />)}{sending ? <div className="flex justify-start"><div className="rounded-[1.35rem] rounded-bl-md bg-white px-4 py-2 text-sm text-[#6f8b73] shadow-sm">Horizon réfléchit…</div></div> : null}<div ref={endRef} /></main>;
}

function Composer({ onSend, sending }) {
  const [value, setValue] = useState('');
  const submit = () => { const clean = value.trim(); if (!clean || sending) return; onSend(clean); setValue(''); };
  return <footer className="shrink-0 bg-white px-3 py-3 border-t border-[#e7efe8]"><div className="flex items-end gap-2"><button type="button" aria-label="Dictée vocale" className="min-h-11 min-w-11 rounded-full bg-[#eef7ef] text-[#15803d] inline-flex items-center justify-center shadow-sm"><Mic size={18} /></button><label className="sr-only" htmlFor="horizon-chat-input">Message Horizon</label><textarea id="horizon-chat-input" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} rows={1} placeholder="Écris en français, wolof ou anglais…" className="max-h-28 min-h-11 flex-1 resize-none rounded-3xl border border-[#dbe8dc] bg-[#fbfdfb] px-4 py-3 text-sm text-[#11351f] shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10" /><button type="button" aria-label="Envoyer le message" onClick={submit} disabled={sending || !value.trim()} className="min-h-11 min-w-11 rounded-full bg-[#15803d] text-white inline-flex items-center justify-center shadow-sm disabled:opacity-50"><SendHorizontal size={18} /></button></div></footer>;
}

export default function HorizonChatApp({ user }) {
  const { messages, stats, sensorAlerts, sending, online, sendMessage, voiceEnabled, toggleVoice, speakLast } = useHorizonChat({ user });
  const [summaryOpen, setSummaryOpen] = useState(false);
  return <div className="min-h-screen bg-white text-[#11351f] flex items-stretch justify-center md:p-4 lg:p-6" data-testid="horizon-chat-app"><div className="relative h-screen w-full max-w-[460px] bg-[#f6faf6] md:rounded-[2rem] md:shadow-2xl md:overflow-hidden flex flex-col"><Header online={online} sensorAlerts={sensorAlerts} onOpenSummary={() => setSummaryOpen(true)} voiceEnabled={voiceEnabled} onToggleVoice={toggleVoice} onSpeakLast={speakLast} /><Summary open={summaryOpen} onClose={() => setSummaryOpen(false)} stats={stats} sensorAlerts={sensorAlerts} onAsk={sendMessage} /><Body messages={messages} sending={sending} onQuickReply={sendMessage} /><Composer sending={sending} onSend={sendMessage} /></div></div>;
}
