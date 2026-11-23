import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmailsData } from "@/lib/data";
import type { EmailItem, EmailsResult } from "@/lib/emails";
import { NeedsReconnectError } from "@/lib/google/tokens";
import { formatDayLabel } from "@/lib/time";

function EmailCard({ item }: { item: EmailItem }) {
  return (
    <li className="rounded-md border px-3 py-2">
      <a
        href={item.enlace}
        target="_blank"
        rel="noreferrer"
        className="font-medium hover:underline"
      >
        {item.resumen}
      </a>
      <p className="mt-1 text-xs text-muted-foreground">
        {item.remitente} · {item.asunto}
        {item.fechaLimite ? ` · fecha detectada: ${formatDayLabel(item.fechaLimite)}` : ""}
      </p>
    </li>
  );
}

function Group({ title, items }: { title: string; items: EmailItem[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada pendiente.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <EmailCard key={i.id} item={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

export async function EmailsSection() {
  await connection();
  let result: EmailsResult | null = null;
  let failure: unknown = null;
  try {
    result = await getEmailsData();
  } catch (e) {
    failure = e;
  }

  let body: React.ReactNode = null;
  if (result) {
    body = (
      <div className="space-y-5">
        <Group title="Responder hoy" items={result.responderHoy} />
        <Group title="Esperando respuesta" items={result.esperando} />
        <p className="text-sm text-muted-foreground">
          Informativos: {result.informativos}
          {result.sinClasificar ? ` · Sin clasificar: ${result.sinClasificar}` : ""}
        </p>
        {result.error && <p className="text-sm text-muted-foreground">{result.error}</p>}
      </div>
    );
  } else if (failure instanceof NeedsReconnectError) {
    body = (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>{failure.message}.</p>
        <a href="/api/google/connect" className={buttonVariants({ size: "sm" })}>
          Conectar Google
        </a>
      </div>
    );
  } else if (failure) {
    body = (
      <p className="text-sm text-muted-foreground">
        No se pudieron cargar los correos. Intenta recargar la página.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correos</CardTitle>
        <p className="text-xs text-muted-foreground">
          Solo se leen correos del Tec (filtro fijo). Solo lectura.
        </p>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
