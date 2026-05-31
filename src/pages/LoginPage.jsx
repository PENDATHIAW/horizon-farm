import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BrainCircuit,
  Eye,
  EyeOff,
  Layers,
  LayoutDashboard,
  Leaf,
  Lock,
  Mail,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const brandLogo = '/brand-logo.png';
const farmBg = '/login-farm-bg.png';

/** Quatre piliers alignés sur la promesse réelle de l'ERP Horizon Farm. */
const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Pilotage unifié',
    detail: 'Tableau de bord, stocks, ventes et finances connectés.',
  },
  {
    icon: BrainCircuit,
    title: 'Décisions terrain',
    detail: 'Centre décisionnel, alertes et actions en un clic.',
  },
  {
    icon: TrendingUp,
    title: 'Objectifs & rentabilité',
    detail: 'Écarts zootechniques, marges lots et croissance.',
  },
  {
    icon: Layers,
    title: 'Multi-filières',
    detail: 'Avicole, embouche, maraîchage et traçabilité.',
  },
];

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
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden text-[#063321] lg:h-dvh lg:overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${farmBg})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#fff8ef]/94 via-[#fff8ef]/82 to-[#fff8ef]/45" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#063321]/50 via-transparent to-transparent" aria-hidden />

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col lg:min-h-0">
        <header className="shrink-0 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-5">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="inline-flex items-center rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 shadow-sm shadow-[#063321]/5 backdrop-blur-md">
              <img
                src={brandLogo}
                alt="Horizon Farm"
                className="h-9 w-auto object-contain sm:h-10 lg:h-11"
              />
            </div>
            <p className="hidden text-right text-xs font-semibold uppercase tracking-[0.2em] text-[#2f4a3a]/80 lg:block">
              De la terre à l&apos;horizon
            </p>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl flex-1 min-h-0 items-center gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-10 lg:py-2">
          <div className="max-w-lg lg:pr-4">
            <h1 className="sr-only">Horizon Farm ERP</h1>
            <p className="text-[1.65rem] font-black leading-[1.15] tracking-tight text-[#063321] sm:text-3xl lg:text-[2rem] xl:text-4xl">
              Pilotez votre ferme.
            </p>
            <p className="mt-1 text-[1.65rem] font-black leading-[1.15] tracking-tight text-[#c9851a] sm:text-3xl lg:text-[2rem] xl:text-4xl">
              Anticipez vos risques.
            </p>
            <p className="mt-1 text-[1.65rem] font-black leading-[1.15] tracking-tight text-[#063321] sm:text-3xl lg:text-[2rem] xl:text-4xl">
              Développez votre croissance.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#2f4a3a] sm:text-base lg:mt-5 lg:leading-7">
              Horizon Farm est votre centre de pilotage agricole pour gérer, analyser et faire grandir votre activité en toute sérénité.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-[22rem] xl:max-w-md">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-2xl shadow-[#063321]/10 backdrop-blur-sm sm:p-6"
            >
              <div className="mb-5 text-center">
                <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f5ea] text-[#1f7a2f]">
                  <Leaf size={20} />
                </span>
                <h2 className="font-serif text-2xl font-black text-[#063321]">
                  {mode === 'signup' ? 'Créer un compte' : 'Connexion'}
                </h2>
                <p className="mt-0.5 text-xs text-[#6b7f72] sm:text-sm">
                  {mode === 'signup'
                    ? 'Rejoignez Horizon Farm en quelques étapes'
                    : 'Accédez à votre espace Horizon Farm'}
                </p>
              </div>

              {mode === 'signup' ? (
                <div className="mb-3">
                  <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-[#063321]">
                    Nom complet
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] px-4 py-2.5 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="Nom et prénom"
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="mb-3">
                <label htmlFor="login" className="mb-1.5 block text-sm font-semibold text-[#063321]">
                  Email
                </label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa393]" />
                  <input
                    id="login"
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="votre@email.com"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#063321]">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa393]" />
                  <input
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] py-2.5 pl-10 pr-11 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="Entrez votre mot de passe"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8aa393] hover:text-[#063321]"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {mode === 'login' ? (
                <div className="mb-4 flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <label className="flex items-center gap-2 text-[#4a6358]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="accent-[#1f7a2f]"
                    />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="font-semibold text-[#1f7a2f] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a2f] py-3 text-sm font-black text-white shadow-lg shadow-[#1f7a2f]/25 transition hover:bg-[#176226] disabled:opacity-60"
              >
                <Leaf size={17} />
                {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e2ebe4]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8aa393]">ou</span>
                <div className="h-px flex-1 bg-[#e2ebe4]" />
              </div>

              <p className="mb-3 text-center text-xs text-[#5c6f64] sm:text-sm">
                {mode === 'signup'
                  ? 'Déjà inscrit ? Connectez-vous à votre espace.'
                  : 'Nouveau sur Horizon Farm ? Créez votre compte en quelques étapes.'}
              </p>

              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1f7a2f] bg-white py-2.5 text-sm font-black text-[#1f7a2f] transition hover:bg-[#f3faf4]"
              >
                <UserPlus size={17} />
                {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
              </button>
            </form>
          </div>
        </section>

        <footer className="shrink-0 bg-[#063321] px-4 py-4 sm:px-6 lg:px-10 lg:py-4">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex gap-2.5 text-white sm:gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 sm:h-10 sm:w-10">
                  <Icon size={18} className="sm:hidden" />
                  <Icon size={19} className="hidden sm:block" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-tight sm:text-sm">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/75 sm:text-xs">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
