const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type MailThread = {
  id: string;
  asunto: string;
  remitente: string;
  fragmento: string;
  /** Instante del último mensaje del hilo */
  ultimoMensaje: string;
  ultimoEsMio: boolean;
  noLeido: boolean;
  prioritario: boolean;
  enlace: string;
};

type GMessage = {
  internalDate?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: { headers?: { name: string; value: string }[] };
};
type GThread = { id: string; messages?: GMessage[] };

async function gget<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gmail respondió ${res.status}`);
  return (await res.json()) as T;
}

/**
 * FILTRO OBLIGATORIO: toda búsqueda lleva GMAIL_QUERY_FILTER en el parámetro q.
 * Si la variable falta, no se lee nada (nunca se consulta la bandeja completa).
 */
function requiredFilter(): string {
  const f = process.env.GMAIL_QUERY_FILTER?.trim();
  if (!f) throw new Error("Falta GMAIL_QUERY_FILTER: no se leerá Gmail sin filtro");
  return f;
}

export function prioritySenders(): string[] {
  return (process.env.PRIORITY_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function listThreadIds(token: string, q: string, max: number): Promise<string[]> {
  const params = new URLSearchParams({ q, maxResults: String(max) });
  const data = await gget<{ threads?: { id: string }[] }>(token, `${BASE}/threads?${params}`);
  return (data.threads ?? []).map((t) => t.id);
}

function header(m: GMessage, name: string): string {
  return (
    m.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function getThread(token: string, id: string, senders: string[]): Promise<MailThread | null> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Subject"]) params.append("metadataHeaders", h);
  const t = await gget<GThread>(token, `${BASE}/threads/${id}?${params}`);
  const msgs = t.messages ?? [];
  const last = msgs[msgs.length - 1];
  if (!last || last.labelIds?.includes("DRAFT")) return null;

  const from = header(last, "From");
  return {
    id,
    asunto: decodeEntities(header(msgs[0], "Subject") || "(Sin asunto)"),
    remitente: from.replace(/<.*>/, "").replace(/"/g, "").trim() || from,
    fragmento: decodeEntities(last.snippet ?? "").slice(0, 300),
    ultimoMensaje: new Date(Number(last.internalDate ?? Date.now())).toISOString(),
    ultimoEsMio: Boolean(last.labelIds?.includes("SENT")),
    noLeido: msgs.some((m) => m.labelIds?.includes("UNREAD")),
    prioritario: senders.some((s) => from.toLowerCase().includes(s)),
    enlace: `https://mail.google.com/mail/u/0/#all/${id}`,
  };
}

const MAX_THREADS = 40;
const WAITING_DAYS = 3;

/**
 * Hilos relevantes, siempre dentro del filtro:
 *  - bandeja de las últimas 48 h cuyo último mensaje no es mío (sin responder / no leídos)
 *  - remitentes prioritarios de los últimos 7 días
 *  - enviados donde yo escribí el último mensaje hace más de 3 días
 */
export async function fetchCandidateThreads(token: string, now: Date): Promise<MailThread[]> {
  const filter = requiredFilter();
  const senders = prioritySenders();

  const queries: { q: string; max: number }[] = [
    { q: `(${filter}) in:inbox newer_than:2d`, max: 25 },
    { q: `(${filter}) in:sent newer_than:14d`, max: 20 },
  ];
  if (senders.length) {
    queries.push({
      q: `(${filter}) in:inbox newer_than:7d from:(${senders.join(" OR ")})`,
      max: 15,
    });
  }

  const idLists = await Promise.all(queries.map((x) => listThreadIds(token, x.q, x.max)));
  const ids = [...new Set(idLists.flat())].slice(0, MAX_THREADS);

  const threads = await Promise.all(
    ids.map((id) => getThread(token, id, senders).catch(() => null)),
  );

  const waitingCutoff = now.getTime() - WAITING_DAYS * 86_400_000;
  return threads
    .filter((t): t is MailThread => t !== null)
    .filter((t) =>
      t.ultimoEsMio
        ? new Date(t.ultimoMensaje).getTime() < waitingCutoff // esperando respuesta
        : true, // pendiente de mi respuesta
    )
    .sort((a, b) => b.ultimoMensaje.localeCompare(a.ultimoMensaje));
}
