# Panel de Vida

Aplicación web personal de **un solo usuario**: una página que junta tu calendario de Google, tu correo (solo del Tec), tus tareas y un resumen por correo cada mañana.

- **Solo lectura:** la app nunca envía, borra ni modifica correos ni eventos.
- **Stack:** Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, Supabase (Postgres, Auth, RLS), Google Calendar/Gmail API, Anthropic API, Resend y Vercel Cron.

## Cómo funciona

| Sección | Qué hace |
|---|---|
| Hoy en una línea | Reuniones, horas libres y tu tarea más importante |
| Agenda | Línea de tiempo de hoy o de 7 días, con conflictos, márgenes de menos de 15 min y bloques libres de más de 45 min. Lee **todos** los calendarios de `calendarList` (incluidos los suscritos) |
| Correos | Hilos recientes **dentro del filtro** `GMAIL_QUERY_FILTER`, clasificados con Claude y guardados para no reclasificar |
| Tareas | CRUD con captura en lenguaje natural ("pagar luz el viernes") |
| Alertas | Cruza correos, agenda y tareas |
| Resumen matutino | Cron diario que genera el resumen con Claude y lo envía con Resend |

## Instalación local

Requisitos: Node 20 o superior, npm y Git.

```powershell
npm install
copy .env.example .env.local   # luego rellena los valores (ver tabla)
npm run dev
```

Abre http://localhost:3000.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave anon/publishable de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave service_role/secret (**solo servidor**, la usa el cron) |
| `ALLOWED_EMAIL` | Único correo con acceso a la app |
| `APP_TIMEZONE` | Zona horaria, p. ej. `Asia/Hong_Kong` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth de Google Cloud |
| `GOOGLE_REDIRECT_URI` | `https://TU-DOMINIO/api/google/callback` (en local: `http://localhost:3000/api/google/callback`) |
| `ENCRYPTION_KEY` | 32 bytes en base64 para cifrar el refresh token. Genérala con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GMAIL_QUERY_FILTER` | Filtro obligatorio de Gmail, p. ej. `(from:tec.mx OR to:tu@tec.mx OR label:Tec)`. Si falta, no se lee nada |
| `PRIORITY_SENDERS` | (Opcional) remitentes prioritarios separados por coma |
| `ANTHROPIC_API_KEY` | Llave de la API de Anthropic |
| `ANTHROPIC_MODEL` | Modelo (por defecto `claude-sonnet-5-5`) |
| `RESEND_API_KEY` | Llave de Resend |
| `BRIEF_TO_EMAIL` | Correo que recibe el resumen |
| `BRIEF_FROM` | (Opcional) remitente; por defecto `Panel de Vida <onboarding@resend.dev>` |
| `CRON_SECRET` | Secreto largo y aleatorio que protege `/api/cron/daily-brief` |

## Configuración de Supabase

1. Crea un proyecto en https://supabase.com.
2. En **SQL Editor** ejecuta, en orden, los archivos de `supabase/migrations/`:
   1. `20261123000000_init.sql` (tablas y RLS)
   2. `20261123000100_grants.sql` (permisos de acceso para usuarios autenticados)
3. **Authentication → Sign In / Providers → Google:** actívalo con tu Client ID y Secret de Google.
4. **Authentication → URL Configuration:** en *Site URL* pon la URL de producción y en *Redirect URLs* agrega `https://TU-DOMINIO/**` y `http://localhost:3000/**`.

## Configuración de Google Cloud

1. Crea un proyecto y habilita **Google Calendar API** y **Gmail API**.
2. **Google Auth Platform → Branding/Audience:** tipo **Externo**, estado **Testing**, y agrega tu correo como **usuario de prueba**.
3. **Acceso a los datos:** agrega los scopes `calendar.readonly` y `gmail.readonly`.
4. **Clientes → Crear cliente → Aplicación web.**
   - Orígenes autorizados: `http://localhost:3000` y tu dominio de Vercel.
   - URI de redireccionamiento autorizados:
     - `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     - `http://localhost:3000/api/google/callback`
     - `https://TU-DOMINIO/api/google/callback`

### ¿Por qué la app se queda en modo "Testing"?

Los scopes de Gmail (`gmail.readonly`) son **restringidos**: para publicar la app a usuarios públicos, Google exige una **verificación** (revisión de la app y, normalmente, una evaluación de seguridad externa de pago). Como esta app es de uso personal y de un solo usuario, no tiene sentido pasar por ese proceso: en modo *Testing* funciona con los usuarios de prueba que agregues.

**Consecuencia importante:** en modo Testing el *refresh token* de Google **caduca a los 7 días**. Cuando eso pase, la tarjeta *Conexiones* mostrará "No conectado" y el resumen matutino te avisará. Solo pulsa **Reconectar**.

## Seguridad

- Permisos de Google **solo de lectura** (`calendar.readonly`, `gmail.readonly`).
- El refresh token se guarda **cifrado** (AES-256-GCM) en `integrations`, con RLS por `user_id`.
- Todas las tablas tienen **RLS**: cada fila solo es visible para su dueño.
- Gmail siempre se consulta con `GMAIL_QUERY_FILTER` en el parámetro `q`. El permiso de Google no se puede limitar por remitente, así que ese límite lo hace cumplir el código.
- `/api/cron/daily-brief` valida `CRON_SECRET` en **cada** ejecución.
- Ninguna llave vive en el código: todo está en variables de entorno.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En https://vercel.com → **Add New → Project**, importa el repositorio.
3. En **Environment Variables** carga todas las de la tabla (usa tu dominio real en `GOOGLE_REDIRECT_URI`).
4. **Deploy.**
5. Actualiza en Google Cloud, Supabase y `GOOGLE_REDIRECT_URI` el dominio de producción (ver arriba) y vuelve a desplegar.

### Hora del resumen (cron)

`vercel.json` programa `0 0 * * *` (UTC), que equivale a las **8:00 a. m. de Hong Kong** (UTC+8, sin horario de verano). Si cambias de zona horaria, convierte la hora a UTC y edita ese valor.

Vercel agrega automáticamente `Authorization: Bearer <CRON_SECRET>` a las llamadas del cron cuando `CRON_SECRET` está definido. En el plan Hobby el cron puede ejecutarse en cualquier momento dentro de la hora programada (no al minuto exacto).

Para probarlo a mano: usa el botón **Enviar resumen ahora** de la página.

## Comandos

```powershell
npm run dev     # desarrollo
npm run build   # compilación de producción
npx tsc --noEmit
npx eslint src
```

## Licencia

[MIT](LICENSE). Proyecto personal; úsalo como referencia con libertad.
