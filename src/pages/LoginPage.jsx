import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Eye,
  EyeOff,
  Grid3x3,
  Leaf,
  LineChart,
  Lock,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const brandLogo = '/brand-logo-transparent.png';
const farmBg = '/login-hero-maraichage-v2-preview.jpg';

const FEATURES = [
  {
    icon: Leaf,
    title: 'Vision claire',
    detail: 'Toutes vos données au même endroit.',
    explanation: 'Un tableau de bord unique pour suivre élevage, cultures, ventes et trésorerie sans changer d\'outil.',
  },
  {
    icon: Bell,
    title: 'Maîtrise des risques',
    detail: 'Alertes et décisions au bon moment.',
    explanation: 'Soyez prévenu avant une rupture de stock, une anomalie sanitaire ou un écart de marge.',
  },
  {
    icon: LineChart,
    title: 'Croissance durable',
    detail: 'Développez votre ferme sereinement.',
    explanation: 'Fixez vos objectifs mensuels et mesurez vos progrès activité par activité.',
  },
  {
    icon: Grid3x3,
    title: 'Pilotage unifié',
    detail: 'Une seule plateforme pour toute l\'exploitation.',
    explanation: 'Animaux, aviculture, maraîchage, achats et finances pilotés depuis le même espace.',
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
    <main className="relative flex h-dvh flex-col overflow-hidden text-[#063321]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${farmBg})`,
          backgroundPosition: '28% 50%',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(125deg, rgba(255,248,239,0.88) 0%, rgba(255,248,239,0.5) 24%, rgba(255,248,239,0.1) 40%, transparent 50%)',
        }}
        aria-hidden
      />

      <header className="absolute left-0 top-0 z-20 px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 xl:px-10">
        <img
          src={brandLogo}
          alt="Horizon Farm"
          className="h-auto w-36 object-contain drop-shadow-md sm:w-44 lg:w-52 xl:w-56"
        />
      </header>

      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-7xl flex-1 min-h-0 items-start gap-5 px-4 pb-2 pt-14 sm:gap-6 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_340px] lg:gap-8 lg:px-8 lg:pt-[4.25rem] xl:px-10">
          <div className="max-w-xl">
            <h1 className="sr-only">Horizon Farm ERP</h1>
            <p className="text-[1.65rem] font-black leading-[1.12] tracking-tight text-[#063321] sm:text-3xl lg:text-[2.15rem] xl:text-4xl">
              Pilotez votre ferme.
            </p>
            <p className="mt-1 text-[1.65rem] font-black leading-[1.12] tracking-tight text-[#c9851a] sm:text-3xl lg:text-[2.15rem] xl:text-4xl">
              Anticipez vos risques.
            </p>
            <p className="mt-1 text-[1.65rem] font-black leading-[1.12] tracking-tight text-[#063321] sm:text-3xl lg:text-[2.15rem] xl:text-4xl">
              Développez votre croissance.
            </p>

            <p className="mt-3 max-w-md text-xs leading-5 text-[#2f4a3a] sm:text-sm sm:leading-6 lg:mt-4">
              De la terre nourricière à l&apos;horizon de votre prospérité — cultivez, élevez, bâtissez et faites grandir votre ferme avec sérénité.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[20rem] sm:max-w-sm lg:max-w-[21rem] xl:max-w-sm">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-[#e8dcc8] bg-white p-4 shadow-2xl shadow-[#063321]/12 sm:p-5"
            >
              <div
                className="mb-4 flex rounded-xl border border-[#d6e3d8] bg-[#f3faf4] p-1"
                role="tablist"
                aria-label="Connexion ou inscription"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => setMode('login')}
                  className={`flex-1 rounded-lg py-2 text-xs font-black transition sm:text-sm ${
                    mode === 'login'
                      ? 'bg-white text-[#063321] shadow-sm'
                      : 'text-[#6b7f72] hover:text-[#063321]'
                  }`}
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => setMode('signup')}
                  className={`flex-1 rounded-lg py-2 text-xs font-black transition sm:text-sm ${
                    mode === 'signup'
                      ? 'bg-white text-[#063321] shadow-sm'
                      : 'text-[#6b7f72] hover:text-[#063321]'
                  }`}
                >
                  S&apos;inscrire
                </button>
              </div>

              <p className="mb-4 text-center text-[11px] text-[#6b7f72] sm:text-xs">
                {mode === 'signup'
                  ? 'Créez votre accès Horizon Farm en quelques secondes.'
                  : 'Retrouvez votre espace de pilotage agricole.'}
              </p>

              {mode === 'signup' ? (
                <div className="mb-2.5">
                  <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-[#063321] sm:text-sm">
                    Nom complet
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] px-3 py-2 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
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
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="penda"
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
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] py-2 pl-9 pr-10 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
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
                <Leaf size={16} />
                {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </button>
            </form>
          </div>
        </section>

        <div className="h-14 shrink-0 sm:h-[4.5rem]" aria-hidden />

        <footer className="relative z-10 shrink-0 border-t border-[#063321]/20 bg-[#063321]/88 px-3 py-2 backdrop-blur-[1px] sm:px-5 lg:px-8 xl:px-10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4 lg:gap-x-4">
            {FEATURES.map(({ icon: Icon, title, detail, explanation }) => (
              <div key={title} className="text-white">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black leading-tight sm:text-[11px]">{title}</p>
                    <p className="mt-0.5 text-[9px] font-semibold leading-snug text-white/85 sm:text-[10px]">
                      {detail}
                    </p>
                    <p className="mt-0.5 hidden text-[9px] leading-snug text-white/65 xl:block">
                      {explanation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-1.5 max-w-7xl text-right text-[9px] text-white/45">© 2026 Horizon Farm. Tous droits réservés.</p>
        </footer>
      </div>
    </main>
  );
}
