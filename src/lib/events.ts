import { eventKey, fetchEvents, type CalEvent } from "@/lib/google/calendar";
import { fetchIcsEvents } from "@/lib/ics";

/**
 * Eventos de Google Calendar + (opcional) el .ics del Tec leído directamente.
 *
 * - TEC_ICS_URL: URL de suscripción del Tec. Si falta, solo se usa Google.
 * - TEC_CALENDAR_NAME: nombre en Google del calendario que ese .ics reemplaza
 *   (Google lo sincroniza con retraso). Se omite solo si la lectura directa funcionó.
 */
export async function fetchAllEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalEvent[]> {
  const icsUrl = process.env.TEC_ICS_URL?.trim();
  const replaced = process.env.TEC_CALENDAR_NAME?.trim();

  let ics: CalEvent[] = [];
  let icsOk = false;
  if (icsUrl) {
    try {
      ics = await fetchIcsEvents(icsUrl, timeMin, timeMax, replaced || "Tec");
      icsOk = true;
    } catch (e) {
      // Nunca se registra la URL (es un secreto), solo el motivo.
      console.error("[ics] No se pudo leer el .ics del Tec:", e instanceof Error ? e.message : e);
    }
  }

  const google = await fetchEvents(accessToken, timeMin, timeMax, {
    excludeCalendarNames: icsOk && replaced ? [replaced] : [],
  });

  const seen = new Set<string>();
  const merged: CalEvent[] = [];
  for (const e of [...ics, ...google]) {
    const key = eventKey(e.uid, e.inicio);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  return merged.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
