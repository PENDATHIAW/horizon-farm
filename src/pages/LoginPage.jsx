import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BrainCircuit,
  CheckCircle2,
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
const POST_LOGIN_KEY = 'horizon_post_login_module';

/** Cadrage photo : ligne d'horizon & coucher de soleil visibles. */
const HORIZON_OBJECT = 'object-[58%_42%]';

const HIGHLIGHTS = [
  'Production, stocks et finances sans tableur.',
  'Alertes et centre décisionnel pour agir vite.',
  'Objectifs zootechniques et rentabilité par lot.',
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Pilotage unifié',
    detail: 'Tableau de bord, stocks, ventes et finances connectés.',
    hint: 'Accueil & vue d\'ensemble',
    moduleId: 'dashboard',
  },
  {
    icon: BrainCircuit,
    title: 'Décisions terrain',
    detail: 'Centre décisionnel, alertes et actions en un clic.',
    hint: 'Centre décisionnel',
    moduleId: 'centre_ia',
    options: { tab: 'Rentabilité lots' },
  },
  {
    icon: TrendingUp,
    title: 'Objectifs & rentabilité',
    detail: 'Écarts zootechniques, marges lots et croissance.',
    hint: 'Objectifs & Croissance',
    moduleId: 'objectifs_croissance',
    options: { tab: 'Objectifs & Écarts Zootechniques' },
  },
  {
    icon: Layers,
    title: 'Multi-filières',
    detail: 'Avicole, embouche, maraîchage et traçabilité.',
    hint: 'Élevage multi-activités',
    moduleId: 'elevage',
    options: { tab: 'Résumé' },
  },
];

function queuePostLoginModule(feature) {
  sessionStorage.setItem(
    POST_LOGIN_KEY,
    JSON.stringify({ moduleId: feature.moduleId, options: feature.options || {} }),
  );
}

function HorizonShowcase({ className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={farmBg}
        alt="Ferme au coucher du soleil — Horizon Farm"
        className={`absolute inset-0 h-full w-full object-cover ${HORIZON_OBJECT}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#063321]/85 via-[#063321]/15 to-[#f5a623]/10" aria-hidden />
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-[42%] h-px bg-gradient-to-r from-transparent via-[#f5c842]/90 to-transparent shadow-[0_0_24px_rgba(245,200,66,0.55)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#f5c842]/90 sm:text-xs">
          De la terre à l&apos;horizon
        </p>
        <p className="mt-2 max-w-md text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
          L&apos;horizon de votre ferme,{' '}
          <span className="text-[#f5c842]">en un coup d&apos;œil.</span>
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
          Champs, bâtiments et ciel — la même vision que sur le terrain, dans votre ERP.
        </p>
      </div>
    </div>
  );
}

function PillarCard({ feature, onSelect, className = '' }) {
  const { icon: Icon, title, detail, hint } = feature;
  return (
    <button
      type="button"
      onClick={() => onSelect(feature)}
      className={`group relative flex gap-2.5 rounded-xl text-left text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 sm:gap-3 ${className}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 sm:h-10 sm:w-10">
        <Icon size={18} className="sm:hidden" />
        <Icon size={19} className="hidden sm:block" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black leading-tight sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/75 sm:text-xs">{detail}</p>
      </div>
      <span className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-4 z-20 hidden max-w-[220px] rounded-lg border border-white/15 bg-[#0a2e1c] px-3 py-2 text-[11px] font-semibold text-white/95 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 lg:block">
        {hint}
        <span className="mt-0.5 block font-normal text-white/70">Connexion requise</span>
      </span>
    </button>
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

  const handlePillarClick = (feature) => {
    queuePostLoginModule(feature);
    toast.success(`Après connexion : ${feature.hint}`);
    document.getElementById('login')?.focus();
  };

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
    <main className="flex min-h-dvh flex-col bg-[#fff8ef] text-[#063321] lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:overflow-hidden">
      <div className="relative z-10 flex min-h-dvh flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
          <div className="inline-flex items-center rounded-2xl border border-[#d6e3d8] bg-white px-4 py-2.5 shadow-sm">
            <img
              src={brandLogo}
              alt="Horizon Farm"
              className="h-9 w-auto object-contain sm:h-10"
            />
          </div>
        </header>

        <HorizonShowcase className="mx-4 mt-3 h-36 shrink-0 rounded-2xl border border-[#d6e3d8] shadow-md sm:mx-6 sm:h-44 lg:hidden" />

        <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 px-4 py-4 sm:px-6 lg:max-w-none lg:px-8 lg:py-2 xl:max-w-xl">
          <div>
            <h1 className="sr-only">Horizon Farm ERP</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c9851a] lg:hidden">
              De la terre à l&apos;horizon
            </p>
            <p className="mt-1 text-2xl font-black leading-tight text-[#063321] sm:text-3xl lg:mt-0 lg:text-[1.85rem] xl:text-[2.1rem]">
              Votre ferme,{' '}
              <span className="text-[#c9851a]">pilotée jusqu&apos;à l&apos;horizon.</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-[#2f4a3a] sm:text-base">
              Horizon Farm centralise vos filières, vos chiffres et vos décisions du quotidien.
            </p>
            <ul className="mt-3 space-y-2">
              {HIGHLIGHTS.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-[#2f4a3a]">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#1f7a2f]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-[#d6e3d8] bg-white p-5 shadow-lg shadow-[#063321]/5 sm:p-6"
          >
            <div className="mb-4 text-center">
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
        </section>

        <footer className="shrink-0 bg-[#063321] px-4 py-4 sm:px-6 lg:px-8 lg:py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 lg:hidden">
            Découvrir l&apos;ERP — glissez
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {FEATURES.map((feature) => (
              <PillarCard
                key={feature.title}
                feature={feature}
                onSelect={handlePillarClick}
                className="min-w-[82%] shrink-0 snap-center border border-white/10 bg-white/5 p-3 sm:min-w-[48%] lg:min-w-0 lg:border-0 lg:bg-transparent lg:p-2"
              />
            ))}
          </div>
        </footer>
      </div>

      <HorizonShowcase className="hidden lg:block lg:min-h-0" />
    </main>
  );
}
