// src/lib/auth.tsx
// Manages Client Portal Authentication and Active Client Session context
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ClientProfile } from '../types/client';

export interface ClientAccountDemo {
  client_id: string;
  client_code: string;
  client_name: string;
  email: string;
  defaultPassword?: string;
}

export const SEEDED_CLIENT_LOGINS: ClientAccountDemo[] = [
  {
    client_id: 'c0736c22-db5e-4bd1-b7f5-5facc08d865e',
    client_code: 'MAHE',
    client_name: 'Manipal Academy of Higher Education (MAHE)',
    email: 'mahe@client.lextria.in',
    defaultPassword: 'LextriaPortal!MAHE2026',
  },
  {
    client_id: '67008f3c-a990-4d96-9a88-7d04a76d97bc',
    client_code: 'PRS',
    client_name: 'PRS Neurosciences and Mechatronics Research Institute',
    email: 'prs@client.lextria.in',
    defaultPassword: 'LextriaPortal!PRS2026',
  },
  {
    client_id: '5a38d4f3-ef64-45c8-87d0-7f46ceb27421',
    client_code: 'CODEZ',
    client_name: 'CodeZyng Private Limited',
    email: 'codezyng@client.lextria.in',
    defaultPassword: 'LextriaPortal!CODEZ2026',
  },
  {
    client_id: '85be8aa2-26d5-4a37-8563-5857476706e5',
    client_code: 'LPLIG',
    client_name: 'Lightspeed Photonics Private Limited',
    email: 'lightspeed@client.lextria.in',
    defaultPassword: 'LextriaPortal!LPLIG2026',
  },
  {
    client_id: '9b2928b5-eca0-48ec-ba99-fb141419b2a6',
    client_code: 'CIRCL',
    client_name: 'Circlechess India Private Limited',
    email: 'circlechess@client.lextria.in',
    defaultPassword: 'LextriaPortal!CIRCL2026',
  },
];

interface AuthContextType {
  activeClient: ClientProfile | null;
  authUser: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const LOCAL_STORAGE_CLIENT_KEY = 'lextria_client_portal_active_client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<ClientProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLIENT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authUser, setAuthUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClientByUserId = async (user: any) => {
    try {
      const cid = user.user_metadata?.client_id;
      if (cid) {
        const { data, error } = await supabase
          .schema('core')
          .from('clients')
          .select('*')
          .eq('id', cid)
          .maybeSingle();

        if (data && !error) {
          setActiveClient(data);
          localStorage.setItem(LOCAL_STORAGE_CLIENT_KEY, JSON.stringify(data));
          return;
        }
      }

      // Fallback by user email
      if (user.email) {
        const { data: byEmail } = await supabase
          .schema('core')
          .from('clients')
          .select('*')
          .ilike('email', user.email)
          .maybeSingle();

        if (byEmail) {
          setActiveClient(byEmail);
          localStorage.setItem(LOCAL_STORAGE_CLIENT_KEY, JSON.stringify(byEmail));
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load client profile:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        loadClientByUserId(session.user).finally(() => setLoading(false));
      } else {
        setActiveClient(null);
        localStorage.removeItem(LOCAL_STORAGE_CLIENT_KEY);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        await loadClientByUserId(session.user);
      } else {
        setActiveClient(null);
        localStorage.removeItem(LOCAL_STORAGE_CLIENT_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        throw new Error(error.message || 'Invalid email or password.');
      }

      if (data?.user) {
        setAuthUser(data.user);
        await loadClientByUserId(data.user);
        return;
      }

      throw new Error('No user returned from authentication.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveClient(null);
    setAuthUser(null);
    localStorage.removeItem(LOCAL_STORAGE_CLIENT_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        activeClient,
        authUser,
        loading,
        signIn,
        signOut,
      }}
    >
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
