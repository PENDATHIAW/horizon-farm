/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const LOGIN_ALIASES = {
  penda: 'penda@horizonfarm.app',
};

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'sante', 'finances', 'comptabilite', 'investissements', 'stock', 'clients', 'ventes', 'fournisseurs', 'tracabilite', 'sync_activity', 'cultures', 'documents', 'taches', 'rapports', 'equipements', 'smartfarm', 'audit_logs', 'gestion_systeme'],
  employe: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'stock', 'cultures', 'documents', 'taches', 'equipements', 'sync_activity'],
  veterinaire: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'sante', 'tracabilite'],
  comptable: ['dashboard', 'assistant_erp', 'finances', 'comptabilite', 'investissements', 'clients', 'ventes', 'fournisseurs', 'documents', 'rapports', 'audit_logs', 'sync_activity'],
  visiteur: ['dashboard', 'assistant_erp'],
};

const resolveLogin = (login) => {
  const value = String(login || '').trim().toLowerCase();
  return LOGIN_ALIASES[value] || value;
};

async function upsertProfile(user, defaults = {}) {
  if (!user?.id) return null;
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
  if (error && !String(error.message || '').toLowerCase().includes('does not exist')) throw error;
  return data || payload;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remember, setRemember] = useState(() => localStorage.getItem('horizon-farm-remember') !== 'false');

  const loadProfile = useCallback(async (user) => {
    if (!user?.id) { setProfile(null); return null; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error && !String(error.message || '').toLowerCase().includes('does not exist')) throw error;
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
      if (data.session?.user) await loadProfile(data.session.user).catch(() => null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession?.user) await loadProfile(nextSession.user).catch(() => null);
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
    if (data.user) await loadProfile(data.user);
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
    if (data.user) await upsertProfile(data.user, { full_name: fullName, role: safeRole, status: 'pending' });
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
    if (error) throw error;
    return data;
  }, []);

  const updateProfileRole = useCallback(async (profileId, patch = {}) => {
    const { data, error } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', profileId).select('*').maybeSingle();
    if (error) throw error;
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
  const canAccess = useCallback((moduleKey) => {
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.visiteur;
    return permissions.includes('*') || permissions.includes(moduleKey);
  }, [role]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
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
    [session, profile, role, loading, remember, signIn, signUp, signOut, resetPassword, inviteUser, updateProfileRole, loadProfile, canAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
