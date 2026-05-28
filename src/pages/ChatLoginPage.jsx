import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const brandLogo = '/brand-logo.png';

export default function ChatLoginPage() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('penda');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await signIn({ login, password });
      toast.success('Bienvenue sur Horizon Chat');
      window.setTimeout(() => window.location.replace('/chat'), 120);
    } catch (error) {
      setLoading(false);
      toast.error(error.message || 'Connexion impossible');
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-4 text-[#123426]">
      <section className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-2">
        <div>
          <img src={brandLogo} alt="Horizon Farm" className="mb-8 w-56" />
          <p className="mb-3 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#1f7a3a]">Horizon Chat</p>
          <h1 className="text-5xl font-black leading-tight text-[#0b2f22]">Votre assistant ERP agricole</h1>
          <p className="mt-5 text-lg leading-8 text-[#5c6b64]">Connectez-vous avec vos identifiants ERP pour discuter avec Horizon Chat.</p>
        </div>
        <form onSubmit={submit} className="mx-auto w-full max-w-sm rounded-[2rem] border bg-[#f7fbf5] p-6 shadow-2xl">
          <div className="mb-6 text-center"><img src={brandLogo} alt="Horizon Farm" className="mx-auto w-40" /><h2 className="mt-4 text-2xl font-black">Connexion</h2></div>
          <input value={login} onChange={(e) => setLogin(e.target.value)} className="mb-3 w-full rounded-2xl border bg-white px-4 py-4 text-sm font-semibold outline-none" placeholder="Email ou identifiant" autoComplete="username" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mb-4 w-full rounded-2xl border bg-white px-4 py-4 text-sm font-semibold outline-none" placeholder="Mot de passe" autoComplete="current-password" required />
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#1f7a2f] py-4 font-black text-white disabled:opacity-60">{loading ? 'Ouverture…' : 'Se connecter'}</button>
        </form>
      </section>
    </main>
  );
}
