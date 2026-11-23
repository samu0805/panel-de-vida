import * as ical from "node-ical";
import { VIDEO_RE, type CalEvent } from "@/lib/google/calendar";

const MAX_BYTES = 5 * 1024 * 1024;

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "val" in v) return String((v as { val: unknown }).val ?? "");
  return "";
}

function localDateKey(d: Date): string {
  // node-ical crea los eventos "de todo el día" a medianoche local.
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Lee un calendario .ics directamente de su URL (suscripción del Tec),
 * sin esperar a que Google lo sincronice. Expande eventos repetidos y excepciones.
 * La URL es un secreto (quien la tiene ve el calendario): solo viene de una variable de entorno.
 */
export async function fetchIcsEvents(
  url: string,
  timeMin: Date,
  timeMax: Date,
  calendarName: string,
): Promise<CalEvent[]> {
  if (!/^https:\/\//i.test(url)) throw new Error("TEC_ICS_URL debe empezar con https://");

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "text/calendar, text/plain, */*" },
  });
  if (!res.ok) throw new Error(`El .ics respondió ${res.status}`);
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new Error("El .ics es demasiado grande");

  const data = ical.sync.parseICS(body);
  const out: CalEvent[] = [];

  for (const item of Object.values(data)) {
    if (!item || item.type !== "VEVENT") continue;
    const ev = item as ical.VEvent;
    if (ev.status === "CANCELLED") continue;

    let instances: ical.EventInstance[];
    try {
      instances = ical.expandRecurringEvent(ev, { from: timeMin, to: timeMax, expandOngoing: true });
    } catch {
      continue; // una regla rara no debe tumbar todo el calendario
    }

    for (const inst of instances) {
      const e = inst.event;
      if (e.status === "CANCELLED") continue;
      const start = new Date(inst.start);
      const end = new Date(inst.end ?? inst.start);
      const titulo = text(e.summary).trim() || "(Sin título)";
      const descripcion = text(e.description).trim() || null;
      const ubicacion = text(e.location).trim() || null;
      const uid = text(e.uid) || `${titulo}-${start.getTime()}`;

      let inicio: string;
      let fin: string;
      if (inst.isFullDay) {
        inicio = localDateKey(start);
        const endKey = localDateKey(end);
        fin = endKey > inicio ? endKey : localDateKey(new Date(start.getTime() + 86_400_000));
      } else {
        inicio = start.toISOString();
        fin = end.toISOString();
      }

      const video = `${ubicacion ?? ""} ${descripcion ?? ""}`.match(VIDEO_RE);
      out.push({
        id: `ics:${uid}:${inicio}`,
        uid,
        titulo,
        inicio,
        fin,
        todoElDia: inst.isFullDay,
        calendario: calendarName,
        enlaceVideo: video ? video[0] : null,
        descripcion,
        ubicacion,
        enlace: typeof e.url === "string" && e.url.startsWith("http") ? e.url : "https://calendar.google.com",
      });
    }
  }
  return out;
}
