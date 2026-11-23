import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: se salta RLS. Solo para el cron (sin sesión de usuario),
 * nunca en código que llegue al navegador. Siempre se filtra por user_id.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
