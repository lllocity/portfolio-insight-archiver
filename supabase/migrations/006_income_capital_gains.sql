-- ============================================================
-- 006_income_capital_gains.sql
-- 生涯トータルリターン用テーブル
--   realized_pnl : 実現売却損益（実現キャピタルゲイン・税引前）
--   dividends    : 受取配当（実現インカムゲイン・税引後）
-- どちらも SBI CSV を「範囲リプレース方式」で取り込む。
-- ユーザーごとのデータ分離: RLS で auth.uid() = user_id を強制。
-- ============================================================

-- ------------------------------------------------------------
-- realized_pnl: 実現売却損益（DOMESTIC_STOCK_*.csv）
--   SBI が計算済みの実現損益(税引前)をそのまま保持する。
--   成行の分割約定は約定単位で複数行になる（正当な重複、まとめない）。
--   口座は 特定 / 一般 / NISA を横断して含む。
-- ------------------------------------------------------------
CREATE TABLE realized_pnl (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trade_date   DATE          NOT NULL,          -- 約定日
    account      TEXT          NOT NULL,          -- 特定 / 一般 / NISA（成長投資枠）等
    ticker_code  TEXT          NOT NULL,          -- 投資信託はファンド名をそのまま使用
    company_name TEXT,                            -- 銘柄名（コード除去後）
    quantity     NUMERIC(12,4) NOT NULL,          -- 数量
    proceeds     BIGINT        NOT NULL,          -- 売却/決済額
    avg_cost     NUMERIC(12,4),                   -- 平均取得価額
    realized_pl  BIGINT        NOT NULL,          -- 実現損益(税引前・円)
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_realized_pnl_user_date ON realized_pnl (user_id, trade_date);

-- ------------------------------------------------------------
-- dividends: 受取配当・分配金（DISTRIBUTION_*.csv）
--   SBI CSV は税引後（受取額）しか出力しないため amount_net のみ保持。
--   投資信託も含む（コードなし＝ファンド名を ticker_code に使用）。
-- ------------------------------------------------------------
CREATE TABLE dividends (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pay_date     DATE          NOT NULL,          -- 受渡日
    account      TEXT          NOT NULL,          -- 特定/一般 / NISA（成長投資枠）等
    product      TEXT,                            -- 国内株式(現物) / 投資信託
    ticker_code  TEXT          NOT NULL,          -- 投資信託はファンド名をそのまま使用
    company_name TEXT,                            -- 銘柄名（コード除去後）
    quantity     NUMERIC(14,4),                   -- 数量
    amount_net   BIGINT        NOT NULL,          -- 受取額(税引後・円)
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dividends_user_date ON dividends (user_id, pay_date);

-- ============================================================
-- RLS (Row Level Security) ポリシー
--   既存テーブル（snapshots 等）と同一の自ユーザー分離パターン。
-- ============================================================

-- realized_pnl: 自分のデータのみ読み書き可
ALTER TABLE realized_pnl ENABLE ROW LEVEL SECURITY;
CREATE POLICY "realized_pnl_user_isolation" ON realized_pnl
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- dividends: 自分のデータのみ読み書き可
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dividends_user_isolation" ON dividends
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- authenticated ロールへのテーブル権限付与（防御的）
--   Supabase の default privileges で自動付与される場合は冗長だが、
--   005 で allowed_emails に明示 GRANT が必要だった前例に倣い、
--   Edge Function（authenticated ロール）からの操作が
--   permission denied にならないよう明示的に付与する。
--   行レベルの絞り込みは上記 RLS が担保する。
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON realized_pnl TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dividends    TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE realized_pnl_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dividends_id_seq    TO authenticated;
