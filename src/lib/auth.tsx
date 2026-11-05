// src/lib/auth.tsx
// Client Portal authentication.
//
// The active client is whatever /api/portal-data returns for the verified session.
// It is never derived in the browser from user_metadata (user-editable), from seeded
// constants, or from localStorage, so a user cannot point the portal at another client.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { fetchPortalData, clearPortalCache, PortalApiError } from './api';
import { ClientProfile } from '../types/client';

interface AuthContextType {
  activeClient: ClientProfile | null;
  authUser: User | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Remove the profile cache written by earlier builds.
try {
  localStorage.removeItem('lextria_client_portal_active_client');
} catch {
  /* storage unavailable */
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<ClientProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const resolveClient = useCallback(async (user: User | null) => {
    clearPortalCache();
    setAuthUser(user);
    if (!user) {
      setActiveClient(null);
      return;
    }
    try {
      const bundle = await fetchPortalData(true);
      setActiveClient(bundle.client);
      setAuthError(null);
    } catch (err) {
      setActiveClient(null);
      const msg = err instanceof Error ? err.message : 'Could not load your client profile.';
      setAuthError(msg);
      // A staff login or an unlinked account must not stay signed in to the portal.
      if (err instanceof PortalApiError && (err.status === 401 || err.status === 403)) {
        await supabase.auth.signOut();
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await resolveClient(session?.user ?? null);
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED does not change who the client is; avoid refetching on every refresh.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer: calling Supabase inside this callback can deadlock the auth lock.
        setTimeout(() => void resolveClient(session?.user ?? null), 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [resolveClient]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message || 'Invalid email or password.');
      if (!data?.user) throw new Error('No user returned from authentication.');

      const bundle = await fetchPortalData(true).catch(async (err) => {
        await supabase.auth.signOut();
        throw err;
      });
      setAuthUser(data.user);
      setActiveClient(bundle.client);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearPortalCache();
    setActiveClient(null);
    setAuthUser(null);
  };

  return (
    <AuthContext.Provider value={{ activeClient, authUser, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
