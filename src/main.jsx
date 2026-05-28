import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ChatPage from './pages/ChatPage';
import ChatLoginPage from './pages/ChatLoginPage';
import { registerServiceWorker } from './services/pwa';
import './index.css';

registerServiceWorker();

function RootRouter() {
  const { user, loading } = useAuth();
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname !== '/chat') return <App />;
  if (loading) return <ChatPage />;
  return user ? <ChatPage /> : <ChatLoginPage />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <RootRouter />
        <Toaster position="top-right" />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);
