import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyThreads, type Categoria, type Classification } from "@/lib/classify";
import { fetchCandidateThreads, type MailThread } from "@/lib/google/gmail";
import { dateKey } from "@/lib/time";

export type EmailItem = MailThread & {
  categoria: Categoria;
  resumen: string;
  fechaLimite: string | null;
};

export type EmailsResult = {
  responderHoy: EmailItem[];
  esperando: EmailItem[];
  informativos: number;
  sinClasificar: number;
  error: string | null;
};

type Row = {
  gmail_thread_id: string;
  categoria: Categoria;
  resumen_una_linea: string | null;
  fecha_limite_detectada: string | null;
  updated_at: string;
};

export async function loadEmails(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  now: Date,
): Promise<EmailsResult> {
  const threads = await fetchCandidateThreads(token, now);
  const ids = threads.map((t) => t.id);

  const { data: existing } = ids.length
    ? await supabase
        .from("email_classifications")
        .select("gmail_thread_id, categoria, resumen_una_linea, fecha_limite_detectada, updated_at")
        .eq("user_id", userId)
        .in("gmail_thread_id", ids)
    : { data: [] as Row[] };

  const byId = new Map<string, Row>((existing ?? []).map((r: Row) => [r.gmail_thread_id, r]));

  // Solo se clasifican hilos nuevos o con mensajes posteriores a la última clasificación.
  const pending = threads.filter((t) => {
    const row = byId.get(t.id);
    return !row || new Date(row.updated_at) < new Date(t.ultimoMensaje);
  });

  let error: string | null = null;
  if (pending.length) {
    try {
      const results: Classification[] = await classifyThreads(pending, dateKey(now));
      const rows = results
        .filter((c) => pending.some((t) => t.id === c.thread_id))
        .map((c) => ({
          user_id: userId,
          gmail_thread_id: c.thread_id,
          categoria: c.categoria,
          resumen_una_linea: c.resumen_una_linea,
          fecha_limite_detectada: c.fecha_limite_detectada,
          updated_at: now.toISOString(),
        }));
      if (rows.length) {
        await supabase.from("email_classifications").upsert(rows, {
          onConflict: "user_id,gmail_thread_id",
        });
        for (const r of rows) {
          byId.set(r.gmail_thread_id, {
            gmail_thread_id: r.gmail_thread_id,
            categoria: r.categoria,
            resumen_una_linea: r.resumen_una_linea,
            fecha_limite_detectada: r.fecha_limite_detectada,
            updated_at: r.updated_at,
          });
        }
      }
    } catch (e) {
      console.error("[emails] Falló la clasificación:", e instanceof Error ? e.message : e);
      error = "No se pudieron clasificar algunos correos (revisa tu saldo o llave de Anthropic).";
    }
  }

  const out: EmailsResult = {
    responderHoy: [],
    esperando: [],
    informativos: 0,
    sinClasificar: 0,
    error,
  };

  for (const t of threads) {
    const row = byId.get(t.id);
    // Reglas deterministas que mandan sobre el modelo.
    let categoria: Categoria | null = row?.categoria ?? null;
    if (t.ultimoEsMio) categoria = "esperando_respuesta";
    else if (t.prioritario) categoria = "responder_hoy";
    else if (categoria === "esperando_respuesta") categoria = "informativo";

    if (!categoria) {
      out.sinClasificar++;
      continue;
    }
    if (categoria === "informativo") {
      out.informativos++;
      continue;
    }
    const item: EmailItem = {
      ...t,
      categoria,
      resumen: row?.resumen_una_linea ?? t.asunto,
      // La columna es timestamptz ("2026-11-24T00:00:00+00:00"): se conserva solo la fecha.
      fechaLimite: row?.fecha_limite_detectada?.slice(0, 10) ?? null,
    };
    (categoria === "responder_hoy" ? out.responderHoy : out.esperando).push(item);
  }
  return out;
}
