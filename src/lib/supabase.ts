// src/lib/supabase.ts
// Central Supabase client for Lextria Unified Client Portal
// App identifier: 'CLIENT_PORTAL'

import { createClient } from '@supabase/supabase-js';

const centralUrl =
  import.meta.env.VITE_CENTRAL_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://eafciegebhuhoneypsqy.supabase.co';

const centralAnonKey =
  import.meta.env.VITE_CENTRAL_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwOTU1NTcsImV4cCI6MjEwNjY3MTU1N30.u1pqpPamztil2qaTaY7EahBaiWduVaQ3Wgu2_9CdJlg';

export const supabase = createClient(centralUrl, centralAnonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-lextria-app': 'CLIENT_PORTAL',
    },
  },
});

export const coreDb = supabase.schema('core');
export const financeDb = supabase.schema('finance');
export default supabase;
