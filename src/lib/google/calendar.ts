const BASE = "https://www.googleapis.com/calendar/v3";

export type CalEvent = {
  id: string;
  uid: string;
  titulo: string;
  /** ISO con hora, o "YYYY-MM-DD" si es de todo el día */
  inicio: string;
  /** ISO con hora, o "YYYY-MM-DD" (exclusivo) si es de todo el día */
  fin: string;
  todoElDia: boolean;
  calendario: string;
  enlaceVideo: string | null;
  descripcion: string | null;
  ubicacion: string | null;
  enlace: string;
};

type GCalendar = { id: string; summary?: string; summaryOverride?: string; selected?: boolean; primary?: boolean; deleted?: boolean };

type GEvent = {
  id: string;
  iCalUID?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

async function gget<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Calendar respondió ${res.status}`);
  return (await res.json()) as T;
}

const VIDEO_RE = /https?:\/\/[^\s"<>]*(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com)[^\s"<>]*/i;

function videoLink(ev: GEvent): string | null {
  if (ev.hangoutLink) return ev.hangoutLink;
  const entry = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  if (entry?.uri) return entry.uri;
  const found = `${ev.location ?? ""} ${ev.description ?? ""}`.match(VIDEO_RE);
  return found ? found[0] : null;
}

/**
 * Trae los eventos de TODOS los calendarios de calendarList
 * (primario, suscritos como el del Tec, secundarios), no solo "primary".
 */
export async function fetchEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalEvent[]> {
  const list = await gget<{ items?: GCalendar[] }>(
    accessToken,
    `${BASE}/users/me/calendarList?maxResults=250`,
  );
  const calendars = (list.items ?? []).filter((c) => !c.deleted && (c.selected || c.primary));

  const perCalendar = await Promise.all(
    calendars.map(async (cal) => {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      try {
        const data = await gget<{ items?: GEvent[] }>(
          accessToken,
          `${BASE}/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        );
        return (data.items ?? []).map((ev) => ({ ev, cal }));
      } catch {
        return []; // un calendario con error no tumba a los demás
      }
    }),
  );

  const seen = new Set<string>();
  const out: CalEvent[] = [];
  for (const { ev, cal } of perCalendar.flat()) {
    if (ev.status === "cancelled") continue;
    if (ev.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
    const inicio = ev.start?.dateTime ?? ev.start?.date;
    const fin = ev.end?.dateTime ?? ev.end?.date;
    if (!inicio || !fin) continue;

    const uid = ev.iCalUID ?? ev.id;
    const dedupKey = `${uid}|${inicio}`;
    if (seen.has(dedupKey)) continue; // misma invitación en dos calendarios
    seen.add(dedupKey);

    out.push({
      id: `${cal.id}:${ev.id}`,
      uid,
      titulo: ev.summary?.trim() || "(Sin título)",
      inicio,
      fin,
      todoElDia: !ev.start?.dateTime,
      calendario: cal.summaryOverride ?? cal.summary ?? cal.id,
      enlaceVideo: videoLink(ev),
      descripcion: ev.description?.trim() || null,
      ubicacion: ev.location ?? null,
      enlace: ev.htmlLink ?? "https://calendar.google.com",
    });
  }
  return out.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
