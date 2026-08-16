-- プロフィールに役割を追加する (要件定義書 8. users の role)
--
-- MVP ではスタッフ招待の仕組みがまだ無いため、この列は区分を持つだけで
-- 権限には影響しない。スタッフ共有を実装する段階で RLS から参照する。

create type public.user_role as enum ('owner', 'staff');

alter table public.profiles
  add column role public.user_role not null default 'owner';

comment on column public.profiles.role is
  'owner: 物件オーナー / staff: 清掃・補充担当。MVP では権限に影響しない';

-- plan と同じく、本人には更新させない。
-- (authenticated への update 権限は name 列のみに絞ってあるため、
--  ここで追加の revoke は不要。将来 staff 招待を作る際は
--  招待側の処理を service_role か security definer 関数で行う)
