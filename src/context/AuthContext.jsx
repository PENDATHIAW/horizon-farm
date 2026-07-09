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
    full_name: defaults.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: defaults.role || user.user_metadata?.role || 'visiteur',
    status: defaults.status || 'pending',
    company_id: defaults.company_id || user.user_metadata?.company_id || null,
    permissions: defaults.permissions || {},
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').maybeSingle();
  if (error) {
    if (isMissingProfilesTableError(error)) return fallbackProfile(user, defaults);
    throw error;
  }
  return data || payload;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profilesAvailable, setProfilesAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [remember, setRemember] = useState(() => localStorage.getItem('horizon-farm-remember') !== 'false');

  const loadProfile = useCallback(async (user) => {
    if (!user?.id) { setProfile(null); return null; }
    if (!PROFILES_TABLE_ENABLED) {
      setProfilesAvailable(false);
      const fallback = fallbackProfile(user, { role: user.user_metadata?.role || 'visiteur', status: user.user_metadata?.role === 'admin' ? 'active' : 'pending' });
      setProfile(fallback);
      return fallback;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) {
      if (isMissingProfilesTableError(error)) {
        setProfilesAvailable(false);
        const fallback = fallbackProfile(user, { role: user.user_metadata?.role || 'visiteur', status: user.user_metadata?.role === 'admin' ? 'active' : 'pending' });
        setProfile(fallback);
        return fallback;
      }
      throw error;
    }
    setProfilesAvailable(true);
    if (data) { setProfile(data); return data; }
    const created = await upsertProfile(user, { role: user.user_metadata?.role || 'visiteur', status: user.user_metadata?.role === 'admin' ? 'active' : 'pending' });
    setProfile(created);
    return created;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user) await loadProfile(data.session.user).catch((error) => {
        console.warn('Horizon Farm profile loading skipped:', error?.message || error);
        setProfile(fallbackProfile(data.session.user));
      });
      setLoading(false);
    }).catch((error) => {
      console.warn('Horizon Farm session loading skipped:', error?.message || error);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession?.user) await loadProfile(nextSession.user).catch((error) => {
        console.warn('Horizon Farm profile loading skipped:', error?.message || error);
        setProfile(fallbackProfile(nextSession.user));
      });
      else setProfile(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async ({ login, password }) => {
    const email = resolveLogin(login);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.setItem('horizon-farm-remember', remember ? 'true' : 'false');
    if (data.user) await loadProfile(data.user).catch(() => setProfile(fallbackProfile(data.user)));
    return data;
  }, [remember, loadProfile]);

  const signUp = useCallback(async ({ login, password, fullName = '', role = 'visiteur' }) => {
    const email = resolveLogin(login);
    const safeRole = ROLE_PERMISSIONS[role] ? role : 'visiteur';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { login, full_name: fullName, role: safeRole, status: 'pending' } },
    });
    if (error) throw error;
    if (data.user) await upsertProfile(data.user, { full_name: fullName, role: safeRole, status: 'pending' }).catch((profileError) => {
      if (!isMissingProfilesTableError(profileError)) throw profileError;
      setProfilesAvailable(false);
    });
    return data;
  }, []);

  const inviteUser = useCallback(async ({ email, fullName = '', role = 'visiteur' }) => {
    const safeRole = ROLE_PERMISSIONS[role] ? role : 'visiteur';
    const { data, error } = await supabase.from('profiles').insert({
      email: resolveLogin(email),
      full_name: fullName,
      role: safeRole,
      status: 'invited',
      permissions: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').maybeSingle();
    if (error) {
      if (isMissingProfilesTableError(error)) {
        setProfilesAvailable(false);
        return { id: `pending-${Date.now()}`, email: resolveLogin(email), full_name: fullName, role: safeRole, status: 'invited', source: 'local_pending' };
      }
      throw error;
    }
    return data;
  }, []);

  const updateProfileRole = useCallback(async (profileId, patch = {}) => {
    const { data, error } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', profileId).select('*').maybeSingle();
    if (error) {
      if (isMissingProfilesTableError(error)) {
        setProfilesAvailable(false);
        return { id: profileId, ...patch, source: 'local_pending' };
      }
      throw error;
    }
    return data;
  }, []);

  const resetPassword = useCallback(async (login) => {
    const email = resolveLogin(login);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const role = profile?.role || session?.user?.user_metadata?.role || 'visiteur';

  useEffect(() => {
    if (!loading && session?.user) applyDefaultDataModeForRole(role);
  }, [loading, session, role]);

  const canAccess = useCallback((moduleKey) => {
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.visiteur;
    if (permissions.includes('*') || permissions.includes(moduleKey)) return true;
    const legacyKeys = LEGACY_KEYS_BY_GRAND_MODULE[moduleKey] || [];
    return legacyKeys.some((key) => permissions.includes(key));
  }, [role]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      profilesAvailable,
      role,
      remember,
      setRemember,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      inviteUser,
      updateProfileRole,
      loadProfile,
      canAccess,
    }),
    [session, profile, profilesAvailable, role, loading, remember, signIn, signUp, signOut, resetPassword, inviteUser, updateProfileRole, loadProfile, canAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
