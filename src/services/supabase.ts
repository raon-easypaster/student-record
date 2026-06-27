import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isMockServer = 
  !import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project') ||
  supabaseUrl.includes('placeholder-project') ||
  supabaseAnonKey === 'placeholder-key';

if (isMockServer) {
  console.warn(
    'Supabase URL or Anon Key is missing. Operating in Mock/Local mode.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
