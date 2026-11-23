import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expected = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (searchParams.get("error") || !code || !state || state !== expected) {
    return NextResponse.redirect(`${origin}/?google=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const tokens = await exchangeCode(code);
  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${origin}/?google=sin_refresh_token`);
  }

  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: user.id,
      proveedor: "google",
      refresh_token_cifrado: encrypt(tokens.refresh_token),
      ultima_sincronizacion: null,
    },
    { onConflict: "user_id,proveedor" },
  );
  if (error) {
    console.error("[google/callback] No se pudo guardar la integración:", error.code, error.message);
    return NextResponse.redirect(`${origin}/?google=error_guardado`);
  }

  return NextResponse.redirect(`${origin}/?google=ok`);
}
