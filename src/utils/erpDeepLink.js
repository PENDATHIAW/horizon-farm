import { resolveRouteModule } from './commercialNavigation.js';

/** Construit une URL ERP avec module, onglet et mode démo. */
export function buildErpDeepLink({
  module,
  tab = null,
  demo = true,
  heyHorizon = null,
  extra = {},
} = {}) {
  const params = new URLSearchParams();
  if (demo) params.set('demo', '1');
  const resolved = module ? resolveRouteModule(module) : null;
  if (resolved) params.set('module', resolved);
  if (tab) params.set('tab', String(tab));
  if (heyHorizon) params.set('hey', String(heyHorizon));
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value != null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

/** Lit module / onglet / assistant depuis les query params de l'URL courante. */
export function parseErpDeepLinkFromSearch(search = '') {
  const params = new URLSearchParams(search || '');
  const module = params.get('module');
  if (!module) return null;
  return {
    module: resolveRouteModule(module),
    tab: params.get('tab') || null,
    heyHorizon: params.get('hey') || null,
    demo: params.get('demo') === '1' || params.get('simulated') === '1',
  };
}

/** Retire les clés de navigation de l'URL sans recharger la page. */
export function stripErpDeepLinkParamsFromUrl(href = '') {
  if (typeof window === 'undefined' && !href) return '';
  const url = new URL(href || window.location.href, 'http://local');
  ['module', 'tab', 'hey', 'action', 'focus', 'alert_id', 'entity_id'].forEach((key) => {
    url.searchParams.delete(key);
  });
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ''}${url.hash || ''}`;
}
