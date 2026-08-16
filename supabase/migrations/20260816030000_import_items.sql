-- CSV から備品を一括登録・一括更新する
--
-- 1 行ずつクライアントから投げると、途中で失敗したときに
-- 一部だけ取り込まれた状態になる。1 回の呼び出し (= 1 トランザクション)
-- にまとめて、全部成功か全部失敗のどちらかにする。
--
-- security invoker なので RLS がそのまま効く。
-- 他人の物件の property_id を渡してもポリシーで弾かれる。
--
-- p_rows の形式:
--   [{ "property_id": uuid, "name": text, "category": text|null,
--      "quantity": int, "threshold": int }]
--
-- 同じ物件に同名の備品があれば更新、無ければ新規登録する。

create function public.import_items(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row jsonb;
  v_property_id uuid;
  v_name text;
  v_existing_id uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows must be a json array';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_property_id := (v_row ->> 'property_id')::uuid;
    v_name := btrim(v_row ->> 'name');

    if v_name is null or v_name = '' then
      raise exception 'name is required';
    end if;

    -- 同じ物件の同名備品を探す (RLS により自分の物件のものだけが見える)
    select i.id into v_existing_id
    from public.items i
    where i.property_id = v_property_id
      and i.name = v_name
    limit 1;

    if v_existing_id is not null then
      update public.items
      set category = v_row ->> 'category',
          quantity = (v_row ->> 'quantity')::integer,
          threshold = (v_row ->> 'threshold')::integer
      where id = v_existing_id;

      -- RLS で弾かれた場合は 0 行になるので、その時点で失敗させる
      if not found then
        raise exception 'not allowed to update item %', v_existing_id;
      end if;

      v_updated := v_updated + 1;
    else
      insert into public.items (property_id, name, category, quantity, threshold)
      values (
        v_property_id,
        v_name,
        v_row ->> 'category',
        (v_row ->> 'quantity')::integer,
        (v_row ->> 'threshold')::integer
      );

      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
end;
$$;

grant execute on function public.import_items(jsonb) to authenticated;
