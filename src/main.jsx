import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import toast, { Toaster, useToasterStore } from 'react-hot-toast';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ChatPage from './pages/ChatPage';
import ChatLoginPage from './pages/ChatLoginPage';
import { registerServiceWorker } from './services/pwa';
import { initFormModalBridge } from './services/formModalManager';
import { installChunkLoadRecovery } from './utils/lazyWithRetry';
import './index.css';

registerServiceWorker();
installChunkLoadRecovery();
initFormModalBridge();

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
  if (!user) return <ChatLoginPage />;

  return <ChatPage />;
}

const root = createRoot(document.getElementById('root'));

root.render(
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
              background: 'var(--hf-card)',
              color: 'var(--hf-ink)',
              border: '1px solid var(--hf-line)',
              borderRadius: 'var(--hf-radius-card)',
              boxShadow: 'var(--hf-shadow-float)',
              maxWidth: 'min(92vw, 420px)',
              fontFamily: 'var(--hf-font-sans)',
              fontSize: 'var(--hf-text-body)',
              lineHeight: '1.45',
            },
            success: {
              iconTheme: { primary: 'var(--hf-positive)', secondary: 'var(--hf-positive-bg)' },
            },
          }}
        />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
