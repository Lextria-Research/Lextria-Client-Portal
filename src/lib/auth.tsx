// src/lib/auth.tsx
// Manages Client Portal Authentication and Active Client Session context
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ClientProfile } from '../types/client';

export const PRESET_CLIENTS: ClientProfile[] = [
  {
    id: 'c0736c22-db5e-4bd1-b7f5-5facc08d865e',
    client_code: 'MAHE',
    client_name: 'Manipal Academy of Higher Education (MAHE)',
    entity_type: 'EDUCATIONAL_INSTITUTION',
    email: 'ipr.cell@manipal.edu',
    phone: '+91 820 2922400',
    gstin: '29AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    billing_address: 'Madhav Nagar, Manipal, Udupi, Karnataka 576104',
    state_code: '29',
  },
  {
    id: '67008f3c-a990-4d96-9a88-7d04a76d97bc',
    client_code: 'PRS',
    client_name: 'PRS Neurosciences and Mechatronics Research Institute Pvt. Ltd.',
    entity_type: 'STARTUP',
    email: 'info@prsneurosciences.com',
    phone: '+91 80 2345 6789',
    gstin: '29AABCP1234D1Z2',
    pan: 'AABCP1234D',
    billing_address: '12th Cross, Indiranagar, Bengaluru, Karnataka 560038',
    state_code: '29',
  },
  {
    id: '5a38d4f3-ef64-45c8-87d0-7f46ceb27421',
    client_code: 'CODEZ',
    client_name: 'CodeZyng Private Limited',
    entity_type: 'STARTUP',
    email: 'legal@codezyng.com',
    phone: '+91 80 4123 4567',
    gstin: '29AAACC5678E1Z9',
    pan: 'AAACC5678E',
    billing_address: 'HSR Layout Sector 4, Bengaluru, Karnataka 560102',
    state_code: '29',
  },
  {
    id: '85be8aa2-26d5-4a37-8563-5857476706e5',
    client_code: 'LPLIG',
    client_name: 'Lightspeed Photonics Private Limited',
    entity_type: 'STARTUP',
    email: 'contact@lightspeedphotonics.com',
    phone: '+91 80 8765 4321',
    gstin: '29AABCL9876F1Z1',
    pan: 'AABCL9876F',
    billing_address: 'Koramangala 5th Block, Bengaluru, Karnataka 560095',
    state_code: '29',
  },
  {
    id: '9b2928b5-eca0-48ec-ba99-fb141419b2a6',
    client_code: 'CIRCL',
    client_name: 'Circlechess India Private Limited',
    entity_type: 'STARTUP',
    email: 'ops@circlechess.com',
    phone: '+91 80 3344 5566',
    gstin: '29AAACC1122G1Z3',
    pan: 'AAACC1122G',
    billing_address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
    state_code: '29',
  },
];

interface AuthContextType {
  activeClient: ClientProfile | null;
  authUser: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  selectPresetClient: (client: ClientProfile) => void;
  signOut: () => Promise<void>;
}

const LOCAL_STORAGE_CLIENT_KEY = 'lextria_client_portal_active_client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<ClientProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLIENT_KEY);
      return saved ? JSON.parse(saved) : PRESET_CLIENTS[0];
    } catch {
      return PRESET_CLIENTS[0];
    }
  });

  const [authUser, setAuthUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        // Resolve client_id if tied to metadata
        const cid = session.user.user_metadata?.client_id;
        if (cid) {
          loadClientById(cid);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user?.user_metadata?.client_id) {
        loadClientById(session.user.user_metadata.client_id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadClientById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .schema('core')
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data && !error) {
        setActiveClient(data);
        localStorage.setItem(LOCAL_STORAGE_CLIENT_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to load client profile:', err);
    }
  };

  const selectPresetClient = (client: ClientProfile) => {
    setActiveClient(client);
    localStorage.setItem(LOCAL_STORAGE_CLIENT_KEY, JSON.stringify(client));
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If demo email matches one of the preset clients
        const preset = PRESET_CLIENTS.find((p) => p.email?.toLowerCase() === email.toLowerCase());
        if (preset) {
          selectPresetClient(preset);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data?.user) {
        const cid = data.user.user_metadata?.client_id;
        if (cid) {
          await loadClientById(cid);
        }
      }
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
        selectPresetClient,
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
