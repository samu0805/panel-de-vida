import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAgenda, type DayAgenda } from "@/lib/agenda";
import { getEventsData } from "@/lib/data";
import { NeedsReconnectError } from "@/lib/google/tokens";
import { formatDayLabel, formatDuration, formatTime } from "@/lib/time";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {children}
      <a href="/api/google/connect" className={buttonVariants({ size: "sm" })}>
        Conectar Google
      </a>
    </div>
  );
}

function minutesBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
}

function Day({ day, showLabel }: { day: DayAgenda; showLabel: boolean }) {
  const empty = day.items.length === 0 && day.todoElDia.length === 0;
  return (
    <section className="space-y-2">
      {showLabel && (
        <h3 className="text-sm font-semibold capitalize">{formatDayLabel(day.fecha)}</h3>
      )}
      {day.todoElDia.map((e) => (
        <p key={e.id} className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground">
          Todo el día · {e.titulo}
        </p>
      ))}
      {empty && <p className="text-sm text-muted-foreground">Sin eventos.</p>}
      <ol className="space-y-2">
        {day.items.map((item, i) =>
          item.tipo === "libre" ? (
            <li
              key={`libre-${i}`}
              className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
            >
              {formatTime(item.inicio)}–{formatTime(item.fin)} · Tiempo disponible (
              {formatDuration(item.minutos)})
            </li>
          ) : (
            <li
              key={item.evento.id}
              className={`rounded-md border px-3 py-2 ${
                item.conflicto ? "border-foreground bg-muted" : ""
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <a
                  href={item.evento.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {item.evento.titulo}
                </a>
                <span className="text-sm text-muted-foreground">
                  {formatTime(item.evento.inicio)}–{formatTime(item.evento.fin)} ·{" "}
                  {formatDuration(minutesBetween(item.evento.inicio, item.evento.fin))}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{item.evento.calendario}</span>
                {item.evento.enlaceVideo && (
                  <a
                    href={item.evento.enlaceVideo}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Videollamada
                  </a>
                )}
                {item.conflicto && (
                  <span className="font-medium text-foreground">⚠ Conflicto de horario</span>
                )}
                {item.margenCorto && (
                  <span className="font-medium text-foreground">
                    ⏱ Menos de 15 min desde el evento anterior
                  </span>
                )}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}

export async function AgendaSection({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  await connection();
  const { rango } = await searchParams;
  const count = rango === "7" ? 7 : 1;

  let agenda: DayAgenda[] | null = null;
  let failure: unknown = null;
  try {
    const { days, events, now } = await getEventsData();
    agenda = buildAgenda(days.slice(0, count), events, now);
  } catch (e) {
    failure = e;
  }

  let body: React.ReactNode = null;
  if (agenda) {
    body = (
      <div className="space-y-6">
        {agenda.map((d) => (
          <Day key={d.fecha} day={d} showLabel={count > 1} />
        ))}
      </div>
    );
  } else if (failure instanceof NeedsReconnectError) {
    body = (
      <Notice>
        <p>{failure.message}. Conéctala para ver tu agenda.</p>
      </Notice>
    );
  } else if (failure) {
    body = (
      <p className="text-sm text-muted-foreground">
        No se pudo cargar la agenda. Intenta recargar la página.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Agenda</CardTitle>
        <div className="flex gap-1">
          <Link
            href="/"
            className={buttonVariants({ variant: count === 1 ? "default" : "outline", size: "sm" })}
          >
            Hoy
          </Link>
          <Link
            href="/?rango=7"
            className={buttonVariants({ variant: count === 7 ? "default" : "outline", size: "sm" })}
          >
            7 días
          </Link>
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
