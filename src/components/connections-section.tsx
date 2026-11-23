import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatTime, formatDayLabel, dateKey } from "@/lib/time";

export async function ConnectionsSection() {
  await connection(); // contenido dependiente de la sesión: siempre en cada petición
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("proveedor, refresh_token_cifrado, ultima_sincronizacion")
    .eq("proveedor", "google")
    .maybeSingle();

  const connected = Boolean(data?.refresh_token_cifrado);
  const last = data?.ultima_sincronizacion
    ? `${formatDayLabel(dateKey(new Date(data.ultima_sincronizacion)))}, ${formatTime(data.ultima_sincronizacion)}`
    : "aún sin sincronizar";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexiones</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Google (Calendar y Gmail, solo lectura)</p>
          <p className="text-sm text-muted-foreground">
            {connected ? `Conectado · última sincronización: ${last}` : "No conectado"}
          </p>
        </div>
        <a
          href="/api/google/connect"
          className={buttonVariants({ variant: connected ? "outline" : "default", size: "sm" })}
        >
          {connected ? "Reconectar" : "Conectar Google"}
        </a>
      </CardContent>
    </Card>
  );
}
