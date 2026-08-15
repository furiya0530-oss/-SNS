-- 無料プランの物件数上限
--
-- 画面側でも 2 件目の登録を止めているが、クライアントのチェックは
-- API を直接叩けば回避できるため、DB 側でも同じ制限をかける。
-- 課金処理そのものはフェーズ7で実装する。

-- 上限値を 1 箇所で持つ。将来プランごとの上限を増やす場合はここを変える。
create function public.free_plan_property_limit()
returns integer
language sql
immutable
as $$
  select 1
$$;

create function public.enforce_property_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plan_type;
  v_count integer;
begin
  -- 自分以外の owner_id での挿入は RLS の with check が弾くので、
  -- ここでは何も見ない。
  -- security definer で他人の profiles / properties を数えてしまうと、
  -- 「その id は無料プランで上限に達しているか」をエラーの違いから
  -- 推測できてしまうため。
  -- (auth.uid() が null になる service_role からの操作もここを通る)
  if (select auth.uid()) is distinct from new.owner_id then
    return new;
  end if;

  select p.plan into v_plan
  from public.profiles p
  where p.id = new.owner_id;

  -- プロフィールが無い場合は無料プラン扱いにしておく
  if v_plan is distinct from 'free'::public.plan_type then
    return new;
  end if;

  select count(*) into v_count
  from public.properties pr
  where pr.owner_id = new.owner_id;

  if v_count >= public.free_plan_property_limit() then
    -- クライアントはこのメッセージで判定して
    -- 「Proプランへのアップグレードが必要です」を表示する
    raise exception 'free_plan_property_limit'
      using hint = '無料プランで登録できる物件は'
                   || public.free_plan_property_limit()
                   || '件までです。';
  end if;

  return new;
end;
$$;

create trigger properties_enforce_plan_limit
  before insert on public.properties
  for each row execute function public.enforce_property_limit();

grant execute on function public.free_plan_property_limit() to authenticated;
