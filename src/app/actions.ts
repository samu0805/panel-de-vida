"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { generateAndSendBrief } from "@/lib/brief";
import { parseTask } from "@/lib/parse-task";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, PRIORIDADES, type Estado, type FormState, type Prioridad } from "@/lib/tasks";
import { zonedToUtc } from "@/lib/time";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sin sesión");
  return { supabase, user };
}

function endOfDay(dateKeyStr: string, hora: string | null): string {
  const [h, m] = (hora ?? "23:59").split(":").map(Number);
  return zonedToUtc(dateKeyStr, h, m).toISOString();
}

/** Crea una tarea desde una línea en lenguaje natural ("pagar luz el viernes"). */
export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const text = String(formData.get("texto") ?? "").trim().slice(0, 300);
  if (!text) return { id: randomUUID(), ok: false, mensaje: "Escribe una tarea." };

  let mensaje: string | null = null;
  let row: {
    titulo: string;
    descripcion: string | null;
    fecha_limite: string | null;
    prioridad: Prioridad;
    proyecto: string | null;
  };

  try {
    const p = await parseTask(text, new Date());
    row = {
      titulo: p.titulo,
      descripcion: p.descripcion,
      fecha_limite: p.fecha_limite ? endOfDay(p.fecha_limite, p.hora) : null,
      prioridad: p.prioridad,
      proyecto: p.proyecto,
    };
  } catch (e) {
    console.error("[tasks] No se pudo interpretar:", e instanceof Error ? e.message : e);
    // Respaldo: se guarda el texto tal cual para no perder lo escrito.
    row = { titulo: text, descripcion: null, fecha_limite: null, prioridad: "media", proyecto: null };
    mensaje = "No pude interpretar la fecha; se guardó sin fecha.";
  }

  const { error } = await supabase.from("tasks").insert({ user_id: user.id, ...row });
  if (error) {
    console.error("[tasks] insert:", error.message);
    return { id: randomUUID(), ok: false, mensaje: "No se pudo guardar la tarea." };
  }
  revalidatePath("/");
  return { id: randomUUID(), ok: true, mensaje };
}

/** Botón "Enviar resumen ahora": genera y envía el resumen de hoy, aunque ya se hubiera enviado. */
export async function sendBriefNow(): Promise<FormState> {
  const { supabase, user } = await requireUser();
  try {
    const r = await generateAndSendBrief(supabase, user.id, { skipIfSent: false });
    revalidatePath("/");
    return { id: randomUUID(), ok: r.ok, mensaje: r.message };
  } catch (e) {
    console.error("[brief] manual:", e instanceof Error ? e.message : e);
    return {
      id: randomUUID(),
      ok: false,
      mensaje: "No se pudo enviar el resumen. Revisa tus llaves de Resend y Anthropic.",
    };
  }
}

export async function setTaskStatus(id: string, estado: string): Promise<void> {
  const { supabase } = await requireUser();
  if (!ESTADOS.includes(estado as Estado)) return;
  await supabase.from("tasks").update({ estado }).eq("id", id);
  revalidatePath("/");
}

export async function removeTask(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("tasks").delete().eq("id", id);
  revalidatePath("/");
}

export async function editTask(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim().slice(0, 200);
  const fecha = String(formData.get("fecha") ?? "");
  const prioridad = String(formData.get("prioridad") ?? "media");
  if (!id || !titulo) return;

  await supabase
    .from("tasks")
    .update({
      titulo,
      prioridad: PRIORIDADES.includes(prioridad as Prioridad) ? prioridad : "media",
      fecha_limite: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? endOfDay(fecha, null) : null,
    })
    .eq("id", id);
  revalidatePath("/");
}
