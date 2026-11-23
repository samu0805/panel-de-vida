"use client";

import { useState, useTransition } from "react";
import { editTask, removeTask, setTaskStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Estado, Prioridad } from "@/lib/tasks";

export type TaskView = {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  estado: Estado;
  proyecto: string | null;
  fechaKey: string | null;
  fechaTexto: string | null;
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  hecha: "Hecha",
};

export function TaskRow({ task }: { task: TaskView }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="rounded-md border p-3">
        <form
          action={async (fd) => {
            await editTask(fd);
            setEditing(false);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="id" value={task.id} />
          <Input name="titulo" defaultValue={task.titulo} required maxLength={200} />
          <div className="flex flex-wrap gap-2">
            <Input type="date" name="fecha" defaultValue={task.fechaKey ?? ""} className="w-auto" />
            <select
              name="prioridad"
              defaultValue={task.prioridad}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Guardar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`rounded-md border px-3 py-2 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{task.titulo}</p>
          <p className="text-xs text-muted-foreground">
            Prioridad {task.prioridad}
            {task.fechaTexto ? ` · ${task.fechaTexto}` : ""}
            {task.proyecto ? ` · ${task.proyecto}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <select
            aria-label="Estado"
            value={task.estado}
            disabled={pending}
            onChange={(e) => startTransition(() => setTaskStatus(task.id, e.target.value))}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            {(Object.keys(ESTADO_LABEL) as Estado[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (window.confirm("¿Eliminar esta tarea?")) startTransition(() => removeTask(task.id));
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </li>
  );
}
