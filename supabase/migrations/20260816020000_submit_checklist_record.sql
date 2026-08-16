-- チェックリストの実施結果をまとめて保存する
--
-- 「記録の作成」「明細の作成」「不足だった備品の数量更新」を
-- 1 回の呼び出し (= 1 トランザクション) で行う。
-- クライアントから 3 種類の書き込みを順に投げると、途中で失敗したときに
-- 記録だけ残って数量が古いままになるため。
--
-- security invoker なので RLS はそのまま効く。他人の物件のチェックリストを
-- 指定してもポリシーで弾かれる。
--
-- p_details の形式:
--   [{ "checklist_item_id": uuid,
--      "status": "ok" | "short" | "broken",
--      "comment": text | null,
--      "remaining_quantity": int | null }]
--
-- status が 'short' で備品に紐づいている項目は items.quantity を更新する。
--   remaining_quantity があればその値、無ければ「しきい値 - 1」。
--   後者は在庫アラートが必ず立つようにするための既定値。

create function public.submit_checklist_record(
  p_checklist_id uuid,
  p_property_id uuid,
  p_details jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_record_id uuid;
  v_detail jsonb;
  v_checklist_item_id uuid;
  v_item_id uuid;
  v_remaining integer;
begin
  if jsonb_typeof(p_details) is distinct from 'array' then
    raise exception 'p_details must be a json array';
  end if;

  insert into public.checklist_records (checklist_id, property_id)
  values (p_checklist_id, p_property_id)
  returning id into v_record_id;

  for v_detail in select value from jsonb_array_elements(p_details)
  loop
    v_checklist_item_id := (v_detail ->> 'checklist_item_id')::uuid;

    -- 指定されたチェックリストの項目であることを確認する
    select ci.item_id into v_item_id
    from public.checklist_items ci
    where ci.id = v_checklist_item_id
      and ci.checklist_id = p_checklist_id;

    if not found then
      raise exception 'checklist item % does not belong to checklist %',
        v_checklist_item_id, p_checklist_id;
    end if;

    insert into public.checklist_record_details
      (checklist_record_id, checklist_item_id, status, comment)
    values (
      v_record_id,
      v_checklist_item_id,
      (v_detail ->> 'status')::public.checklist_status,
      nullif(btrim(coalesce(v_detail ->> 'comment', '')), '')
    );

    -- 「不足」かつ備品に紐づいていれば台帳の数量へ反映する
    if (v_detail ->> 'status') = 'short' and v_item_id is not null then
      v_remaining := nullif(v_detail ->> 'remaining_quantity', '')::integer;

      update public.items i
      set quantity = greatest(0, coalesce(v_remaining, i.threshold - 1))
      where i.id = v_item_id;
    end if;
  end loop;

  return v_record_id;
end;
$$;

grant execute on function public.submit_checklist_record(uuid, uuid, jsonb)
  to authenticated;
