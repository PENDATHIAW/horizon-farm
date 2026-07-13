import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Leaf, Lock, MessageCircle, Mic, Phone, Sprout, TrendingUp, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const brandLogo = '/brand-logo.png';

export default function ChatLoginPage() {
  const { signIn, signUp, resetPassword, remember, setRemember } = useAuth();
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState('penda');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp({ login, password, fullName, role: 'visiteur' });
        toast.success('Compte Horizon Chat créé. Connectez-vous maintenant.');
        setMode('login');
      } else {
        await signIn({ login, password });
        toast.success('Bienvenue sur Horizon Chat');
        window.setTimeout(() => window.location.replace('/chat'), 120);
      }
    } catch (error) {
      const message = error.message?.toLowerCase().includes('invalid login credentials') ? 'Identifiants incorrects.' : error.message || 'Action impossible';
      toast.error(message);
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(login);
      toast.success('Lien envoyé si le compte existe.');
    } catch (error) {
      toast.error(error.message || 'Réinitialisation impossible');
    }
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-white text-earth">
      <section className="mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-8 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-xl">
          <img src={brandLogo} alt="Horizon Farm" className="mb-8 h-auto w-56 object-contain" />

          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-positive-bg px-4 py-2 text-xs font-semibold uppercase tracking-normal text-leaf ring-1 ring-positive">
            <MessageCircle size={15} /> Horizon Chat
          </p>

          <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-normal text-earth md:text-6xl">
            Votre assistant vocal agricole
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate">
            Posez vos questions, obtenez des conseils adaptés à votre élevage et à vos cultures, en toute simplicité.
          </p>

          <div className="mt-12 space-y-6">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-positive-bg text-leaf"><Mic size={22} /></span>
              <div>
                <h2 className="text-base font-semibold text-earth">Parlez dans votre langue</h2>
                <p className="text-sm text-slate">Français, Wolof, English</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-positive-bg text-leaf"><Leaf size={22} /></span>
              <div>
                <h2 className="text-base font-semibold text-earth">Conseils agricoles adaptés</h2>
                <p className="text-sm text-slate">Élevage, cultures, alimentation, santé animale</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-positive-bg text-leaf"><TrendingUp size={22} /></span>
              <div>
                <h2 className="text-base font-semibold text-earth">Suivi intelligent</h2>
                <p className="text-sm text-slate">Des réponses claires et un suivi pour de meilleurs résultats</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <a href="#chat-login-form" className="inline-flex min-w-64 items-center justify-center gap-3 rounded-2xl bg-leaf px-8 py-4 text-base font-semibold text-white shadow-float hover:bg-leaf">
              <Leaf size={20} /> Se connecter
            </a>
            <button type="button" onClick={() => setMode('signup')} className="inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold text-leaf underline underline-offset-8">
              Créer un compte
            </button>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[500px] justify-center lg:max-w-[560px]">
          <div className="relative flex min-h-[42rem] w-full max-w-sm flex-col overflow-hidden rounded-card border border-line bg-card shadow-card">
            <div className="relative flex min-h-full flex-1 flex-col bg-cover bg-center px-6 pb-6 pt-12" style={{ backgroundImage: "url('/chat-farm-bg.jpg')" }}>
              <div className="absolute inset-0 bg-mist/85" />
              <div className="relative z-10 flex flex-1 flex-col">
                <div className="text-center">
                  <img src={brandLogo} alt="Horizon Farm" className="mx-auto h-auto w-48 object-contain" />
                  <p className="mt-6 text-sm font-semibold text-earth">Bienvenue sur</p>
                  <h2 className="mt-1 text-3xl font-semibold text-earth">Horizon Chat</h2>
                  <p className="mt-2 text-sm font-semibold text-slate">Votre assistant vocal agricole</p>
                </div>

                <form id="chat-login-form" onSubmit={handleSubmit} className="mt-auto space-y-3">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/70 p-1 backdrop-blur">
                    <button type="button" onClick={() => setMode('login')} className={`rounded-xl py-2 text-xs font-semibold ${mode === 'login' ? 'bg-leaf text-white' : 'text-slate'}`}>Connexion</button>
                    <button type="button" onClick={() => setMode('signup')} className={`rounded-xl py-2 text-xs font-semibold ${mode === 'signup' ? 'bg-leaf text-white' : 'text-slate'}`}>Compte</button>
                  </div>

                  {mode === 'signup' ? (
                    <div className="relative">
                      <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
                      <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-2xl border border-white/40 bg-white/92 py-4 pl-12 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-leaf/25" placeholder="Nom complet" autoComplete="name" />
                    </div>
                  ) : null}

                  <div className="relative">
                    <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
                    <input value={login} onChange={(event) => setLogin(event.target.value)} className="w-full rounded-2xl border border-white/40 bg-white/92 py-4 pl-12 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-leaf/25" placeholder="Email ou identifiant" autoComplete="username" required />
                  </div>

                  <div className="relative">
                    <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
                    <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="w-full rounded-2xl border border-white/40 bg-white/92 py-4 pl-12 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-leaf/25" placeholder="Mot de passe" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-1 text-xs font-semibold text-earth">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="accent-leaf" />Rester connecté</label>
                    {mode === 'login' ? <button type="button" onClick={handleResetPassword} className="hover:underline">Mot de passe oublié</button> : null}
                  </div>

                  <button type="submit" disabled={loading} className="w-full rounded-2xl bg-leaf py-4 text-base font-semibold text-white shadow-float hover:bg-leaf disabled:opacity-60">
                    {loading ? 'Ouverture…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
                  </button>

                  <p className="text-center text-xs font-semibold text-earth">
                    {mode === 'signup' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
                    <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="font-semibold text-earth underline underline-offset-4">
                      {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
                    </button>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Sprout className="pointer-events-none absolute bottom-8 left-8 hidden text-positive lg:block" size={120} />
    </main>
  );
}
