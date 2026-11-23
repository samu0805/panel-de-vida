"use client";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // sin almacenamiento: el cambio vale solo para esta visita
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} aria-label="Cambiar entre tema claro y oscuro">
      Claro / Oscuro
    </Button>
  );
}
