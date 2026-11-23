import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken } from "./oauth";

export class NeedsReconnectError extends Error {
  constructor(message = "Google necesita reconectarse") {
    super(message);
    this.name = "NeedsReconnectError";
  }
}

/**
 * Devuelve un access token fresco. Se renueva con el refresh token
 * antes de cada llamada a Google, así nunca se usa un token vencido.
 */
export async function getAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("integrations")
    .select("refresh_token_cifrado")
    .eq("user_id", userId)
    .eq("proveedor", "google")
    .maybeSingle();

  if (!data?.refresh_token_cifrado) throw new NeedsReconnectError("Google no está conectado");

  const refreshToken = decrypt(data.refresh_token_cifrado);
  const res = await refreshAccessToken(refreshToken);

  if (!res.access_token) {
    if (res.error === "invalid_grant") {
      // El token caducó (en modo Testing dura 7 días) o fue revocado.
      await supabase
        .from("integrations")
        .update({ refresh_token_cifrado: null })
        .eq("user_id", userId)
        .eq("proveedor", "google");
      throw new NeedsReconnectError("La conexión con Google caducó");
    }
    throw new Error(`No se pudo renovar el token de Google: ${res.error ?? "desconocido"}`);
  }

  return res.access_token;
}

export async function markSynced(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("integrations")
    .update({ ultima_sincronizacion: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("proveedor", "google");
}
