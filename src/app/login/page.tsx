import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginButton } from "./login-button";

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="text-sm text-destructive">
      No se pudo iniciar sesión. Intenta de nuevo.
    </p>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Panel de Vida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Acceso privado. Inicia sesión con tu cuenta de Google.
          </p>
          <Suspense>
            <ErrorMessage searchParams={searchParams} />
          </Suspense>
          <LoginButton />
        </CardContent>
      </Card>
    </main>
  );
}
