import { Component } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { purgeStalePwaCache } from '../services/pwa';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur module Horizon Farm', {
      module: this.props.moduleName,
      error,
      info,
    });
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    const { children, moduleName = 'module', onBackToDashboard } = this.props;

    if (!error) return children;

    const isDev = import.meta.env.DEV;
    const chunkError = isChunkLoadError(error);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-xl w-full rounded-3xl border border-red-200 bg-white shadow-xl p-6 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-500 font-black">Erreur module</p>
          <h2 className="mt-2 text-2xl font-black text-[#2f2415]">Le module {moduleName} a rencontré une erreur</h2>
          <p className="mt-2 text-sm text-[#7d6a4a]">
            {chunkError
              ? 'Horizon Farm a détecté une version obsolète de l’application (cache navigateur). Purgez le cache puis rechargez.'
              : 'Horizon Farm évite la page blanche. Tu peux revenir au tableau de bord ou recharger ce module.'}
          </p>

          {isDev ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-2xl bg-[#2f2415] p-4 text-left text-xs text-[#f8f5ef]">
              {error?.stack || error?.message || String(error)}
            </pre>
          ) : null}

          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            {chunkError ? (
              <button
                type="button"
                onClick={() => purgeStalePwaCache({ reload: true })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a96a] px-4 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"
              >
                <RotateCcw size={16} />
                Purger cache et recharger
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6c3a0] px-4 py-2 text-sm font-bold text-[#7d6a4a] hover:bg-[#fffdf8]"
            >
              <RotateCcw size={16} />
              Recharger le module
            </button>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a96a] px-4 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"
            >
              <Home size={16} />
              Retour dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
