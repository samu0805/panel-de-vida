import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickAdd } from "@/components/quick-add";
import { TaskRow, type TaskView } from "@/components/task-row";
import { getTasksData } from "@/lib/data";
import { groupTasks, type Task } from "@/lib/tasks";
import { dateKey, formatDayLabel, formatTime } from "@/lib/time";

function toView(t: Task): TaskView {
  const key = t.fecha_limite ? dateKey(new Date(t.fecha_limite)) : null;
  const hasTime = t.fecha_limite && formatTime(t.fecha_limite) !== "23:59";
  return {
    id: t.id,
    titulo: t.titulo,
    prioridad: t.prioridad,
    estado: t.estado,
    proyecto: t.proyecto,
    fechaKey: key,
    fechaTexto: key ? `${formatDayLabel(key)}${hasTime ? `, ${formatTime(t.fecha_limite!)}` : ""}` : null,
  };
}

function Group({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {title} ({tasks.length})
      </h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada aquí.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={toView(t)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export async function TasksSection() {
  await connection();
  let tasks: Task[] | null = null;
  try {
    tasks = await getTasksData();
  } catch {
    tasks = null;
  }

  const groups = tasks ? groupTasks(tasks, dateKey(new Date())) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tareas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <QuickAdd />
        {groups ? (
          <>
            <Group title="Vencidas" tasks={groups.vencidas} />
            <Group title="Hoy" tasks={groups.hoy} />
            <Group title="Próximos 3 días" tasks={groups.proximos} />
            {groups.sinFecha.length > 0 && <Group title="Sin fecha" tasks={groups.sinFecha} />}
            {groups.masAdelante > 0 && (
              <p className="text-sm text-muted-foreground">
                Más adelante: {groups.masAdelante} tarea(s).
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No se pudieron cargar las tareas.</p>
        )}
      </CardContent>
    </Card>
  );
}
