import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccesoDenegadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Acceso denegado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta cuenta no tiene permiso para entrar a esta aplicación privada.
          </p>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              Probar con otra cuenta
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
