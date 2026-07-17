import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Eye,
  EyeOff,
  LayoutGrid,
  Leaf,
  Lock,
  LogIn,
  Mail,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const brandLogo = '/brand-logo-login.png';
const farmBg = '/login-farm-bg.png';
const COPYRIGHT_HOLDER = 'Horizon Farm';

const FEATURES = [
  { icon: Leaf, title: 'Vision claire', detail: 'Toutes vos données au même endroit.' },
  { icon: Bell, title: 'Maîtrise des risques', detail: 'Alertes et décisions au bon moment.' },
  { icon: TrendingUp, title: 'Croissance durable', detail: 'Développez votre ferme sereinement.' },
  { icon: LayoutGrid, title: 'Pilotage unifié', detail: 'Une seule plateforme pour toute l\'exploitation.' },
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
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden text-earth lg:h-dvh lg:overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${farmBg})`,
          /* Coucher de soleil et horizon au centre, maraîchage et piste de
             part et d'autre : cadrage centré pour garder le ciel derrière le
             texte et l'horizon lisible sur tous les écrans. */
          backgroundPosition: 'center 42%',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(560px 320px at 20% 55%, rgba(248,250,248,0.74) 0%, rgba(248,250,248,0.34) 46%, rgba(248,250,248,0) 72%), linear-gradient(90deg, rgba(246,248,246,0.42) 0%, rgba(246,248,246,0.10) 34%, rgba(246,248,246,0) 56%, rgba(246,248,246,0.10) 78%, rgba(246,248,246,0.28) 100%), linear-gradient(180deg, rgba(246,248,246,0.32) 0%, rgba(246,248,246,0) 20%, rgba(246,248,246,0) 74%, rgba(35,79,59,0.14) 100%)',
        }}
        aria-hidden
      />

      <header className="relative z-30 flex shrink-0 justify-start px-4 pb-1 pt-3 sm:px-8 sm:pt-4 lg:px-12 lg:pt-6">
        <img
          src={brandLogo}
          alt="Horizon Farm - De la terre à l'horizon"
          className="pointer-events-none h-12 w-auto max-w-[11rem] object-contain object-left sm:h-14 lg:h-16 xl:h-[4.5rem] xl:max-w-[13rem]"
        />
      </header>

      <div className="relative z-10 flex flex-1 flex-col lg:min-h-0">
        <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-4 px-4 pb-6 pt-2 sm:gap-6 sm:px-6 lg:min-h-0 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 lg:px-8 lg:py-2 xl:px-12">
          <div className="max-w-lg pt-2 lg:pt-0" style={{ textShadow: '0 1px 14px rgba(248,250,248,0.85), 0 1px 2px rgba(248,250,248,0.7)' }}>
            <h1 className="sr-only">Horizon Farm ERP</h1>
            <p
              className="text-screen font-semibold leading-tight text-earth"
            >
              Pilotez votre ferme.
            </p>
            <p
              className="mt-2 text-screen font-semibold leading-tight text-horizon-dark"
            >
              Anticipez vos risques.
            </p>
            <p
              className="mt-2 text-screen font-semibold leading-tight text-earth"
            >
              Développez votre croissance.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[19rem] sm:max-w-sm lg:mx-0 lg:ml-auto lg:max-w-[21rem] xl:max-w-[22rem]">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/60 bg-white/78 p-4 shadow-float backdrop-blur-md sm:p-6"
            >
              <div className="mb-4 text-center">
                <span className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-positive-bg text-leaf">
                  <Leaf size={18} />
                </span>
                <h2 className="font-serif text-xl font-semibold text-earth sm:text-2xl">
                  {mode === 'signup' ? 'Créer un compte' : 'Connexion'}
                </h2>
                <p className="mt-1 text-meta text-slate sm:text-xs">
                  {mode === 'signup'
                    ? 'Rejoignez Horizon Farm en quelques étapes'
                    : 'Accédez à votre espace Horizon Farm'}
                </p>
              </div>

              {mode === 'signup' ? (
                <div className="mb-3">
                  <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-earth sm:text-sm">
                    Nom complet
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-line bg-white/90 px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    placeholder="Nom et prénom"
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="mb-3">
                <label htmlFor="login" className="mb-1 block text-xs font-semibold text-earth sm:text-sm">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
                  <input
                    id="login"
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                    className="w-full rounded-xl border border-line bg-white/90 py-2 pl-12 pr-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    placeholder={mode === 'signup' ? 'votre@email.com' : 'penda'}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="mb-1 block text-xs font-semibold text-earth sm:text-sm">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
                  <input
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border border-line bg-white/90 py-2 pl-12 pr-12 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                    placeholder="Entrez votre mot de passe"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate hover:text-earth"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'login' ? (
                <div className="mb-3 flex items-center justify-between gap-2 text-meta sm:text-xs">
                  <label className="flex items-center gap-2 text-slate">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="accent-leaf"
                    />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="font-semibold text-leaf hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf py-3 text-sm font-semibold text-white shadow-float transition hover:bg-leaf disabled:opacity-60"
              >
                {mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
                {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </button>

              <div className="my-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-line" />
                <span className="text-meta font-semibold uppercase tracking-normal text-slate">ou</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-leaf bg-white/85 py-2 text-sm font-semibold text-leaf transition hover:bg-mist"
              >
                <UserPlus size={16} />
                {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
              </button>
            </form>
          </div>
        </section>

        <footer className="relative shrink-0 border-t border-leaf bg-earth px-4 py-3 sm:px-6 lg:px-8 xl:px-12">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4 lg:gap-4">
              {FEATURES.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="flex items-center gap-3 text-white sm:gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 sm:h-9 sm:w-9">
                    <Icon size={16} className="sm:hidden" />
                    <Icon size={17} className="hidden sm:block" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-meta font-semibold leading-tight sm:text-xs">{title}</p>
                    <p className="hidden text-meta leading-snug text-white/75 sm:block sm:text-meta">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="shrink-0 text-center text-meta leading-relaxed text-white/55 sm:text-meta lg:pb-1 lg:text-right">
              © {new Date().getFullYear()} {COPYRIGHT_HOLDER}. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
