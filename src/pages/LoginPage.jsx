import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, LogIn, Mail, Shield, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Image officielle user — logo, textes et footer déjà intégrés (1024×768) */
const loginHero = '/login-hero-official.jpg';

/** Zone formulaire à droite — au-dessus du footer, sans masquer le coucher de soleil */
const FORM_ZONE = {
  top: '15%',
  right: '5.5%',
  width: '28.5%',
  maxHeight: '58%',
};

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
    <main className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#1a2f1a]">
      <h1 className="sr-only">Horizon Farm ERP — Connexion</h1>

      {/* Image entière 4:3 — horizon toujours visible, jamais recadré */}
      <div
        className="relative shrink-0"
        style={{
          width: 'min(100vw, calc(100dvh * 4 / 3))',
          height: 'min(100dvh, calc(100vw * 3 / 4))',
        }}
      >
        <img
          src={loginHero}
          alt=""
          className="pointer-events-none block h-full w-full select-none object-cover object-center"
          draggable={false}
        />

        {/* Seul ajout React : formulaire compact à droite */}
        <form
          onSubmit={handleSubmit}
          className="absolute flex flex-col overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-2xl shadow-black/20 sm:p-5"
          style={FORM_ZONE}
        >
          <div
            className="mb-3 flex shrink-0 rounded-xl border border-[#d6e3d8] bg-[#f3faf4] p-1"
            role="tablist"
            aria-label="Connexion ou inscription"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[clamp(9px,1.3vmin,12px)] font-bold transition ${
                mode === 'login'
                  ? 'border-b-2 border-[#063321] bg-white text-[#063321] shadow-sm'
                  : 'text-[#6b7f72] hover:text-[#063321]'
              }`}
            >
              <LogIn size={13} className="shrink-0" />
              Se connecter
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => setMode('signup')}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[clamp(9px,1.3vmin,12px)] font-bold transition ${
                mode === 'signup'
                  ? 'border-b-2 border-[#063321] bg-white text-[#063321] shadow-sm'
                  : 'text-[#6b7f72] hover:text-[#063321]'
              }`}
            >
              <Users size={13} className="shrink-0" />
              S&apos;inscrire
            </button>
          </div>

          {mode === 'signup' ? (
            <div className="mb-2.5 shrink-0">
              <label htmlFor="fullName" className="mb-0.5 block text-[clamp(8px,1.2vmin,11px)] font-semibold text-[#063321]">
                Nom complet
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-lg border border-[#d6e3d8] bg-[#fafcf9] px-2.5 py-1.5 text-[clamp(9px,1.3vmin,13px)] outline-none focus:border-[#063321]"
                placeholder="Nom et prénom"
                autoComplete="name"
              />
            </div>
          ) : null}

          <div className="mb-2.5 shrink-0">
            <label htmlFor="login" className="mb-0.5 block text-[clamp(8px,1.2vmin,11px)] font-semibold text-[#063321]">
              Email
            </label>
            <div className="relative">
              <Mail size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8aa393]" />
              <input
                id="login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                className="w-full rounded-lg border border-[#d6e3d8] bg-[#fafcf9] py-1.5 pl-7 pr-2 text-[clamp(9px,1.3vmin,13px)] outline-none focus:border-[#063321]"
                placeholder="penda"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="mb-2.5 shrink-0">
            <label htmlFor="password" className="mb-0.5 block text-[clamp(8px,1.2vmin,11px)] font-semibold text-[#063321]">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8aa393]" />
              <input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-[#d6e3d8] bg-[#fafcf9] py-1.5 pl-7 pr-7 text-[clamp(9px,1.3vmin,13px)] outline-none focus:border-[#063321]"
                placeholder="Entrez votre mot de passe"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8aa393]"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {mode === 'login' ? (
            <div className="mb-3 flex shrink-0 items-center justify-between gap-1 text-[clamp(7px,1.1vmin,10px)]">
              <label className="flex items-center gap-1 text-[#4a6358]">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="accent-[#063321]" />
                Se souvenir de moi
              </label>
              <button type="button" onClick={handleResetPassword} className="font-semibold text-[#1f7a2f] hover:underline">
                Mot de passe oublié ?
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#063321] py-2 text-[clamp(9px,1.3vmin,13px)] font-bold text-white transition hover:bg-[#0a4a28] disabled:opacity-60"
          >
            <LogIn size={13} />
            {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          </button>

          {mode === 'login' ? (
            <p className="mt-auto flex shrink-0 items-start gap-1.5 border-t border-[#e8ebe8] pt-3 text-[clamp(6px,1vmin,9px)] leading-snug text-[#6b7f72]">
              <Shield size={11} className="mt-0.5 shrink-0 text-[#1f7a2f]" />
              <span>
                <span className="font-bold text-[#063321]">Accès sécurisé</span>
                {' — '}
                Vos données sont protégées et confidentielles.
              </span>
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
