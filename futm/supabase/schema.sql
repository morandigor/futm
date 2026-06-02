-- =============================================
-- FUTM — Schema Supabase
-- Cole isso no SQL Editor do Supabase
-- =============================================

-- PROFILES (criado automaticamente ao registrar)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  team text not null default 'Sem time',
  goals_today integer not null default 0,
  goals_season integer not null default 0,
  acertos integer not null default 0,
  erros integer not null default 0,
  attr_forca integer not null default 62,
  attr_prec integer not null default 70,
  attr_stam integer not null default 55,
  attr_refl integer not null default 48,
  drills_done text[] not null default '{}',
  money integer not null default 334000,
  vip_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Profiles são públicos para leitura"
  on public.profiles for select using (true);

create policy "Usuário edita apenas seu próprio perfil"
  on public.profiles for update using (auth.uid() = id);

create policy "Usuário insere apenas seu próprio perfil"
  on public.profiles for insert with check (auth.uid() = id);

-- AUTO-CREATE PROFILE ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, team)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'team', 'Sem time')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- MATCH HISTORY
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id) on delete cascade,
  goals integer not null default 0,
  acertos integer not null default 0,
  erros integer not null default 0,
  opponent text not null default 'Flamengo',
  score_home integer not null default 0,
  score_away integer not null default 0,
  result text not null default 'empate', -- 'vitoria' | 'derrota' | 'empate'
  played_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "Matches são públicos para leitura"
  on public.matches for select using (true);

create policy "Usuário insere apenas seus próprios matches"
  on public.matches for insert with check (auth.uid() = player_id);

-- RANKING VIEW (top 50 por gols na temporada)
create or replace view public.ranking_season as
  select
    p.username,
    p.team,
    p.goals_season,
    p.goals_today,
    row_number() over (order by p.goals_season desc) as position
  from public.profiles p
  order by p.goals_season desc
  limit 50;

-- INDEX para performance
create index if not exists profiles_goals_season_idx on public.profiles(goals_season desc);
create index if not exists matches_player_id_idx on public.matches(player_id);
