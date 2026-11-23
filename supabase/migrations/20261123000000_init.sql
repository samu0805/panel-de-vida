-- Panel de Vida: tablas iniciales con Row Level Security.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha_limite timestamptz,
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'hecha')),
  proyecto text,
  created_at timestamptz not null default now()
);

create table public.email_classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_thread_id text not null,
  categoria text not null check (categoria in ('responder_hoy', 'esperando_respuesta', 'informativo')),
  resumen_una_linea text,
  fecha_limite_detectada timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, gmail_thread_id)
);

create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  contenido_markdown text not null,
  enviado boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proveedor text not null,
  refresh_token_cifrado text,
  ultima_sincronizacion timestamptz,
  unique (user_id, proveedor)
);

create index tasks_user_fecha_idx on public.tasks (user_id, fecha_limite);
create index daily_briefs_user_fecha_idx on public.daily_briefs (user_id, fecha);

-- RLS: cada fila solo es visible y editable por su dueño.
alter table public.tasks enable row level security;
alter table public.email_classifications enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.integrations enable row level security;

create policy "tasks_owner" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "email_classifications_owner" on public.email_classifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "daily_briefs_owner" on public.daily_briefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "integrations_owner" on public.integrations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
