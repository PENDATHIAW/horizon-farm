/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROUTE_TO_MODULE } from '../config/modules.config';
import { supabase } from '../lib/supabase';
import { applyDefaultDataModeForRole } from '../utils/uiPreferences';

const AuthContext = createContext(null);

const LOGIN_ALIASES = {
  penda: 'penda@horizonfarm.app',
};
const PROFILES_TABLE_ENABLED = import.meta.env.VITE_ENABLE_PROFILES_TABLE === 'true';

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
  'agri_feeds_bovinia',
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
  'investisseurs_forums',
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

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: ERP_MODULE_PERMISSIONS,
  employe: [
    'dashboard',
    'assistant_erp',
    'animaux',
    'avicole',
    'sante',
    'elevage',
    'agri_feeds',
    'agri_feeds_bovinia',
    'stock',
    'cultures',
    'documents',
    'taches',
    'equipements',
    'alertes',
    'sync',
    'sync_activity',
  ],
  veterinaire: [
    'dashboard',
    'assistant_erp',
    'animaux',
    'avicole',
    'sante',
    'elevage',
    'agri_feeds',
    'agri_feeds_bovinia',
    'tracabilite',
    'alertes',
    'documents',
    'taches',
    'sync_activity',
  ],
  comptable: [
    'dashboard',
    'assistant_erp',
    'sante',
    'finances',
    'comptabilite',
    'investissements',
    'impact_business',
    'agri_feeds',
    'agri_feeds_bovinia',
    'clients',
    'ventes',
    'fournisseurs',
    'documents',
    'rapports',
    'audit_logs',
    'alertes',
    'sync',
    'sync_activity',
  ],
  responsable_agri_feeds: [
    'dashboard',
    'assistant_erp',
    'centre_ia',
    'elevage',
    'agri_feeds',
    'agri_feeds_bovinia',
    'commercial',
    'achats_stock',
    'finance_pilotage',
    'documents_rapports',
    'animaux',
    'avicole',
    'stock',
    'clients',
    'ventes',
    'fournisseurs',
    'tracabilite',
    'alertes',
    'documents',
    'taches',
    'rapports',
    'equipements',
    'audit_logs',
    'sync_activity',
  ],
  technicien_elevage: [
    'dashboard',
    'assistant_erp',
    'elevage',
    'agri_feeds',
    'agri_feeds_bovinia',
    'animaux',
    'avicole',
    'sante',
    'stock',
    'tracabilite',
    'alertes',
    'documents',
    'taches',
    'equipements',
    'sync_activity',
  ],
  commercial: [
    'dashboard',
    'assistant_erp',
    'agri_feeds',
    'agri_feeds_bovinia',
    'commercial',
    'clients',
    'ventes',
    'stock',
    'documents',
    'taches',
    'alertes',
    'sync_activity',
  ],
  finance: [
    'dashboard',
    'assistant_erp',
    'agri_feeds',
    'agri_feeds_bovinia',
    'finance_pilotage',
    'finances',
    'comptabilite',
    'investissements',
    'clients',
    'ventes',
    'fournisseurs',
    'documents',
    'rapports',
    'audit_logs',
    'alertes',
    'sync_activity',
  ],
  lecteur_financeur: [
    'dashboard',
    'agri_feeds',
    'agri_feeds_bovinia',
    'finance_pilotage',
    'documents_rapports',
    'rapports',
    'audit_logs',
    'alertes',
  ],
  visiteur: ['dashboard', 'assistant_erp'],
};

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
  role: defaults.role || user?.user_metadata?.role || 'visiteur',
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
    role: defaults.role || user.user_metadata?.role || 'visiteur',
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
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
    applyDefaultDataModeForRole(profile?.role);
  }, [profile?.role]);

  const signIn = useCallback(async ({ email, password, login }) => {
    const resolvedEmail = resolveLogin(login || email);
    return supabase.auth.signInWithPassword({ email: resolvedEmail, password });
  }, []);

  const signUp = useCallback(async ({ email, password, metadata }) => supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  }), []);

  const signOut = useCallback(async () => supabase.auth.signOut(), []);

  const hasModuleAccess = useCallback((moduleId) => {
    const role = profile?.role || user?.user_metadata?.role || 'visiteur';
    const allowed = ROLE_PERMISSIONS[role] || [];
    if (allowed.includes('*')) return true;
    const resolved = ROUTE_TO_MODULE[moduleId] || moduleId;
    if (allowed.includes(resolved) || allowed.includes(moduleId)) return true;
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
