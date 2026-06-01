import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, LogIn, RotateCcw, User, UserPlus } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { currentAppScriptSrc, isStaleAppBundle, purgeStalePwaCache } from '../services/pwa.js';

function LoginBuildInfo() {
  const [buildSha, setBuildSha] = useState('');
  const stale = isStaleAppBundle();
  const scriptSrc = currentAppScriptSrc();

  useEffect(() => {
    fetch('/api/build-info', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => setBuildSha(info?.sha?.slice(0, 7) || ''))
      .catch(() => {});
  }, []);

  const handlePurge = async () => {
    try {
      await purgeStalePwaCache({ reload: true });
    } catch {
      toast.error('Impossible de vider le cache');
    }
  };

  if (!buildSha && !stale && !scriptSrc) return null;

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-xs ${stale ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'}`}>
      {stale ? (
        <div className="space-y-2">
          <p className="font-black">Votre navigateur affiche une ancienne version ({scriptSrc || 'bundle inconnu'}).</p>
          <p>Cela peut arriver même sans installer l&apos;app — le cache navigateur ou un service worker peut conserver l&apos;ancien code.</p>
          <button type="button" onClick={handlePurge} className="rounded-lg bg-[#2f2415] px-3 py-2 text-[11px] font-black text-white">
            Forcer la mise à jour
          </button>
        </div>
      ) : (
        <p>
          Version serveur <span className="font-black text-[#2f2415]">{buildSha || '…'}</span>
          {scriptSrc ? <span className="block mt-1 font-mono text-[10px] opacity-80">{scriptSrc}</span> : null}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
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
        toast.success('Compte créé avec succès.');
        setMode('login');
      } else {
        await signIn({ login, password });
        toast.success('Connexion réussie');
      }
    } catch (error) {
      const message = error.message?.toLowerCase().includes('invalid login credentials')
        ? 'Identifiants incorrects.'
        : error.message || 'Action impossible';
      toast.error(message);
    } finally {
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
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f2415] flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo variant="login" className="justify-center mb-5" />
          <h1 className="text-3xl font-black tracking-normal">Horizon Farm ERP</h1>
          <p className="mt-2 text-sm text-[#8a7456]">De la terre à l'horizon - ERP agricole sécurisé</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#fffdf8] border border-[#e7d9be] rounded-xl p-6 shadow-xl shadow-[#d6c3a0]/20 space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white border border-[#eadcc2] p-1">
            <button type="button" onClick={() => setMode('login')} className={`rounded-lg py-2 text-sm font-bold ${mode === 'login' ? 'bg-[#2f2415] text-white' : 'text-[#8a7456]'}`}>Connexion</button>
            <button type="button" onClick={() => setMode('signup')} className={`rounded-lg py-2 text-sm font-bold ${mode === 'signup' ? 'bg-[#2f2415] text-white' : 'text-[#8a7456]'}`}>Créer son compte</button>
          </div>

          {mode === 'signup' ? <div>
            <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-widest text-[#9a7a43] mb-2">Nom complet</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b39b78]" />
              <input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full bg-white border border-[#d6c3a0] rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-[#c9a96a] focus:ring-2 focus:ring-[#c9a96a]/20" placeholder="Nom et prénom" autoComplete="name" />
            </div>
          </div> : null}

          <div>
            <label htmlFor="login" className="block text-xs font-semibold uppercase tracking-widest text-[#9a7a43] mb-2">Email / login</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b39b78]" />
              <input id="login" value={login} onChange={(event) => setLogin(event.target.value)} className="w-full bg-white border border-[#d6c3a0] rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-[#c9a96a] focus:ring-2 focus:ring-[#c9a96a]/20" placeholder={mode === 'signup' ? 'email@exemple.com' : 'penda'} autoComplete="username" required />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-widest text-[#9a7a43] mb-2">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b39b78]" />
              <input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="w-full bg-white border border-[#d6c3a0] rounded-lg pl-10 pr-11 py-3 text-sm outline-none focus:border-[#c9a96a] focus:ring-2 focus:ring-[#c9a96a]/20" placeholder="Mot de passe" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7456] hover:text-[#2f2415]" aria-label={showPassword ? 'Masquer la saisie' : 'Afficher la saisie'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#8a7456]"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="accent-[#c9a96a]" />Rester connecté</label>
            {mode === 'login' ? <button type="button" onClick={handleResetPassword} className="text-xs text-[#9a7a43] hover:text-[#2f2415] flex items-center gap-1"><RotateCcw size={12} />Mot de passe oublié</button> : null}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#c9a96a] hover:bg-[#b89452] disabled:opacity-60 text-[#2f2415] font-bold rounded-lg py-3 flex items-center justify-center gap-2 transition-all">
            {mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
            {loading ? 'Traitement...' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}
