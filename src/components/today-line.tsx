import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";
import { buildAgenda } from "@/lib/agenda";
import { getEventsData, getTasksData } from "@/lib/data";
import { sortTasks } from "@/lib/tasks";
import { dateKey, formatDuration } from "@/lib/time";

export async function TodayLine() {
  await connection();
  const [ev, tk] = await Promise.allSettled([getEventsData(), getTasksData()]);

  const parts: string[] = [];

  if (ev.status === "fulfilled") {
    const today = buildAgenda(ev.value.days.slice(0, 1), ev.value.events, ev.value.now)[0];
    const meetings = today.items.filter((i) => i.tipo === "evento").length;
    const reuniones =
      meetings === 0 ? "ninguna reunión" : meetings === 1 ? "1 reunión" : `${meetings} reuniones`;
    parts.push(`Hoy tienes ${reuniones} y ${formatDuration(today.libreMin)} libres`);
  }

  if (tk.status === "fulfilled") {
    const todayKey = dateKey(new Date());
    // La más importante entre las vencidas y las de hoy.
    const urgent = sortTasks(
      tk.value.filter((t) => t.fecha_limite && dateKey(new Date(t.fecha_limite)) <= todayKey),
    )[0];
    parts.push(
      urgent
        ? `tu tarea más importante es “${urgent.titulo}”`
        : "no tienes tareas vencidas ni para hoy",
    );
  }

  const text = parts.length
    ? `${parts.join(" y ")}.`
    : "Conecta Google y agrega tareas para ver tu día en una línea.";

  return (
    <Card>
      <CardContent className="py-4 text-lg font-medium">{text}</CardContent>
    </Card>
  );
}
