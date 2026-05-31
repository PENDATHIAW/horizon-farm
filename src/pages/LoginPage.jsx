import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const brandLogo = '/brand-logo.png';
const farmBg = '/login-farm-bg.png';

const FEATURES = [
  { icon: Leaf, title: 'Vision claire', detail: 'Toutes vos données au même endroit.' },
  { icon: Bell, title: 'Maîtrise des risques', detail: 'Soyez alerté et prenez les bonnes décisions.' },
  { icon: TrendingUp, title: 'Croissance durable', detail: 'Des outils puissants pour développer votre ferme.' },
  { icon: Users, title: 'Tous vos élevages', detail: 'Bovins, volailles et plus encore, bien gérés.' },
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
    <main className="relative min-h-dvh overflow-hidden text-[#063321]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${farmBg})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#fff8ef]/92 via-[#fff8ef]/78 to-[#fff8ef]/35" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-[#063321]/55 via-transparent to-transparent" aria-hidden />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-14">
          <div className="max-w-xl">
            <img src={brandLogo} alt="Horizon Farm" className="mb-8 h-auto w-56 object-contain lg:w-64" />

            <h1 className="sr-only">Horizon Farm ERP</h1>
            <p className="text-4xl font-black leading-tight tracking-tight text-[#063321] md:text-5xl">
              Pilotez votre ferme.
            </p>
            <p className="mt-2 text-4xl font-black leading-tight tracking-tight text-[#c9851a] md:text-5xl">
              Anticipez vos risques.
            </p>
            <p className="mt-2 text-4xl font-black leading-tight tracking-tight text-[#063321] md:text-5xl">
              Développez votre croissance.
            </p>

            <p className="mt-6 max-w-lg text-base leading-7 text-[#2f4a3a] md:text-lg">
              Horizon Farm est votre centre de pilotage agricole pour gérer, analyser et faire grandir votre activité en toute sérénité.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/70 bg-white/95 p-7 shadow-2xl shadow-[#063321]/10 backdrop-blur-sm md:p-8"
            >
              <div className="mb-6 text-center">
                <span className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f5ea] text-[#1f7a2f]">
                  <Leaf size={22} />
                </span>
                <h2 className="font-serif text-3xl font-black text-[#063321]">
                  {mode === 'signup' ? 'Créer un compte' : 'Connexion'}
                </h2>
                <p className="mt-1 text-sm text-[#6b7f72]">
                  {mode === 'signup'
                    ? 'Rejoignez Horizon Farm en quelques étapes'
                    : 'Accédez à votre espace Horizon Farm'}
                </p>
              </div>

              {mode === 'signup' ? (
                <div className="mb-4">
                  <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[#063321]">
                    Nom complet
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] px-4 py-3 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="Nom et prénom"
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="mb-4">
                <label htmlFor="login" className="mb-2 block text-sm font-semibold text-[#063321]">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8aa393]" />
                  <input
                    id="login"
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
                    placeholder="votre@email.com"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#063321]">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8aa393]" />
                  <input
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border border-[#d6e3d8] bg-[#fafcf9] py-3 pl-11 pr-12 text-sm outline-none focus:border-[#1f7a2f] focus:ring-2 focus:ring-[#1f7a2f]/20"
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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {mode === 'login' ? (
                <div className="mb-5 flex items-center justify-between gap-3 text-sm">
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a2f] py-3.5 text-sm font-black text-white shadow-lg shadow-[#1f7a2f]/25 transition hover:bg-[#176226] disabled:opacity-60"
              >
                <Leaf size={18} />
                {loading ? 'Traitement…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e2ebe4]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8aa393]">ou</span>
                <div className="h-px flex-1 bg-[#e2ebe4]" />
              </div>

              <p className="mb-4 text-center text-sm text-[#5c6f64]">
                {mode === 'signup'
                  ? 'Déjà inscrit ? Connectez-vous à votre espace.'
                  : 'Nouveau sur Horizon Farm ? Créez votre compte en quelques étapes.'}
              </p>

              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1f7a2f] bg-white py-3 text-sm font-black text-[#1f7a2f] transition hover:bg-[#f3faf4]"
              >
                <UserPlus size={18} />
                {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
              </button>

              <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8aa393]">
                <Leaf size={14} className="text-[#1f7a2f]" />
                Horizon Farm · Votre ferme, notre priorité
              </p>
            </form>
          </div>
        </section>

        <footer className="bg-[#063321] px-5 py-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex gap-4 text-white">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm text-white/80">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
