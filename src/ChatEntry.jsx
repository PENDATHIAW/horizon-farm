import { Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import HorizonChatApp from './modules/HorizonChatApp';
import LoginPage from './pages/LoginPage';

export default function ChatEntry() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-white text-[#11351f] flex items-center justify-center"><p className="text-sm font-black text-[#6f8b73]">Ouverture de Horizon Chat...</p></div>;
  }

  if (!user) return <LoginPage />;

  return <ErrorBoundary resetKey="horizon-chat" moduleName="Horizon Chat"><Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-sm text-[#6f8b73]">Chargement du chat...</div>}><HorizonChatApp user={user} /></Suspense></ErrorBoundary>;
}
