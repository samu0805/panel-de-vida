-- Permisos de acceso para usuarios autenticados.
-- RLS sigue limitando cada fila a su dueño (user_id = auth.uid()).
-- El rol anónimo no recibe ningún permiso.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.email_classifications to authenticated;
grant select, insert, update, delete on public.daily_briefs to authenticated;
grant select, insert, update, delete on public.integrations to authenticated;

-- El cron usa la service_role (sin sesión de usuario).
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.email_classifications to service_role;
grant select, insert, update, delete on public.daily_briefs to service_role;
grant select, insert, update, delete on public.integrations to service_role;
