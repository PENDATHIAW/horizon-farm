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

const textShadow = '0 1px 14px rgba(255,248,239,0.92), 0 0 2px rgba(255,248,239,0.65)';

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
    <main className="relative flex h-dvh flex-col overflow-hidden text-[#063321]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${farmBg})`,
          backgroundPosition: '52% 44%',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#063321]/72 via-transparent to-transparent" aria-hidden />

      <header className="relative z-30 flex shrink-0 justify-start px-4 pb-1 pt-3 sm:px-8 sm:pt-4 lg:px-10 lg:pt-5">
        <img
          src={brandLogo}
          alt="Horizon Farm — De la terre à l'horizon"
          className="pointer-events-none h-12 w-auto max-w-[11rem] object-contain object-left sm:h-14 lg:h-16 xl:h-[4.5rem] xl:max-w-[13rem]"
          style={{
            filter:
              'drop-shadow(0 2px 6px rgba(6,51,33,0.45)) drop-shadow(0 0 1px rgba(255,255,255,0.85))',
          }}
        />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-7xl flex-1 min-h-0 items-center gap-5 px-4 py-2 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 lg:px-8 xl:px-10">
          <div className="max-w-lg pt-2 lg:pt-0">
            <h1 className="sr-only">Horizon Farm ERP</h1>
            <p
              className="text-[1.7rem] font-black leading-[1.1] tracking-tight text-[#063321] sm:text-3xl lg:text-[2.25rem] xl:text-[2.65rem]"
              style={{ textShadow }}
            >
              Pilotez votre ferme.
            </p>
            <p
              className="mt-1.5 text-[1.7rem] font-black leading-[1.1] tracking-tight text-[#c9851a] sm:text-3xl lg:text-[2.25rem] xl:text-[2.65rem]"
              style={{ textShadow }}
            >
              Anticipez vos risques.
            </p>
            <p
              className="mt-1.5 text-[1.7rem] font-black leading-[1.1] tracking-tight text-[#063321] sm:text-3xl lg:text-[2.25rem] xl:text-[2.65rem]"
              style={{ textShadow }}
            >
              Développez votre croissance.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[19rem] sm:max-w-sm lg:mx-0 lg:ml-auto lg:max-w-[21rem] xl:max-w-[22rem]">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/60 bg-white/78 p-4 shadow-2xl shadow-[#063321]/15 backdrop-blur-md sm:p-5"
            >
              <div className="mb-4 text-center">
                <span className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f5ea] text-[#1f7a2f]">
                  <Leaf size={18} />
                </span>
                <h2 className="font-serif text-xl font-black text-[#063321] sm:text-2xl">
                  {mode === 'signup' ? 'Créer un compte' : 'Connexion'}
                </h2>
                <p className="mt-0.5 text-[11px] text-[#6b7f72] sm:text-xs">
                  {mode === 'signup'
                    ? 'Rejoignez Horizon Farm en quelques étapes'
                    : 'Accédez à votre espace Horizon Farm'}
                </p>
              </div>

              {mode === 'signup' ? (
                <div className="mb-2.5">
                  <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-[#063321] sm:text-sm">
                    Nom complet
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-white/90 px-3 py-2 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="Nom et prénom"
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="mb-2.5">
                <label htmlFor="login" className="mb-1 block text-xs font-semibold text-[#063321] sm:text-sm">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa393]" />
                  <input
                    id="login"
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-white/90 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder={mode === 'signup' ? 'votre@email.com' : 'penda'}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="mb-2.5">
                <label htmlFor="password" className="mb-1 block text-xs font-semibold text-[#063321] sm:text-sm">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa393]" />
                  <input
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-white/90 py-2 pl-9 pr-10 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="Entrez votre mot de passe"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8aa393] hover:text-[#063321]"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'login' ? (
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <label className="flex items-center gap-1.5 text-[#4a6358]">
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a2f] py-2.5 text-sm font-black text-white shadow-lg shadow-[#1f7a2f]/25 transition hover:bg-[#176226] disabled:opacity-60"
              >
                {mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
                {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </button>

              <div className="my-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-[#e2ebe4]" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8aa393]">ou</span>
                <div className="h-px flex-1 bg-[#e2ebe4]" />
              </div>

              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1f7a2f] bg-white/85 py-2 text-sm font-black text-[#1f7a2f] transition hover:bg-[#f3faf4]"
              >
                <UserPlus size={16} />
                {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
              </button>
            </form>
          </div>
        </section>

        <footer className="shrink-0 border-t border-white/10 bg-[#063321]/88 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4 lg:gap-4">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-center gap-2.5 text-white sm:gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 sm:h-9 sm:w-9">
                  <Icon size={16} className="sm:hidden" />
                  <Icon size={17} className="hidden sm:block" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-tight sm:text-xs">{title}</p>
                  <p className="hidden text-[10px] leading-snug text-white/75 sm:block sm:text-[11px]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-2.5 max-w-7xl border-t border-white/10 pt-2 text-center text-[9px] leading-relaxed text-white/55 sm:text-[10px]">
            © {new Date().getFullYear()} {COPYRIGHT_HOLDER}. Tous droits réservés.
          </p>
        </footer>
      </div>
    </main>
  );
}
