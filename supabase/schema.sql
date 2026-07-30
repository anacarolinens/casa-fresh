-- CasaFresh — schema completo (perfil, família, estoque, compras)
-- Cole no Supabase: SQL Editor → New query → Run
-- Se já tiveres corrido um schema antigo, apaga as tabelas antes ou cria um projeto novo.

-- ============================================================
-- TABELAS
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null default '',
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

create table public.households (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Minha casa',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

create table public.household_members (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique (household_id, user_id)
);

create table public.household_invites (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households on delete cascade not null,
  email text not null,
  invited_by uuid references auth.users on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz default now()
);

create table public.products (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households on delete cascade not null,
  created_by uuid references auth.users on delete set null,
  nome text not null,
  categoria text,
  quantidade numeric not null default 1,
  unidade text not null default 'Unidade',
  local text,
  data_compra date,
  data_validade date,
  imagem_url text,
  created_at timestamptz default now()
);

create table public.shopping_items (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households on delete cascade not null,
  created_by uuid references auth.users on delete set null,
  nome text not null,
  comprado boolean not null default false,
  product_id uuid references public.products on delete set null,
  created_at timestamptz default now()
);

create index household_invites_email_idx on public.household_invites (lower(email));
create index household_members_user_idx on public.household_members (user_id);
create index products_household_idx on public.products (household_id);
create index products_validade_idx on public.products (data_validade);

-- ============================================================
-- FUNÇÕES HELPER (RLS)
-- ============================================================
create or replace function public.user_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;

create or replace function public.is_household_admin(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.products enable row level security;
alter table public.shopping_items enable row level security;

-- profiles
create policy "Usuário vê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Membros da mesma casa veem perfis"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.household_members me
      join public.household_members other
        on me.household_id = other.household_id
      where me.user_id = auth.uid()
        and other.user_id = profiles.id
    )
  );

create policy "Usuário atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuário insere o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- households
create policy "Membros veem a própria casa"
  on public.households for select
  using (id in (select public.user_household_ids()));

create policy "Admin atualiza a casa"
  on public.households for update
  using (public.is_household_admin(id));

create policy "Utilizador cria casa"
  on public.households for insert
  with check (created_by = auth.uid());

-- household_members
create policy "Membros veem membros da casa"
  on public.household_members for select
  using (household_id in (select public.user_household_ids()));

create policy "Admin adiciona membros"
  on public.household_members for insert
  with check (public.is_household_admin(household_id) or user_id = auth.uid());

create policy "Admin remove membros"
  on public.household_members for delete
  using (
    public.is_household_admin(household_id)
    and user_id <> auth.uid()
  );

-- household_invites
create policy "Admin ou convidado vê convites"
  on public.household_invites for select
  using (
    public.is_household_admin(household_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Admin cria convites"
  on public.household_invites for insert
  with check (public.is_household_admin(household_id));

create policy "Admin ou convidado atualiza convite"
  on public.household_invites for update
  using (
    public.is_household_admin(household_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Admin revoga convites"
  on public.household_invites for delete
  using (public.is_household_admin(household_id));

-- products
create policy "Membros gerenciam produtos da casa"
  on public.products for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

-- shopping_items
create policy "Membros gerenciam lista de compras da casa"
  on public.shopping_items for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

-- ============================================================
-- ON CADASTRO: perfil + casa + membro admin + aceitar convites
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  has_invites boolean;
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.email
  );

  select exists (
    select 1
    from public.household_invites hi
    where lower(hi.email) = lower(new.email)
      and hi.status = 'pending'
  ) into has_invites;

  if has_invites then
    -- Convidado: entra nas casas partilhadas, sem criar casa vazia própria
    insert into public.household_members (household_id, user_id, role)
    select hi.household_id, new.id, 'member'
    from public.household_invites hi
    where lower(hi.email) = lower(new.email)
      and hi.status = 'pending'
    on conflict do nothing;

    update public.household_invites
    set status = 'accepted'
    where lower(email) = lower(new.email)
      and status = 'pending';
  else
    -- Utilizador sem convite: cria a própria casa
    insert into public.households (name, created_by)
    values (
      coalesce(nullif(new.raw_user_meta_data->>'nome', ''), 'Minha') || ' casa',
      new.id
    )
    returning id into new_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (new_household_id, new.id, 'admin');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Aceitar convite (utilizador já registado)
create or replace function public.accept_household_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.household_invites;
  user_email text;
begin
  select email into user_email from auth.users where id = auth.uid();

  select * into invite_row
  from public.household_invites
  where id = invite_id
    and status = 'pending'
    and lower(email) = lower(user_email);

  if invite_row.id is null then
    raise exception 'Convite inválido ou já usado';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (invite_row.household_id, auth.uid(), 'member')
  on conflict do nothing;

  update public.household_invites
  set status = 'accepted'
  where id = invite_id;
end;
$$;
