import { LogOut, Mic, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { askErpFromChat } from '../services/erpChatBridge';

const brandLogo = '/brand-logo.png';
const nowTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function roleOf(user, profile, role) {
  const value = String(role || profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  if (['admin', 'manager', 'employe', 'veterinaire', 'comptable'].includes(value)) return value;
  return 'admin';
}

async function askServerAgent({ text, language, role, actor, session }) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ text, language, role, actor }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Agent serveur indisponible.');
  return data;
}

function DataTable({ table }) {
  if (!table?.columns?.length || !table?.rows?.length) return null;
  return (
    <div className="mt-3 max-w-full overflow-x-auto rounded-2xl border border-emerald-100 bg-white/80">
      <table className="min-w-full text-left text-[11px]">
        <thead className="bg-emerald-50 text-[#075e54]">
          <tr>{table.columns.map((col) => <th key={col} className="whitespace-nowrap px-3 py-2 font-black uppercase tracking-wide">{col.replaceAll('_', ' ')}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index} className="border-t border-emerald-50">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-[170px] whitespace-nowrap px-3 py-2 text-[#263b31]">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChatPage() {
  const { session, user, profile, role: authRole, loading, signOut } = useAuth();
  const [language, setLanguage] = useState('fr');
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState(() => [{ id: 1, side: 'assistant', text: 'Bienvenue sur Horizon Chat. Posez librement une question sur votre ERP.', time: nowTime(), language: 'fr' }]);

  const role = roleOf(user, profile, authRole);
  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'Horizon user';
  const canSend = useMemo(() => message.trim().length > 0 && !isThinking, [message, isThinking]);

  const addMessage = (item) => setMessages((current) => [...current, { id: Date.now() + Math.random(), time: nowTime(), ...item }]);

  const sendText = async (raw = message) => {
    const text = String(raw || '').trim();
    if (!text || isThinking) return;
    addMessage({ side: 'user', text, language });
    setMessage('');
    setIsThinking(true);
    try {
      let reply;
      try {
        reply = await askServerAgent({ text, language, role, actor: { userId: user?.id, email: user?.email }, session });
      } catch (agentError) {
        console.warn('Horizon server agent fallback:', agentError?.message || agentError);
        reply = await askErpFromChat({ text, language, role, actor: { userId: user?.id, email: user?.email } });
      }
      addMessage(reply || { side: 'assistant', language, text: 'Je suis prêt. Posez une question sur une partie précise de l’ERP, ou demandez une analyse.' });
    } catch (error) {
      addMessage({ side: 'assistant', language, text: error.message || 'Assistant ERP indisponible.', status: 'Erreur ERP' });
    } finally {
      setIsThinking(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      window.location.replace('/chat');
    } catch (error) {
      setNotice(error.message || 'Déconnexion impossible.');
    }
  };

  if (loading) return <main className="grid min-h-dvh place-items-center bg-white text-[#075e54]"><p className="text-sm font-black">Chargement Horizon Chat…</p></main>;

  return (
    <main className="min-h-dvh bg-gradient-to-br from-white via-[#f3fbf4] to-[#e7f5e9] md:grid md:place-items-center md:px-4 md:py-4">
      <section className="mx-auto flex h-dvh w-full max-w-[450px] flex-col overflow-hidden bg-[#efe7dc] shadow-2xl md:h-[890px] md:rounded-[2.7rem] md:border-[9px] md:border-[#101010]">
        <header className="shrink-0 bg-gradient-to-r from-[#064d43] to-[#08745f] px-4 pb-3 pt-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white"><img src={brandLogo} alt="Horizon Farm" className="h-full w-full object-contain p-1" /></div>
            <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-black">Horizon Farm</h1><p className="truncate text-sm text-white/80">{displayName} • {role}</p></div>
            <button type="button" onClick={logout} className="rounded-full p-2 hover:bg-white/10" aria-label="Déconnexion"><LogOut size={21} /></button>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[#efe7dc] px-4 py-4">
          <div className="mx-auto w-fit rounded-xl bg-[#fff4cf] px-4 py-2 text-center text-xs font-semibold text-[#5f5333] shadow-sm">Assistant ERP • agent serveur • questions libres</div>
          {messages.map((item) => {
            const isUser = item.side === 'user';
            return (
              <div key={item.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`${item.table ? 'max-w-[96%]' : 'max-w-[82%]'} rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm ${isUser ? 'rounded-tr-md bg-[#d9fdd3] text-[#1f2c22]' : 'rounded-tl-md bg-white text-[#1f1f1f]'}`}>
                  <p className="whitespace-pre-line">{item.text}</p>
                  <DataTable table={item.table} />
                  {item.status ? <div className="mt-2 rounded-xl bg-white/70 px-2 py-1 text-[11px] font-bold text-[#607167]">{item.status}</div> : null}
                  {item.erp ? <div className="mt-2 rounded-xl bg-[#eef8f1] px-2 py-1 text-[11px] font-black text-[#075e54]">ERP • {item.erp.module || item.erp.table || item.erp.action}{item.erp.intent ? ` • ${item.erp.intent}` : ''}</div> : null}
                  <div className="mt-1 text-right text-[11px] text-[#8a8a8a]">{item.time}</div>
                </div>
              </div>
            );
          })}
          {isThinking ? <div className="w-fit rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#607167] shadow-sm">Horizon consulte l’ERP…</div> : null}
        </div>

        <footer className="shrink-0 bg-[#efe7dc] px-3 pb-4 pt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
              {[['wo', 'Wolof'], ['fr', 'FR'], ['en', 'EN']].map(([key, label]) => <button key={key} type="button" onClick={() => setLanguage(key)} className={`rounded-full px-3 py-1 text-xs font-black ${language === key ? 'bg-[#075e54] text-white' : 'text-[#607167]'}`}>{label}</button>)}
            </div>
            <span className="text-[11px] font-semibold text-[#7b6b5c]">{language.toUpperCase()}</span>
          </div>
          {notice ? <div className="mb-2 rounded-xl bg-white/80 px-3 py-2 text-[11px] font-bold text-[#607167] shadow-sm">{notice}</div> : null}
          <form onSubmit={(event) => { event.preventDefault(); sendText(); }} className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-3 py-2 shadow-sm"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Posez une question libre à l’ERP" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8b948f]" /></div>
            <button type={canSend ? 'submit' : 'button'} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#008069] text-white shadow-lg" disabled={!canSend}>{canSend ? <Send size={20} /> : <Mic size={24} />}</button>
          </form>
        </footer>
      </section>
    </main>
  );
}
