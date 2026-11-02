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
      const meta = user.user_metadata || {};
      const cid = meta.client_id;
      let resolvedClient: ClientProfile | null = null;

      // 1. Try querying core.clients from DB
      if (cid) {
        try {
          const { data, error } = await supabase
            .schema('core')
            .from('clients')
            .select('*')
            .eq('id', cid)
            .maybeSingle();

          if (data && !error) {
            resolvedClient = data;
          }
        } catch (e) {
          console.warn('Direct core.clients lookup warning:', e);
        }
      }

      // 2. Try querying core.clients by email
      if (!resolvedClient && user.email) {
        try {
          const { data: byEmail } = await supabase
            .schema('core')
            .from('clients')
            .select('*')
            .ilike('email', user.email)
            .maybeSingle();

          if (byEmail) {
            resolvedClient = byEmail;
          }
        } catch (e) {
          console.warn('Email core.clients lookup warning:', e);
        }
      }

      // 3. Robust Metadata Resolution (Guarantees client portal access for any created/edited client)
      if (!resolvedClient && cid) {
        resolvedClient = {
          id: cid,
          client_code: meta.client_code || 'CLIENT',
          client_name: meta.client_name || user.email?.split('@')[0] || 'Client Portfolio',
          entity_type: meta.entity_type || 'COMPANY',
          email: user.email || meta.email || '',
          phone: meta.phone || null,
          gstin: meta.gstin || null,
          pan: meta.pan || null,
          billing_address: meta.billing_address || null,
          state_code: meta.state_code || null,
        };
      }

      // 4. Fallback: match seeded accounts by email
      if (!resolvedClient && user.email) {
        const seeded = SEEDED_CLIENT_LOGINS.find(
          (s) => s.email.toLowerCase() === user.email.toLowerCase()
        );
        if (seeded) {
          resolvedClient = {
            id: seeded.client_id,
            client_code: seeded.client_code,
            client_name: seeded.client_name,
            entity_type: 'COMPANY',
            email: seeded.email,
            phone: null,
            gstin: null,
            pan: null,
            billing_address: null,
            state_code: null,
          };
        }
      }

      if (resolvedClient) {
        setActiveClient(resolvedClient);
        localStorage.setItem(LOCAL_STORAGE_CLIENT_KEY, JSON.stringify(resolvedClient));
      }
    } catch (err) {
      console.warn('Failed to load client profile:', err);
      if (user.user_metadata?.client_id) {
        const fallbackClient: ClientProfile = {
          id: user.user_metadata.client_id,
          client_code: user.user_metadata.client_code || 'CLIENT',
          client_name: user.user_metadata.client_name || user.email || 'Client Portfolio',
          entity_type: user.user_metadata.entity_type || 'COMPANY',
          email: user.email || '',
          phone: null,
          gstin: null,
          pan: null,
          billing_address: null,
          state_code: null,
        };
        setActiveClient(fallbackClient);
        localStorage.setItem(LOCAL_STORAGE_CLIENT_KEY, JSON.stringify(fallbackClient));
      }
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
