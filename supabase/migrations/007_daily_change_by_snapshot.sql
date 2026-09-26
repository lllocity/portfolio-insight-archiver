-- ============================================================
-- 007_daily_change_by_snapshot.sql
-- 日次騰落率ランキング用の集計関数
--   daily-change-ranking Edge Function が holdings を全件取得して集計していた処理を
--   DB 内集計に置き換える（holdings は年約1万行ペースで増え続けるため）。
--   テーブル定義は変更しない（関数の追加のみ・DROP FUNCTION で完全に戻せる）。
--
-- 返り値: スナップショット日ごとの株式部分の騰落幅・前日評価額（日付降順）を
--         1個の jsonb 配列で返す。行集合で返すと PostgREST の max_rows（既定1000行）で
--         黙って切り詰められるため、スカラー1値にまとめている。
--   [{ "snapshotDate": "2026-09-25", "changeAmount": 12345.0, "prevValuation": 67890.0 }, ...]
--
-- 株式判定: 東証の証券コード形式（4桁 or 3桁＋英数字1桁）。投資信託はファンド名が
--           ticker_code に入るため一致しない＝除外。
--           frontend/src/lib/assetType.ts / supabase/functions/_shared/asset-type.ts と同一定義。
--
-- セキュリティ: SECURITY INVOKER（呼び出しユーザー権限）で RLS を効かせた上で、
--               auth.uid() でも明示的に自ユーザーに絞る。anon には実行させない。
-- ============================================================

CREATE OR REPLACE FUNCTION public.daily_change_by_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'snapshotDate',  t.snapshot_date,
               'changeAmount',  t.change_amount,
               'prevValuation', t.prev_valuation
             )
             ORDER BY t.snapshot_date DESC
           ),
           '[]'::jsonb
         )
    FROM (
      SELECT s.snapshot_date,
             SUM(h.daily_change * h.total_quantity)                     AS change_amount,
             SUM((h.current_price - h.daily_change) * h.total_quantity) AS prev_valuation
        FROM holdings h
        JOIN snapshots s ON s.id = h.snapshot_id
       WHERE h.user_id = auth.uid()
         AND s.user_id = auth.uid()
         AND h.ticker_code ~ '^[0-9]{3}[0-9A-Z]$'
       GROUP BY s.snapshot_date
      -- 株式保有ゼロ／分母0のスナップショットは除外（従来の Edge Function と同じ）
      HAVING SUM((h.current_price - h.daily_change) * h.total_quantity) <> 0
    ) t;
$$;

REVOKE EXECUTE ON FUNCTION public.daily_change_by_snapshot() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.daily_change_by_snapshot() TO authenticated;
