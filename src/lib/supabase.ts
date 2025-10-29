import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import config from '@/config';

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'mediscribe-auth-token',
      storage: window?.localStorage,
    },
  }
);
