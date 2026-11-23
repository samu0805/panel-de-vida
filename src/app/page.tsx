import { Suspense } from "react";
import { AgendaSection } from "@/components/agenda-section";
import { AlertsSection } from "@/components/alerts-section";
import { BriefSection } from "@/components/brief-section";
import { ConnectionsSection } from "@/components/connections-section";
import { EmailsSection } from "@/components/emails-section";
import { TasksSection } from "@/components/tasks-section";
import { TodayLine } from "@/components/today-line";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function Loading({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-6 text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel de Vida</h1>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </header>

      <Suspense fallback={<Loading label="Preparando tu día…" />}>
        <TodayLine />
      </Suspense>

      <Suspense fallback={<Loading label="Cargando agenda…" />}>
        <AgendaSection searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<Loading label="Cargando correos…" />}>
        <EmailsSection />
      </Suspense>

      <Suspense fallback={<Loading label="Cargando tareas…" />}>
        <TasksSection />
      </Suspense>

      <Suspense fallback={<Loading label="Calculando alertas…" />}>
        <AlertsSection />
      </Suspense>

      <Suspense fallback={<Loading label="Cargando resumen…" />}>
        <BriefSection />
      </Suspense>

      <Suspense fallback={<Loading label="Cargando conexiones…" />}>
        <ConnectionsSection />
      </Suspense>
    </main>
  );
}
