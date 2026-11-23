export const TZ = process.env.APP_TIMEZONE ?? "Asia/Hong_Kong";

type Parts = Record<string, string>;

function parts(date: Date, tz: string): Parts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
}

/** Fecha "YYYY-MM-DD" de un instante, en la zona horaria dada. */
export function dateKey(date: Date, tz = TZ): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Instante UTC que corresponde a las hh:mm de ese día en la zona dada. */
export function zonedToUtc(key: string, hour: number, minute = 0, tz = TZ): Date {
  const [y, m, d] = key.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const p = parts(guess, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatTime(iso: string | Date, tz = TZ): string {
  return new Intl.DateTimeFormat("es", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDayLabel(key: string): string {
  return new Intl.DateTimeFormat("es", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${key}T12:00:00Z`));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}
