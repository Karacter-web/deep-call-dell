// src/integrations/supabase/auth-middleware.ts
import { createMiddleware } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    `Missing Supabase environment variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. ` +
    `Ensure these are set in Vercel.`
  );
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next, context }) => {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error('Unauthorized: No valid session.');
    }

    return next({
      context: {
        supabase,
        user: session.user,
        accessToken: session.access_token,
      },
    });
  }
);
