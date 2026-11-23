import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { generateAndSendBrief } from "@/lib/brief";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado, nadie entra
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  // Se valida CRON_SECRET en cada ejecución.
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Un solo usuario: el dueño de la integración de Google.
  const { data: integration } = await supabase
    .from("integrations")
    .select("user_id")
    .eq("proveedor", "google")
    .limit(1)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Aún no hay usuario conectado" }, { status: 409 });
  }

  try {
    const result = await generateAndSendBrief(supabase, integration.user_id, { skipIfSent: true });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/daily-brief]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Falló el resumen diario" }, { status: 500 });
  }
}
