import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROUTE_TO_MODULE } from '../config/modules.config';
import { DEPRECATED_MODULE_ALIASES, resolveActiveModuleId } from '../config/moduleEntryPoints';
import { normalizeErpRole } from '../config/erpRoles.js';
import { supabase } from '../lib/supabase';
import { applyDefaultDataModeForRole } from '../utils/uiPreferences';

const AuthContext = createContext(null);

const LOGIN_ALIASES = {
  penda: 'penda@horizonfarm.app',
};
const PROFILES_TABLE_ENABLED = import.meta.env.VITE_ENABLE_PROFILES_TABLE === 'true';
const LOCAL_PREVIEW_ENABLED = Boolean(
  import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('demo') === '1',
);
const LOCAL_PREVIEW_USER = Object.freeze({
  id: 'local-preview-user',
  email: 'preview@horizonfarm.local',
  user_metadata: Object.freeze({ name: 'Aperçu local', role: 'admin_support', status: 'active' }),
});
const LOCAL_PREVIEW_PROFILE = Object.freeze({
  id: LOCAL_PREVIEW_USER.id,
  email: LOCAL_PREVIEW_USER.email,
  full_name: 'Aperçu local',
  role: 'admin_support',
  status: 'active',
  company_id: null,
  permissions: Object.freeze({}),
  source: 'local_preview',
});

const LEGACY_KEYS_BY_GRAND_MODULE = Object.entries(ROUTE_TO_MODULE).reduce((acc, [legacy, grand]) => {
  if (!acc[grand]) acc[grand] = [];
  acc[grand].push(legacy);
  return acc;
}, {});

export const ERP_MODULE_PERMISSIONS = [
  'dashboard',
  'assistant_erp',
  'centre_ia',
  'objectifs_croissance',
  'elevage',
  'agri_feeds',
  'commercial',
  'achats_stock',
  'finance_pilotage',
  'activite_suivi',
  'documents_rapports',
  'animaux',
  'avicole',
  'sante',
  'finances',
  'comptabilite',
  'investissements',
  'impact_business',
  'financements',
  'stock',
  'clients',
  'ventes',
  'fournisseurs',
  'tracabilite',
  'alertes',
  'sync',
  'sync_activity',
  'cultures',
  'documents',
  'taches',
  'rh',
  'rapports',
  'equipements',
  'smartfarm',
  'audit_logs',
  'gestion_systeme',
];

const CANONICAL_ROLE_PERMISSIONS = Object.freeze({
  promotrice_direction: Object.freeze(['*']),
  responsable_filiere: Object.freeze(ERP_MODULE_PERMISSIONS.filter((moduleId) => moduleId !== 'gestion_systeme')),
  terrain: Object.freeze([
    'dashboard', 'assistant_erp', 'elevage', 'cultures', 'achats_stock',
    'activite_suivi', 'documents_rapports', 'equipements', 'animaux', 'avicole',
    'sante', 'stock', 'tracabilite', 'documents', 'taches', 'alertes',
  ]),
  finance: Object.freeze([
    'dashboard', 'assistant_erp', 'centre_decisionnel', 'objectifs_croissance',
    'commercial', 'achats_stock', 'finance_pilotage', 'documents_rapports',
    'financements', 'finances', 'comptabilite', 'investissements', 'clients',
    'ventes', 'fournisseurs', 'documents', 'rapports', 'audit_logs', 'alertes',
  ]),
  veterinaire: Object.freeze([
    'dashboard', 'assistant_erp', 'elevage', 'agri_feeds', 'activite_suivi',
    'documents_rapports', 'animaux', 'avicole', 'sante', 'stock', 'tracabilite',
    'alertes', 'documents', 'taches',
  ]),
  maintenance: Object.freeze([
    'dashboard', 'assistant_erp', 'activite_suivi', 'documents_rapports',
    'equipements', 'smartfarm', 'stock', 'documents', 'taches', 'alertes',
  ]),
  financeur_externe: Object.freeze(['dashboard', 'financements', 'documents_rapports', 'rapports']),
  admin_support: Object.freeze(['*']),
});

export const ROLE_PERMISSIONS = Object.freeze({
  ...CANONICAL_ROLE_PERMISSIONS,
  admin: CANONICAL_ROLE_PERMISSIONS.admin_support,
  manager: CANONICAL_ROLE_PERMISSIONS.promotrice_direction,
  employe: CANONICAL_ROLE_PERMISSIONS.terrain,
  comptable: CANONICAL_ROLE_PERMISSIONS.finance,
  responsable_agri_feeds: CANONICAL_ROLE_PERMISSIONS.responsable_filiere,
  technicien_elevage: CANONICAL_ROLE_PERMISSIONS.terrain,
  commercial: CANONICAL_ROLE_PERMISSIONS.responsable_filiere,
  lecteur_financeur: CANONICAL_ROLE_PERMISSIONS.financeur_externe,
  visiteur: Object.freeze(['dashboard', 'assistant_erp']),
});

const resolveLogin = (login) => {
  const value = String(login || '').trim().toLowerCase();
  return LOGIN_ALIASES[value] || value;
};

const isMissingProfilesTableError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('public.profiles') || message.includes('schema cache') || message.includes('could not find the table') || message.includes('relation "public.profiles" does not exist');
};

const fallbackProfile = (user, defaults = {}) => ({
  id: user?.id || 'local-user',
  email: user?.email || defaults.email || '',
  full_name: defaults.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
  role: normalizeErpRole(defaults.role || user?.user_metadata?.role || 'visiteur', 'visiteur'),
  status: defaults.status || user?.user_metadata?.status || 'pending',
  company_id: defaults.company_id || user?.user_metadata?.company_id || null,
  permissions: defaults.permissions || {},
  source: 'auth_fallback',
});

async function upsertProfile(user, defaults = {}) {
  if (!user?.id) return null;
  if (!PROFILES_TABLE_ENABLED) return fallbackProfile(user, defaults);
  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: normalizeErpRole(defaults.role || user.user_metadata?.role || 'visiteur', 'visiteur'),
    status: defaults.status || 'pending',
    company_id: defaults.company_id || user.user_metadata?.company_id || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) {
    if (isMissingProfilesTableError(error)) return fallbackProfile(user, defaults);
    console.error('Erreur upsert profile', error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => (LOCAL_PREVIEW_ENABLED ? { user: LOCAL_PREVIEW_USER } : null));
  const [user, setUser] = useState(() => (LOCAL_PREVIEW_ENABLED ? LOCAL_PREVIEW_USER : null));
  const [profile, setProfile] = useState(() => (LOCAL_PREVIEW_ENABLED ? LOCAL_PREVIEW_PROFILE : null));
  const [loading, setLoading] = useState(() => !LOCAL_PREVIEW_ENABLED);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    const prof = await upsertProfile(authUser, { role: authUser.user_metadata?.role || 'visiteur' });
    setProfile(prof);
    return prof;
  }, []);

  useEffect(() => {
    if (LOCAL_PREVIEW_ENABLED) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user || null);
      if (data.session?.user) await loadProfile(data.session.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user || null);
      if (nextSession?.user) await loadProfile(nextSession.user);
      else setProfile(null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [loadProfile]);

  useEffect(() => {
    applyDefaultDataModeForRole(normalizeErpRole(profile?.role, 'visiteur'));
  }, [profile?.role]);

  const signIn = useCallback(async ({ email, password, login }) => {
    const resolvedEmail = resolveLogin(login || email);
    return supabase.auth.signInWithPassword({ email: resolvedEmail, password });
  }, []);

  const signUp = useCallback(async ({ email, password, metadata = {} }) => supabase.auth.signUp({
    email,
    password,
    options: { data: { ...metadata, role: normalizeErpRole(metadata.role, 'visiteur') } },
  }), []);

  const signOut = useCallback(async () => supabase.auth.signOut(), []);

  const hasModuleAccess = useCallback((moduleId) => {
    const role = normalizeErpRole(profile?.role || user?.user_metadata?.role || 'visiteur', 'visiteur');
    const allowed = ROLE_PERMISSIONS[role] || [];
    if (allowed.includes('*')) return true;
    const resolved = resolveActiveModuleId(ROUTE_TO_MODULE[moduleId] || moduleId);
    if (allowed.includes(resolved) || allowed.includes(moduleId)) return true;
    const anciensIds = Object.entries(DEPRECATED_MODULE_ALIASES)
      .filter(([, cible]) => cible === resolved)
      .map(([ancien]) => ancien);
    if (anciensIds.some((ancien) => allowed.includes(ancien))) return true;
    const legacyKeys = LEGACY_KEYS_BY_GRAND_MODULE[resolved] || [];
    return legacyKeys.some((key) => allowed.includes(key));
  }, [profile, user]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    canAccess: hasModuleAccess,
  }), [session, user, profile, loading, signIn, signUp, signOut, hasModuleAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
