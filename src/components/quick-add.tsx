"use client";

import { useActionState } from "react";
import { createTask } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/tasks";

const initial: FormState = { id: "init", ok: true, mensaje: null };

export function QuickAdd() {
  const [state, action, pending] = useActionState(createTask, initial);

  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <Input
          key={state.id}
          name="texto"
          placeholder="Ej. pagar luz el viernes"
          maxLength={300}
          disabled={pending}
          autoComplete="off"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Agregar"}
        </Button>
      </div>
      {state.mensaje && <p className="text-xs text-muted-foreground">{state.mensaje}</p>}
    </form>
  );
}
