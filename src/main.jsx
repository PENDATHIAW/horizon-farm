import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { registerServiceWorker } from './services/pwa';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#fffdf8',
              color: '#2f2415',
              border: '1px solid #d6c3a0',
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

