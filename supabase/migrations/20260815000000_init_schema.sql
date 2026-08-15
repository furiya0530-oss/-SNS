-- 民泊備品管理アプリ 初期スキーマ
--
-- 方針:
--   * 認証は Supabase の auth.users を利用し、プロフィールは public.profiles に持つ
--   * すべてのテーブルで RLS を有効化し、ログインユーザーは
--     「自分が owner_id になっている物件」に紐づくデータだけを読み書きできる
--   * items / checklists / checklist_items / checklist_records /
--     checklist_record_details は物件を辿って所有者を判定する

-- =============================================================
-- 1. ENUM 型
-- =============================================================

-- 契約プラン。Stripe 連携時はこの値を service_role から更新する。
create type public.plan_type as enum ('free', 'pro');

-- チェックリストの各項目の結果。
create type public.checklist_status as enum ('ok', 'short', 'broken');

-- =============================================================
-- 2. テーブル
-- =============================================================

-- ---- profiles -----------------------------------------------
-- auth.users と 1:1。id は auth.users.id と同じ値を持つ。
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  plan public.plan_type not null default 'free',
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'auth.users に 1:1 で対応するプロフィール';
comment on column public.profiles.plan is
  'ユーザー本人は更新できない。Stripe の webhook から service_role で更新する';

-- ---- properties ---------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

comment on table public.properties is '民泊物件。所有者は owner_id で表す';

-- ---- items --------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  category text,
  quantity integer not null default 0 check (quantity >= 0),
  threshold integer not null default 0 check (threshold >= 0),
  photo_url text,
  updated_at timestamptz not null default now()
);

comment on table public.items is '物件ごとの備品と在庫数';
comment on column public.items.threshold is 'この数量を下回ったら補充が必要とみなす閾値';

-- ---- checklists ---------------------------------------------
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  -- checklist_records から (checklist_id, property_id) の複合外部キーで
  -- 参照するために必要。別物件のチェックリストで記録を作れなくなる。
  unique (id, property_id)
);

comment on table public.checklists is '清掃・点検などのチェックリスト定義';

-- ---- checklist_items ----------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  -- 備品と紐づかない確認項目 (例: 「鍵の返却を確認」) もあるので nullable。
  item_id uuid references public.items (id) on delete set null,
  label text not null,
  unique (id, checklist_id)
);

comment on table public.checklist_items is 'チェックリストの確認項目';

-- ---- checklist_records --------------------------------------
create table public.checklist_records (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null,
  property_id uuid not null references public.properties (id) on delete cascade,
  performed_by uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  performed_at timestamptz not null default now(),
  -- チェックリストと記録の物件が食い違わないように複合外部キーで縛る。
  foreign key (checklist_id, property_id)
    references public.checklists (id, property_id) on delete cascade
);

comment on table public.checklist_records is 'チェックリストを実施した記録 (ヘッダ)';

-- ---- checklist_record_details -------------------------------
create table public.checklist_record_details (
  id uuid primary key default gen_random_uuid(),
  checklist_record_id uuid not null
    references public.checklist_records (id) on delete cascade,
  checklist_item_id uuid not null
    references public.checklist_items (id) on delete cascade,
  status public.checklist_status not null,
  comment text,
  -- 1 回の記録で同じ項目が重複しないようにする。
  unique (checklist_record_id, checklist_item_id)
);

comment on table public.checklist_record_details is 'チェックリスト実施記録の明細 (項目ごとの結果)';

-- =============================================================
-- 3. インデックス (外部キー列には明示的に張る)
-- =============================================================

create index properties_owner_id_idx on public.properties (owner_id);
create index items_property_id_idx on public.items (property_id);
create index checklists_property_id_idx on public.checklists (property_id);
create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id);
create index checklist_items_item_id_idx on public.checklist_items (item_id);
create index checklist_records_checklist_id_idx on public.checklist_records (checklist_id);
create index checklist_records_property_id_idx on public.checklist_records (property_id);
create index checklist_records_performed_by_idx on public.checklist_records (performed_by);
create index checklist_record_details_record_id_idx
  on public.checklist_record_details (checklist_record_id);
create index checklist_record_details_item_id_idx
  on public.checklist_record_details (checklist_item_id);

-- =============================================================
-- 4. トリガー
-- =============================================================

-- items.updated_at を更新時に自動で進める。
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- サインアップ時に profiles の行を自動作成する。
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 5. 所有者判定のヘルパー関数
-- =============================================================
--
-- security definer にすることで、ポリシー評価のたびに参照先テーブルの
-- RLS が再帰的に走るのを避ける (入れ子が深い明細テーブルで効いてくる)。
-- 引数の id について「今のユーザーが所有しているか」だけを返すので、
-- これ自体が情報を漏らすことはない。

create function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and p.owner_id = (select auth.uid())
  );
$$;

create function public.is_checklist_owner(p_checklist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.checklists c
    join public.properties p on p.id = c.property_id
    where c.id = p_checklist_id
      and p.owner_id = (select auth.uid())
  );
$$;

create function public.is_checklist_item_owner(p_checklist_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.checklist_items ci
    join public.checklists c on c.id = ci.checklist_id
    join public.properties p on p.id = c.property_id
    where ci.id = p_checklist_item_id
      and p.owner_id = (select auth.uid())
  );
$$;

create function public.is_checklist_record_owner(p_checklist_record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.checklist_records r
    join public.properties p on p.id = r.property_id
    where r.id = p_checklist_record_id
      and p.owner_id = (select auth.uid())
  );
$$;

-- =============================================================
-- 6. 権限
-- =============================================================
--
-- 未ログイン (anon) からは一切触らせない。
-- service_role は RLS をバイパスするので、Stripe webhook などの
-- サーバー側処理からは plan を含めて更新できる。

revoke all on public.profiles from anon, authenticated;
revoke all on public.properties from anon, authenticated;
revoke all on public.items from anon, authenticated;
revoke all on public.checklists from anon, authenticated;
revoke all on public.checklist_items from anon, authenticated;
revoke all on public.checklist_records from anon, authenticated;
revoke all on public.checklist_record_details from anon, authenticated;

-- profiles は列単位で権限を絞る。
-- plan / plan_expires_at を本人が更新できると課金を自己申告で
-- 突破できてしまうため、更新は name のみに限定する。
grant select on public.profiles to authenticated;
grant insert (id, name) on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.checklists to authenticated;
grant select, insert, update, delete on public.checklist_items to authenticated;
grant select, insert, update, delete on public.checklist_records to authenticated;
grant select, insert, update, delete on public.checklist_record_details to authenticated;

grant execute on function public.is_property_owner(uuid) to authenticated;
grant execute on function public.is_checklist_owner(uuid) to authenticated;
grant execute on function public.is_checklist_item_owner(uuid) to authenticated;
grant execute on function public.is_checklist_record_owner(uuid) to authenticated;

-- service_role にも明示的に権限を与える。
-- Supabase のデフォルト権限に任せても実際は動くが、それに依存すると
-- 環境差で壊れるため、このマイグレーション単体で完結させる。
grant all on public.profiles to service_role;
grant all on public.properties to service_role;
grant all on public.items to service_role;
grant all on public.checklists to service_role;
grant all on public.checklist_items to service_role;
grant all on public.checklist_records to service_role;
grant all on public.checklist_record_details to service_role;

-- =============================================================
-- 7. Row Level Security
-- =============================================================

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.items enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_records enable row level security;
alter table public.checklist_record_details enable row level security;

-- ---- profiles -----------------------------------------------
-- 自分の行だけ。削除はユーザー自身にはさせない (auth.users の削除で cascade)。

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---- properties ---------------------------------------------
-- with check にも同じ条件を置くことで、他人へ owner_id を
-- 付け替える更新・挿入を防ぐ。

create policy "properties_select_own"
  on public.properties for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "properties_insert_own"
  on public.properties for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "properties_update_own"
  on public.properties for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "properties_delete_own"
  on public.properties for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---- items --------------------------------------------------

create policy "items_select_own"
  on public.items for select
  to authenticated
  using (public.is_property_owner(property_id));

create policy "items_insert_own"
  on public.items for insert
  to authenticated
  with check (public.is_property_owner(property_id));

create policy "items_update_own"
  on public.items for update
  to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

create policy "items_delete_own"
  on public.items for delete
  to authenticated
  using (public.is_property_owner(property_id));

-- ---- checklists ---------------------------------------------

create policy "checklists_select_own"
  on public.checklists for select
  to authenticated
  using (public.is_property_owner(property_id));

create policy "checklists_insert_own"
  on public.checklists for insert
  to authenticated
  with check (public.is_property_owner(property_id));

create policy "checklists_update_own"
  on public.checklists for update
  to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

create policy "checklists_delete_own"
  on public.checklists for delete
  to authenticated
  using (public.is_property_owner(property_id));

-- ---- checklist_items ----------------------------------------
-- item_id を指定する場合は、その備品も自分の物件のものであること。

create policy "checklist_items_select_own"
  on public.checklist_items for select
  to authenticated
  using (public.is_checklist_owner(checklist_id));

create policy "checklist_items_insert_own"
  on public.checklist_items for insert
  to authenticated
  with check (
    public.is_checklist_owner(checklist_id)
    and (
      item_id is null
      or exists (
        select 1
        from public.items i
        where i.id = item_id
          and public.is_property_owner(i.property_id)
      )
    )
  );

create policy "checklist_items_update_own"
  on public.checklist_items for update
  to authenticated
  using (public.is_checklist_owner(checklist_id))
  with check (
    public.is_checklist_owner(checklist_id)
    and (
      item_id is null
      or exists (
        select 1
        from public.items i
        where i.id = item_id
          and public.is_property_owner(i.property_id)
      )
    )
  );

create policy "checklist_items_delete_own"
  on public.checklist_items for delete
  to authenticated
  using (public.is_checklist_owner(checklist_id));

-- ---- checklist_records --------------------------------------
-- 実施者は自分自身に限定する (清掃スタッフへ開放する場合はここを緩める)。

create policy "checklist_records_select_own"
  on public.checklist_records for select
  to authenticated
  using (public.is_property_owner(property_id));

create policy "checklist_records_insert_own"
  on public.checklist_records for insert
  to authenticated
  with check (
    public.is_property_owner(property_id)
    and performed_by = (select auth.uid())
  );

create policy "checklist_records_update_own"
  on public.checklist_records for update
  to authenticated
  using (public.is_property_owner(property_id))
  with check (
    public.is_property_owner(property_id)
    and performed_by = (select auth.uid())
  );

create policy "checklist_records_delete_own"
  on public.checklist_records for delete
  to authenticated
  using (public.is_property_owner(property_id));

-- ---- checklist_record_details -------------------------------
-- 記録と項目の両方が自分のものであることを確認する。

create policy "checklist_record_details_select_own"
  on public.checklist_record_details for select
  to authenticated
  using (public.is_checklist_record_owner(checklist_record_id));

create policy "checklist_record_details_insert_own"
  on public.checklist_record_details for insert
  to authenticated
  with check (
    public.is_checklist_record_owner(checklist_record_id)
    and public.is_checklist_item_owner(checklist_item_id)
  );

create policy "checklist_record_details_update_own"
  on public.checklist_record_details for update
  to authenticated
  using (public.is_checklist_record_owner(checklist_record_id))
  with check (
    public.is_checklist_record_owner(checklist_record_id)
    and public.is_checklist_item_owner(checklist_item_id)
  );

create policy "checklist_record_details_delete_own"
  on public.checklist_record_details for delete
  to authenticated
  using (public.is_checklist_record_owner(checklist_record_id));
