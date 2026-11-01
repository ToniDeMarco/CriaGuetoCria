-- Cria Gueto Cria — estrutura do banco.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem perder dados.

create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null,
  year int,
  genre text,
  territory text,
  pages int,
  isbn text,
  drive_url text,
  cover_url text,
  synopsis text,
  created_at timestamptz not null default now()
);
alter table public.books add column if not exists cover_url text; -- para bancos criados antes da capa

create table if not exists public.contests (
  id text primary key,
  title text not null,
  status text not null default 'aberto' check (status in ('aberto', 'continuo', 'encerrado')),
  category text,
  deadline date,
  published_at date default current_date,
  excerpt text,
  cover_hue int,
  regulation text,
  created_at timestamptz not null default now()
);

-- Uma única linha (id = 1) com os canais da editora: Instagram, WhatsApp, YouTube, e-mail, cidade.
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

-- Quem pode editar o site. Ter conta no Supabase não basta: precisa estar aqui.
create table if not exists public.editors (
  user_id uuid primary key references auth.users on delete cascade
);

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.editors where user_id = auth.uid()) $$;

alter table public.books enable row level security;
alter table public.contests enable row level security;
alter table public.settings enable row level security;
alter table public.editors enable row level security; -- sem políticas: ninguém lê nem altera pela API

drop policy if exists "leitura publica" on public.books;
drop policy if exists "redacao edita" on public.books;
create policy "leitura publica" on public.books for select using (true);
create policy "redacao edita" on public.books for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "leitura publica" on public.contests;
drop policy if exists "redacao edita" on public.contests;
create policy "leitura publica" on public.contests for select using (true);
create policy "redacao edita" on public.contests for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "leitura publica" on public.settings;
drop policy if exists "redacao edita" on public.settings;
create policy "leitura publica" on public.settings for select using (true);
create policy "redacao edita" on public.settings for all to authenticated using (public.is_editor()) with check (public.is_editor());

grant select on public.books, public.contests, public.settings to anon, authenticated;
grant insert, update, delete on public.books, public.contests, public.settings to authenticated;
grant execute on function public.is_editor() to anon, authenticated;

-- Depois de criar a conta em Authentication > Users > Add user, libere o acesso dela
-- (troque o e-mail e rode só esta linha):
-- insert into public.editors (user_id) select id from auth.users where email = 'redacao@exemplo.org';
