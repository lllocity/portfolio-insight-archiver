-- ============================================================
-- 008_holdings_is_stock.sql
-- 株式／投資信託の区分を holdings に保存し、DB 関数から判定ルールを取り除く
--
-- 背景: 007 の daily_change_by_snapshot は SQL 内で証券コード形式の正規表現を持っていた。
--       判定ルール（何を株式とみなすか）は TypeScript 側に置き、DB は集計のみに限定する
--       方針（CLAUDE.md「DB 関数の線引き」）に合わせ、判定結果を取り込み時に列として保存する。
--
-- is_stock: 取り込み時（csv-import）に isStockCode(ticker_code) の結果を保存する。
--           判定の定義は supabase/functions/_shared/asset-type.ts。
-- ============================================================

-- 1. 列を追加
ALTER TABLE holdings ADD COLUMN is_stock BOOLEAN;

-- 2. 既存行を一括設定（1回限りの移行処理）
--    is_stock は ticker_code のみから決まるため、過去データの再取込は不要。
--    ここの正規表現は _shared/asset-type.ts の isStockCode と同一定義（移行時点のスナップショット）。
--    判定ルールを変更した場合は、新しいマイグレーションで同様に再設定すること。
UPDATE holdings SET is_stock = (ticker_code ~ '^[0-9]{3}[0-9A-Z]$');

-- 3. 以降の取り込みで設定漏れがあれば取り込みエラーとして検知する
ALTER TABLE holdings ALTER COLUMN is_stock SET NOT NULL;

-- 4. 集計関数から判定ルールを除去（集計・絞り込みのみ）。返り値・権限は 007 と同一。
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
         AND h.is_stock
       GROUP BY s.snapshot_date
      -- 株式保有ゼロ／分母0のスナップショットは除外
      HAVING SUM((h.current_price - h.daily_change) * h.total_quantity) <> 0
    ) t;
$$;

REVOKE EXECUTE ON FUNCTION public.daily_change_by_snapshot() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.daily_change_by_snapshot() TO authenticated;
