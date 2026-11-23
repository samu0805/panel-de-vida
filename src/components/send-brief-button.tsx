"use client";

import { useState, useTransition } from "react";
import { sendBriefNow } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function SendBriefButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const r = await sendBriefNow();
            setMessage(r.mensaje);
          })
        }
      >
        {pending ? "Generando y enviando…" : "Enviar resumen ahora"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
