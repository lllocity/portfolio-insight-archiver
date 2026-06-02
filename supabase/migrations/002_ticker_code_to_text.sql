-- ticker_code の VARCHAR(10) 制限を撤廃
-- 投資信託はファンド名をそのまま ticker_code として使用するため TEXT 型が必要
ALTER TABLE holdings         ALTER COLUMN ticker_code TYPE TEXT;
ALTER TABLE stock_meta_cache ALTER COLUMN ticker_code TYPE TEXT;
ALTER TABLE stock_memo       ALTER COLUMN ticker_code TYPE TEXT;
