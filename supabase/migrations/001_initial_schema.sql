-- ============================================================
-- 001_initial_schema.sql
-- Portfolio Insight Archiver - Supabase (PostgreSQL) 初期スキーマ
-- ユーザーごとのデータ分離: RLS で auth.uid() = user_id を強制
-- ============================================================

-- ------------------------------------------------------------
-- snapshots: ポートフォリオのスナップショット履歴
-- ------------------------------------------------------------
CREATE TABLE snapshots (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date         DATE        NOT NULL,
    total_valuation       BIGINT      NOT NULL,
    total_profit_loss     BIGINT      NOT NULL,
    total_profit_loss_pct NUMERIC(10,4) NOT NULL,
    holding_count         INTEGER     NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON snapshots (user_id, snapshot_date DESC);

-- ------------------------------------------------------------
-- holdings: スナップショット時点の保有銘柄
-- ------------------------------------------------------------
CREATE TABLE holdings (
    id                          BIGSERIAL PRIMARY KEY,
    user_id                     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_id                 BIGINT        NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    ticker_code                 VARCHAR(10)   NOT NULL,
    total_quantity              NUMERIC(12,4) NOT NULL,
    weighted_avg_purchase_price NUMERIC(12,2) NOT NULL,
    current_price               NUMERIC(12,2) NOT NULL,
    daily_change                NUMERIC(12,2) NOT NULL,
    daily_change_pct            NUMERIC(8,4)  NOT NULL,
    total_profit_loss           BIGINT        NOT NULL,
    total_profit_loss_pct       NUMERIC(10,4) NOT NULL,
    total_valuation             BIGINT        NOT NULL,
    UNIQUE (snapshot_id, ticker_code)
);

CREATE INDEX idx_holdings_snapshot_id  ON holdings (snapshot_id);
CREATE INDEX idx_holdings_user_ticker  ON holdings (user_id, ticker_code);

-- ------------------------------------------------------------
-- stock_meta_cache: J-Quants API 市場データキャッシュ（全ユーザー共有）
-- ------------------------------------------------------------
CREATE TABLE stock_meta_cache (
    ticker_code               VARCHAR(10) PRIMARY KEY,
    company_name              TEXT,
    sector33_code             VARCHAR(10),
    sector33_name             TEXT,
    dividend_yield            NUMERIC(8,4),
    market_cap                BIGINT,
    earnings_date             TEXT,
    pbr                       NUMERIC(10,4),
    per                       NUMERIC(10,4),
    annual_dividend_per_share NUMERIC(10,2),
    dividend_months           TEXT,
    cached_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- stock_memo: 銘柄ごとのメモ（最大100文字）
-- ------------------------------------------------------------
CREATE TABLE stock_memo (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker_code VARCHAR(10) NOT NULL,
    content     TEXT        NOT NULL CHECK (char_length(content) <= 100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, ticker_code)
);

CREATE INDEX idx_stock_memo_user_ticker ON stock_memo (user_id, ticker_code);

-- ------------------------------------------------------------
-- settings: ユーザーごとの設定値
-- ------------------------------------------------------------
CREATE TABLE settings (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key        VARCHAR(100) NOT NULL,
    value      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, key)
);

-- ============================================================
-- RLS (Row Level Security) ポリシー
-- ============================================================

-- snapshots: 自分のデータのみ読み書き可
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_user_isolation" ON snapshots
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- holdings: 自分のデータのみ読み書き可
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holdings_user_isolation" ON holdings
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- stock_meta_cache: 認証済みユーザー全員が読み書き可（共有キャッシュ）
ALTER TABLE stock_meta_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_meta_cache_read" ON stock_meta_cache
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "stock_meta_cache_write" ON stock_meta_cache
    FOR ALL USING (auth.role() = 'authenticated');

-- stock_memo: 自分のデータのみ読み書き可
ALTER TABLE stock_memo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_memo_user_isolation" ON stock_memo
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- settings: 自分のデータのみ読み書き可
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_user_isolation" ON settings
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
