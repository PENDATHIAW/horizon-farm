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
        <div className="max-w-xl w-full rounded-3xl border border-urgent bg-white shadow-float p-6 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-urgent text-urgent flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <p className="text-xs uppercase tracking-normal text-urgent font-semibold">Erreur module</p>
          <h2 className="mt-2 text-2xl font-semibold text-earth">Le module {moduleName} a rencontré une erreur</h2>
          <p className="mt-2 text-sm text-slate">
            {chunkError
              ? 'Horizon Farm a détecté une version obsolète de l’application (cache navigateur). Purgez le cache puis rechargez.'
              : 'Horizon Farm évite la page blanche. Tu peux revenir au tableau de bord ou recharger ce module.'}
          </p>

          {isDev ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-2xl bg-earth p-4 text-left text-xs text-mist">
              {error?.stack || error?.message || String(error)}
            </pre>
          ) : null}

          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            {chunkError ? (
              <button
                type="button"
                onClick={() => purgeStalePwaCache({ reload: true })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-horizon px-4 py-2 text-sm font-semibold text-white hover:bg-horizon"
              >
                <RotateCcw size={16} />
                Purger cache et recharger
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-slate hover:bg-card"
            >
              <RotateCcw size={16} />
              Recharger le module
            </button>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-horizon px-4 py-2 text-sm font-semibold text-white hover:bg-horizon"
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
