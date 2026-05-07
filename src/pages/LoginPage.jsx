import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, LogIn, RotateCcw, User } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, resetPassword, remember, setRemember } = useAuth();
  const [login, setLogin] = useState('penda');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await signIn({ login, password });
      toast.success('Connexion reussie');
    } catch (error) {
      const message = error.message?.toLowerCase().includes('invalid login credentials')
        ? 'Login ou mot de passe incorrect. Verifie aussi que le user existe dans Supabase Auth.'
        : error.message || 'Connexion impossible';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(login);
      toast.success('Lien de reinitialisation envoye si le compte existe');
    } catch (error) {
      toast.error(error.message || 'Reset impossible');
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f2415] flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo variant="login" className="justify-center mb-5" />
          <h1 className="text-3xl font-black tracking-normal">Horizon Farm ERP</h1>
          <p className="mt-2 text-sm text-[#8a7456]">De la terre a l'horizon - ERP agricole securise</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#fffdf8] border border-[#e7d9be] rounded-xl p-6 shadow-xl shadow-[#d6c3a0]/20 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#9a7a43] mb-2">
              Login
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b39b78]" />
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                className="w-full bg-white border border-[#d6c3a0] rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-[#c9a96a] focus:ring-2 focus:ring-[#c9a96a]/20"
                placeholder="penda"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#9a7a43] mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b39b78]" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-white border border-[#d6c3a0] rounded-lg pl-10 pr-11 py-3 text-sm outline-none focus:border-[#c9a96a] focus:ring-2 focus:ring-[#c9a96a]/20"
                placeholder="Mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7456] hover:text-[#2f2415]"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#8a7456]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="accent-[#c9a96a]"
              />
              Rester connecte
            </label>
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-xs text-[#9a7a43] hover:text-[#2f2415] flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Reset mot de passe
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c9a96a] hover:bg-[#b89452] disabled:opacity-60 text-[#2f2415] font-bold rounded-lg py-3 flex items-center justify-center gap-2 transition-all"
          >
            <LogIn size={16} />
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}
