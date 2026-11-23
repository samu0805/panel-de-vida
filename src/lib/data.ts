import { cache } from "react";
import { dayRange } from "@/lib/agenda";
import { loadEmails } from "@/lib/emails";
import { fetchAllEvents } from "@/lib/events";
import { getAccessToken, markSynced } from "@/lib/google/tokens";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/tasks";
import { dateKey } from "@/lib/time";

/**
 * Datos compartidos por varias secciones de la página.
 * `cache` de React garantiza una sola consulta por petición,
 * aunque agenda, alertas y resumen los pidan a la vez.
 */

export const DATA_DAYS = 14;

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

const getToken = cache(async () => {
  const { supabase, user } = await getSession();
  if (!user) throw new Error("Sin sesión");
  return getAccessToken(supabase, user.id);
});

export const getEventsData = cache(async () => {
  const { supabase, user } = await getSession();
  if (!user) throw new Error("Sin sesión");
  const token = await getToken();
  const now = new Date();
  const { days, timeMin, timeMax } = dayRange(dateKey(now), DATA_DAYS);
  const events = await fetchAllEvents(token, timeMin, timeMax);
  await markSynced(supabase, user.id);
  return { now, days, events };
});

export const getEmailsData = cache(async () => {
  const { supabase, user } = await getSession();
  if (!user) throw new Error("Sin sesión");
  return loadEmails(supabase, user.id, await getToken(), new Date());
});

export const getTasksData = cache(async (): Promise<Task[]> => {
  const { supabase, user } = await getSession();
  if (!user) throw new Error("Sin sesión");
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .neq("estado", "hecha")
    .order("fecha_limite", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
});
