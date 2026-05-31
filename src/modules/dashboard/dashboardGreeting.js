const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

export function dashboardDisplayName(props = {}) {
  const user = props.user || props.currentUser || {};
  const raw = firstValue(
    props.displayUser,
    props.userName,
    props.username,
    user.user_metadata?.login,
    user.user_metadata?.name,
    user.email?.split('@')[0],
  );
  if (!raw) return 'Exploitant';
  const text = String(raw).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function dashboardGreetingPrefix(date = new Date()) {
  const hour = date.getHours();
  return hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';
}

export function dashboardGreeting(props = {}, date = new Date()) {
  return `${dashboardGreetingPrefix(date)} ${dashboardDisplayName(props)}`;
}
