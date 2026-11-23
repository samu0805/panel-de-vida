import type { SupabaseClient } from "@supabase/supabase-js";
import { dayRange } from "@/lib/agenda";
import { loadEmails, type EmailsResult } from "@/lib/emails";
import { fetchAllEvents } from "@/lib/events";
import type { CalEvent } from "@/lib/google/calendar";
import { getAccessToken, markSynced, NeedsReconnectError } from "@/lib/google/tokens";
import type { Task } from "@/lib/tasks";
import { dateKey } from "@/lib/time";

export type Snapshot = {
  now: Date;
  days: string[];
  events: CalEvent[];
  emails: EmailsResult | null;
  tasks: Task[];
  /** true si Google no está conectado o el permiso caducó */
  googleOffline: boolean;
};

/** Reúne todos los datos del usuario sin depender de la sesión del navegador (sirve para el cron). */
export async function collectSnapshot(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
  daysCount = 14,
): Promise<Snapshot> {
  const { days, timeMin, timeMax } = dayRange(dateKey(now), daysCount);

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .neq("estado", "hecha");
  const tasks = (tasksData ?? []) as Task[];

  try {
    const token = await getAccessToken(supabase, userId);
    const events = await fetchAllEvents(token, timeMin, timeMax);
    await markSynced(supabase, userId);
    let emails: EmailsResult | null = null;
    try {
      emails = await loadEmails(supabase, userId, token, now);
    } catch {
      emails = null; // los correos fallidos no deben impedir el resumen
    }
    return { now, days, events, emails, tasks, googleOffline: false };
  } catch (e) {
    if (e instanceof NeedsReconnectError) {
      return { now, days, events: [], emails: null, tasks, googleOffline: true };
    }
    throw e;
  }
}
