-- Storage para fotos dos produtos
-- Cole no SQL Editor do Supabase (Dashboard → SQL → New query) e clique Run

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Imagens de produtos são públicas" on storage.objects;
drop policy if exists "Membros fazem upload de imagens" on storage.objects;
drop policy if exists "Membros atualizam imagens da casa" on storage.objects;
drop policy if exists "Membros apagam imagens da casa" on storage.objects;

-- Leitura pública das imagens
create policy "Imagens de produtos são públicas"
on storage.objects for select
using (bucket_id = 'product-images');

-- Upload só para utilizadores autenticados, na pasta da sua casa
create policy "Membros fazem upload de imagens"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] in (
    select household_id::text from public.household_members where user_id = auth.uid()
  )
);

-- Atualizar/apagar só na pasta da própria casa
create policy "Membros atualizam imagens da casa"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] in (
    select household_id::text from public.household_members where user_id = auth.uid()
  )
);

create policy "Membros apagam imagens da casa"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] in (
    select household_id::text from public.household_members where user_id = auth.uid()
  )
);

-- ============================================================
-- Avatares de perfil
-- Se a tabela profiles já existir, execute também:
-- alter table public.profiles add column if not exists avatar_url text;
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatares são públicos" on storage.objects;
drop policy if exists "Utilizador faz upload do próprio avatar" on storage.objects;
drop policy if exists "Utilizador atualiza o próprio avatar" on storage.objects;
drop policy if exists "Utilizador apaga o próprio avatar" on storage.objects;

create policy "Avatares são públicos"
on storage.objects for select
using (bucket_id = 'profile-avatars');

create policy "Utilizador faz upload do próprio avatar"
on storage.objects for insert
with check (
  bucket_id = 'profile-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Utilizador atualiza o próprio avatar"
on storage.objects for update
using (
  bucket_id = 'profile-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Utilizador apaga o próprio avatar"
on storage.objects for delete
using (
  bucket_id = 'profile-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);


create category "fruteiras" for storage.objects;
using (category = 'fruteiras'); 

