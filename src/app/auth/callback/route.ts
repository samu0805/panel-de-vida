import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(`${origin}/login?error=sin_codigo`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=sesion`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = process.env.ALLOWED_EMAIL?.toLowerCase();

  if (!user || !allowed || user.email?.toLowerCase() !== allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/acceso-denegado`);
  }

  return NextResponse.redirect(`${origin}/`);
}
