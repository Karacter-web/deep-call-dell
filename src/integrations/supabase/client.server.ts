// src/integrations/supabase/client.server.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    `Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. ` +
    `Ensure these are set in Vercel.`
  );
}

// Server-side Supabase client (bypasses RLS, for admin operations)
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
