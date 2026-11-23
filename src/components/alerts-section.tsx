import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAgenda } from "@/lib/agenda";
import { computeAlerts } from "@/lib/alerts";
import { getEmailsData, getEventsData, getTasksData } from "@/lib/data";

export async function AlertsSection() {
  await connection();
  const [ev, em, tk] = await Promise.allSettled([getEventsData(), getEmailsData(), getTasksData()]);

  const alerts =
    ev.status === "fulfilled"
      ? computeAlerts({
          agenda: buildAgenda(ev.value.days, ev.value.events, ev.value.now),
          emails:
            em.status === "fulfilled" ? [...em.value.responderHoy, ...em.value.esperando] : null,
          tasks: tk.status === "fulfilled" ? tk.value : null,
          now: ev.value.now,
        })
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts === null ? (
          <p className="text-sm text-muted-foreground">
            Conecta Google para ver las alertas que cruzan calendario, correos y tareas.
          </p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alertas. Todo en orden.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="rounded-md border px-3 py-2 text-sm">
                {a.texto}
                {a.enlace && (
                  <>
                    {" "}
                    <a
                      href={a.enlace}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-muted-foreground"
                    >
                      Abrir
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
