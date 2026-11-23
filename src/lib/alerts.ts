import type { DayAgenda } from "@/lib/agenda";
import type { EmailItem } from "@/lib/emails";
import { ESTIMATED_MINUTES, type Task } from "@/lib/tasks";
import { dateKey, formatDayLabel, formatDuration, formatTime } from "@/lib/time";

export type Alerta = {
  tipo: "correo_sin_evento" | "reunion_sin_info" | "tarea_sin_tiempo" | "dia_sobrecargado";
  texto: string;
  enlace?: string;
};

export const OVERLOAD_MINUTES = 6 * 60;

/**
 * Cruza agenda, correos y tareas.
 * `agenda[0]` debe ser el día de hoy; `emails` y `tasks` pueden faltar
 * si esa fuente no está disponible.
 */
export function computeAlerts(input: {
  agenda: DayAgenda[];
  emails: EmailItem[] | null;
  tasks: Task[] | null;
  now: Date;
}): Alerta[] {
  const { agenda, emails, tasks, now } = input;
  const out: Alerta[] = [];
  const today = agenda[0];
  if (!today) return out;
  const todayKey = today.fecha;

  // 1. Correos con una fecha que no existe en el calendario.
  for (const m of emails ?? []) {
    const f = m.fechaLimite;
    if (!f || f < todayKey) continue;
    const day = agenda.find((d) => d.fecha === f);
    if (!day) continue; // fuera del rango consultado
    const hasSomething = day.items.some((i) => i.tipo === "evento") || day.todoElDia.length > 0;
    if (!hasSomething) {
      out.push({
        tipo: "correo_sin_evento",
        texto: `Un correo (“${m.resumen}”) menciona el ${formatDayLabel(f)}, pero no hay nada en tu calendario ese día.`,
        enlace: m.enlace,
      });
    }
  }

  // 2. Reuniones de hoy sin enlace ni descripción (una ubicación física cuenta como contexto).
  for (const item of today.items) {
    if (item.tipo !== "evento") continue;
    const e = item.evento;
    if (!e.enlaceVideo && !e.descripcion && !e.ubicacion) {
      out.push({
        tipo: "reunion_sin_info",
        texto: `“${e.titulo}” (${formatTime(e.inicio)}) no tiene enlace ni descripción.`,
        enlace: e.enlace,
      });
    }
  }

  // 3. Tareas que vencen hoy sin tiempo libre suficiente.
  const dueToday = (tasks ?? []).filter(
    (t) => t.fecha_limite && dateKey(new Date(t.fecha_limite)) === todayKey,
  );
  if (dueToday.length) {
    const needed = dueToday.reduce((s, t) => s + ESTIMATED_MINUTES[t.prioridad], 0);
    if (needed > today.libreMin) {
      out.push({
        tipo: "tarea_sin_tiempo",
        texto: `Hoy vencen ${dueToday.length} tarea(s) (~${formatDuration(needed)} de trabajo) y solo te quedan ${formatDuration(today.libreMin)} libres en la agenda.`,
      });
    }
  }

  // 4. Días de la semana con más de 6 horas de reuniones.
  for (const d of agenda.slice(0, 7)) {
    if (d.reunionesMin > OVERLOAD_MINUTES) {
      out.push({
        tipo: "dia_sobrecargado",
        texto: `${formatDayLabel(d.fecha)} tiene ${formatDuration(d.reunionesMin)} de reuniones.`,
      });
    }
  }

  // `now` se conserva en la firma para futuras reglas dependientes de la hora.
  void now;
  return out;
}
