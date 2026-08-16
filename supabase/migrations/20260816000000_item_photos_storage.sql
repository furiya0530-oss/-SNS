-- 備品写真を置く Storage バケット
--
-- 物件の内部が写る可能性があるため、バケットは非公開にして
-- 閲覧は署名付き URL 経由にする。
-- オブジェクトのパスは `<property_id>/<uuid>.<ext>` とし、
-- 先頭フォルダの物件を持っているユーザーだけが読み書きできる。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- items.photo_url には公開 URL ではなくこのバケット内のパスを入れる。
comment on column public.items.photo_url is
  'item-photos バケット内のオブジェクトパス (<property_id>/<uuid>.<ext>)。表示時に署名付き URL を発行する';

-- 先頭フォルダが物件 id として妥当かを見てからキャストする。
-- (uuid でない文字列をキャストするとエラーになるため)
create function public.storage_object_property_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[1]
         ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
    else null
  end
$$;

grant execute on function public.storage_object_property_id(text) to authenticated;

create policy "item_photos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'item-photos'
    and public.is_property_owner(public.storage_object_property_id(name))
  );

create policy "item_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-photos'
    and public.is_property_owner(public.storage_object_property_id(name))
  );

create policy "item_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'item-photos'
    and public.is_property_owner(public.storage_object_property_id(name))
  )
  with check (
    bucket_id = 'item-photos'
    and public.is_property_owner(public.storage_object_property_id(name))
  );

create policy "item_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'item-photos'
    and public.is_property_owner(public.storage_object_property_id(name))
  );
