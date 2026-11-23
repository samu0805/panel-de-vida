import { connection } from "next/server";
import { SendBriefButton } from "@/components/send-brief-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/data";
import { formatDayLabel } from "@/lib/time";

export async function BriefSection() {
  await connection();
  const { supabase, user } = await getSession();

  let last: { fecha: string; enviado: boolean } | null = null;
  if (user) {
    const { data } = await supabase
      .from("daily_briefs")
      .select("fecha, enviado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    last = data;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen matutino</CardTitle>
        <p className="text-xs text-muted-foreground">
          Se envía cada día a las 8:00 (hora de Hong Kong). Puedes probarlo ahora.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {last
            ? `Último resumen: ${formatDayLabel(last.fecha)} · ${last.enviado ? "enviado" : "no enviado"}`
            : "Aún no se ha generado ningún resumen."}
        </p>
        <SendBriefButton />
      </CardContent>
    </Card>
  );
}
