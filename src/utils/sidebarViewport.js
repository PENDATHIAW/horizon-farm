export const SIDEBAR_DESKTOP_QUERY = '(min-width: 768px)';

export function getInitialSidebarOpen(target = globalThis.window) {
  return typeof target?.matchMedia !== 'function'
    ? true
    : target.matchMedia(SIDEBAR_DESKTOP_QUERY).matches;
}

export function watchSidebarViewport(onChange, target = globalThis.window) {
  if (typeof target?.matchMedia !== 'function') return () => {};
  const media = target.matchMedia(SIDEBAR_DESKTOP_QUERY);
  const handleChange = (event) => onChange(event.matches);
  media.addEventListener?.('change', handleChange);
  return () => media.removeEventListener?.('change', handleChange);
}
