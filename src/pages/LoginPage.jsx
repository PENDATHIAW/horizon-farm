import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, LogIn, Mail, Shield, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Image officielle — versions 1x/2x/3x pour écrans larges et Retina */
const HERO = {
  jpg: {
    '1x': '/login-hero-official.jpg',
    '2x': '/login-hero-official-2x.jpg',
    '3x': '/login-hero-official-3x.jpg',
  },
  webp: {
    '1x': '/login-hero-official.webp',
    '2x': '/login-hero-official-2x.webp',
    '3x': '/login-hero-official-3x.webp',
  },
};

const heroSrcSet = (formats) =>
  `${formats['1x']} 1024w, ${formats['2x']} 2048w, ${formats['3x']} 3072w`;

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
    <main className="relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">Horizon Farm ERP — Connexion</h1>

      {/* Plein écran — srcset 2x/3x pour éviter le flou d'agrandissement */}
      <picture className="pointer-events-none absolute inset-0 block h-full w-full select-none">
        <source type="image/webp" srcSet={heroSrcSet(HERO.webp)} sizes="100vw" />
        <source type="image/jpeg" srcSet={heroSrcSet(HERO.jpg)} sizes="100vw" />
        <img
          src={HERO.jpg['2x']}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: '38% center' }}
          draggable={false}
          decoding="async"
          fetchPriority="high"
        />
      </picture>

      {/*
        Formulaire sur la grange / le pré (centre-droit),
        PAS sur le coucher de soleil (coin supérieur-droit libre).
      */}
      <form
        onSubmit={handleSubmit}
        className="absolute z-10 left-1/2 flex max-h-[52dvh] w-[min(290px,88vw)] -translate-x-1/2 flex-col overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-2xl shadow-black/20 sm:w-[min(300px,24vw)] sm:p-5 lg:left-[58%] lg:translate-x-0"
        style={{ top: 'clamp(72px, 14dvh, 120px)' }}
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
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition sm:text-sm ${
              mode === 'login'
                ? 'border-b-2 border-[#063321] bg-white text-[#063321] shadow-sm'
                : 'text-[#6b7f72] hover:text-[#063321]'
            }`}
          >
            <LogIn size={14} className="shrink-0" />
            Se connecter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => setMode('signup')}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition sm:text-sm ${
              mode === 'signup'
                ? 'border-b-2 border-[#063321] bg-white text-[#063321] shadow-sm'
                : 'text-[#6b7f72] hover:text-[#063321]'
            }`}
          >
            <Users size={14} className="shrink-0" />
            S&apos;inscrire
          </button>
        </div>

        {mode === 'signup' ? (
          <div className="mb-2.5 shrink-0">
            <label htmlFor="fullName" className="mb-0.5 block text-xs font-semibold text-[#063321] sm:text-sm">
              Nom complet
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-[#d6e3d8] bg-[#fafcf9] px-2.5 py-1.5 text-sm outline-none focus:border-[#063321]"
              placeholder="Nom et prénom"
              autoComplete="name"
            />
          </div>
        ) : null}

        <div className="mb-2.5 shrink-0">
          <label htmlFor="login" className="mb-0.5 block text-xs font-semibold text-[#063321] sm:text-sm">
            Email
          </label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8aa393]" />
            <input
              id="login"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="w-full rounded-lg border border-[#d6e3d8] bg-[#fafcf9] py-2 pl-8 pr-2 text-sm outline-none focus:border-[#063321]"
              placeholder="penda"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="mb-2.5 shrink-0">
          <label htmlFor="password" className="mb-0.5 block text-xs font-semibold text-[#063321] sm:text-sm">
            Mot de passe
          </label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8aa393]" />
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-lg border border-[#d6e3d8] bg-[#fafcf9] py-2 pl-8 pr-8 text-sm outline-none focus:border-[#063321]"
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
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {mode === 'login' ? (
          <div className="mb-3 flex shrink-0 items-center justify-between gap-1 text-[11px] sm:text-xs">
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
          className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#063321] py-2.5 text-sm font-bold text-white transition hover:bg-[#0a4a28] disabled:opacity-60"
        >
          <LogIn size={15} />
          {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
        </button>

        {mode === 'login' ? (
          <p className="mt-auto flex shrink-0 items-start gap-1.5 border-t border-[#e8ebe8] pt-3 text-[10px] leading-snug text-[#6b7f72] sm:text-[11px]">
            <Shield size={12} className="mt-0.5 shrink-0 text-[#1f7a2f]" />
            <span>
              <span className="font-bold text-[#063321]">Accès sécurisé</span>
              {' — '}
              Vos données sont protégées et confidentielles.
            </span>
          </p>
        ) : null}
      </form>
    </main>
  );
}
