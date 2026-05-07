/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const LOGIN_ALIASES = {
  penda: 'penda@horizonfarm.app',
};

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: ['dashboard', 'animaux', 'avicole', 'sante', 'finances', 'comptabilite', 'investissements', 'stock', 'clients', 'ventes', 'fournisseurs', 'tracabilite', 'sync', 'cultures', 'documents', 'taches', 'rapports', 'equipements', 'smartfarm', 'audit_logs'],
  employe: ['dashboard', 'animaux', 'avicole', 'stock', 'cultures', 'documents', 'taches', 'equipements', 'sync'],
  veterinaire: ['dashboard', 'animaux', 'avicole', 'sante', 'tracabilite'],
  comptable: ['dashboard', 'finances', 'comptabilite', 'investissements', 'clients', 'ventes', 'fournisseurs', 'documents', 'rapports', 'audit_logs'],
};

const resolveLogin = (login) => {
  const value = String(login || '').trim().toLowerCase();
  return LOGIN_ALIASES[value] || value;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remember, setRemember] = useState(() => localStorage.getItem('horizon-farm-remember') !== 'false');

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async ({ login, password }) => {
    const email = resolveLogin(login);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.setItem('horizon-farm-remember', remember ? 'true' : 'false');
    return data;
  }, [remember]);

  const signUp = useCallback(async ({ login, password, role = 'admin' }) => {
    const email = resolveLogin(login);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { login, role } },
    });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (login) => {
    const email = resolveLogin(login);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const canAccess = useCallback((moduleKey) => {
    const role = session?.user?.user_metadata?.role || 'admin';
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes('*') || permissions.includes(moduleKey);
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      role: session?.user?.user_metadata?.role || 'admin',
      remember,
      setRemember,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      canAccess,
    }),
    [session, loading, remember, signIn, signUp, signOut, resetPassword, canAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
