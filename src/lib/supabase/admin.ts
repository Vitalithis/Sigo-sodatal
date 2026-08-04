import { createClient } from '@supabase/supabase-js';

// SOLO usar dentro de Server Actions / Route Handlers.
// SUPABASE_SERVICE_ROLE_KEY nunca debe exponerse al cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}