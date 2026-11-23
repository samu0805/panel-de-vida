import { addDays, dateKey } from "@/lib/time";

export type Prioridad = "alta" | "media" | "baja";
export type Estado = "pendiente" | "en_progreso" | "hecha";

export type Task = {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  prioridad: Prioridad;
  estado: Estado;
  proyecto: string | null;
  created_at: string;
};

export type FormState = { id: string; ok: boolean; mensaje: string | null };

export const PRIORIDADES: Prioridad[] = ["alta", "media", "baja"];
export const ESTADOS: Estado[] = ["pendiente", "en_progreso", "hecha"];

const RANK: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      RANK[a.prioridad] - RANK[b.prioridad] ||
      (a.fecha_limite ?? "9").localeCompare(b.fecha_limite ?? "9"),
  );
}

export type TaskGroups = {
  vencidas: Task[];
  hoy: Task[];
  proximos: Task[];
  sinFecha: Task[];
  masAdelante: number;
};

export function groupTasks(tasks: Task[], todayKey: string): TaskGroups {
  const limit = addDays(todayKey, 3);
  const g: TaskGroups = { vencidas: [], hoy: [], proximos: [], sinFecha: [], masAdelante: 0 };
  for (const t of sortTasks(tasks)) {
    if (!t.fecha_limite) {
      g.sinFecha.push(t);
      continue;
    }
    const key = dateKey(new Date(t.fecha_limite));
    if (key < todayKey) g.vencidas.push(t);
    else if (key === todayKey) g.hoy.push(t);
    else if (key <= limit) g.proximos.push(t);
    else g.masAdelante++;
  }
  return g;
}

/** Minutos estimados para completar una tarea, según su prioridad. */
export const ESTIMATED_MINUTES: Record<Prioridad, number> = { alta: 60, media: 30, baja: 15 };
