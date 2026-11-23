import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que se pueden abrir sin sesión.
const PUBLIC_PATHS = ["/login", "/auth", "/acceso-denegado"];
// El cron se protege con CRON_SECRET, no con sesión.
const SECRET_PROTECTED = ["/api/cron"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (SECRET_PROTECTED.some((p) => path.startsWith(p))) return response;

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const allowed = process.env.ALLOWED_EMAIL?.toLowerCase();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && allowed && user.email?.toLowerCase() !== allowed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso-denegado";
    return NextResponse.redirect(url);
  }

  return response;
}
