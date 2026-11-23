import type { CalEvent } from "@/lib/google/calendar";
import { addDays, dateKey, zonedToUtc } from "@/lib/time";

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 21;
export const MIN_FREE_MINUTES = 45;
export const TIGHT_GAP_MINUTES = 15;

export type TimelineItem =
  | { tipo: "evento"; evento: CalEvent; conflicto: boolean; margenCorto: boolean }
  | { tipo: "libre"; inicio: string; fin: string; minutos: number };

export type DayAgenda = {
  fecha: string;
  todoElDia: CalEvent[];
  items: TimelineItem[];
  reunionesMin: number;
  libreMin: number;
  conflictos: number;
};

const MIN = 60_000;

export function buildAgenda(days: string[], events: CalEvent[], now: Date): DayAgenda[] {
  const today = dateKey(now);

  return days.map((day) => {
    const timed = events
      .filter((e) => !e.todoElDia && dateKey(new Date(e.inicio)) === day)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

    const allDay = events.filter((e) => e.todoElDia && e.inicio <= day && day < e.fin);

    const winStart = zonedToUtc(day, WORK_START_HOUR);
    const winEnd = zonedToUtc(day, WORK_END_HOUR);
    let cursor = day === today ? new Date(Math.max(winStart.getTime(), now.getTime())) : winStart;

    const items: TimelineItem[] = [];
    let maxEnd = 0;
    let maxEndItem: Extract<TimelineItem, { tipo: "evento" }> | null = null;
    let busyMin = 0;
    let freeMin = 0;
    let conflicts = 0;

    for (const ev of timed) {
      const start = new Date(ev.inicio).getTime();
      const end = new Date(ev.fin).getTime();

      // Hueco libre antes de este evento.
      const gapEnd = Math.min(start, winEnd.getTime());
      const gapMin = (gapEnd - cursor.getTime()) / MIN;
      if (gapMin > MIN_FREE_MINUTES) {
        items.push({
          tipo: "libre",
          inicio: cursor.toISOString(),
          fin: new Date(gapEnd).toISOString(),
          minutos: gapMin,
        });
        freeMin += gapMin;
      }

      const overlaps = maxEndItem !== null && start < maxEnd;
      const tight =
        maxEndItem !== null && !overlaps && (start - maxEnd) / MIN < TIGHT_GAP_MINUTES;

      const item: Extract<TimelineItem, { tipo: "evento" }> = {
        tipo: "evento",
        evento: ev,
        conflicto: overlaps,
        margenCorto: tight,
      };
      if (overlaps && maxEndItem) {
        maxEndItem.conflicto = true;
        conflicts++;
      }
      items.push(item);

      // Minutos ocupados sin contar el solapamiento dos veces.
      busyMin += Math.max(0, end - Math.max(start, maxEnd)) / MIN;

      if (end > maxEnd) {
        maxEnd = end;
        maxEndItem = item;
      }
      if (end > cursor.getTime()) cursor = new Date(end);
    }

    const tailMin = (winEnd.getTime() - cursor.getTime()) / MIN;
    if (tailMin > MIN_FREE_MINUTES) {
      items.push({
        tipo: "libre",
        inicio: cursor.toISOString(),
        fin: winEnd.toISOString(),
        minutos: tailMin,
      });
      freeMin += tailMin;
    }

    return {
      fecha: day,
      todoElDia: allDay,
      items,
      reunionesMin: busyMin,
      libreMin: freeMin,
      conflictos: conflicts,
    };
  });
}

export function dayRange(startKey: string, count: number) {
  const days = Array.from({ length: count }, (_, i) => addDays(startKey, i));
  return {
    days,
    timeMin: zonedToUtc(days[0], 0),
    timeMax: zonedToUtc(addDays(days[count - 1], 1), 0),
  };
}
