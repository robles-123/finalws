import { createClient } from '@supabase/supabase-js';

// Try multiple env var names so this works with Vite or NEXT-style envs.
// Preferred: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Vite local envs)
// Fallback: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or anon key missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_... in your env).'
  );

  // Provide a safe placeholder so imports don't throw at module evaluation time.
  // Runtime calls will return an object shaped like the supabase client but
  // indicate an error so the app can handle it gracefully.
  const err = new Error('Supabase keys are missing in environment');
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: err }),
      signOut: async () => ({ error: err }),
    },
    // minimal placeholder for other common methods the app might call
    from: () => ({ select: async () => ({ data: null, error: err }) }),
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
export default supabase;
