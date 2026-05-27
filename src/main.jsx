import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import toast, { Toaster, useToasterStore } from 'react-hot-toast';
import App from './App';
import ChatEntry from './ChatEntry';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
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

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
const RootApp = normalizedPath === '/chat' ? ChatEntry : App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <RootApp />
        <ToastGuard />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#ffffff',
              color: '#052e16',
              border: '1px solid #d1e5d1',
              maxWidth: 'min(92vw, 420px)',
              fontSize: '14px',
              lineHeight: '1.45',
            },
            success: {
              iconTheme: { primary: '#15803d', secondary: '#ffffff' },
            },
          }}
        />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);
