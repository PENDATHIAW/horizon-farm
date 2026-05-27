import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import toast, { Toaster, useToasterStore } from 'react-hot-toast';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import { registerServiceWorker } from './services/pwa';
import './index.css';

registerServiceWorker();

function ToastGuard() {
  const { toasts } = useToasterStore();
  const seenRef = useRef(new Map());

  useEffect(() => {
    const now = Date.now();
    const visibleToasts = toasts.filter((item) => item.visible);
    const seen = seenRef.current;

    visibleToasts.forEach((item, index) => {
      const message = typeof item.message === 'string' ? item.message : '';
      const key = `${item.type || 'blank'}:${message}`;
      const lastSeenAt = seen.get(key) || 0;

      if (message && now - lastSeenAt < 2500) {
        toast.dismiss(item.id);
        return;
      }

      seen.set(key, now);

      if (index >= 3) {
        toast.dismiss(item.id);
      }
    });

    [...seen.entries()].forEach(([key, date]) => {
      if (now - date > 10000) seen.delete(key);
    });
  }, [toasts]);

  return null;
}

function RootRouter() {
  const { user, loading } = useAuth();
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isChatRoute = pathname === '/chat';

  if (!isChatRoute) return <App />;

  if (loading) return <ChatPage />;
  if (!user) return <LoginPage />;

  return <ChatPage />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <RootRouter />
        <ToastGuard />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#fffdf8',
              color: '#2f2415',
              border: '1px solid #d6c3a0',
              maxWidth: 'min(92vw, 420px)',
              fontSize: '14px',
              lineHeight: '1.45',
            },
            success: {
              iconTheme: { primary: '#b38b43', secondary: '#fffdf8' },
            },
          }}
        />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);
