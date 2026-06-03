-- 003_add_cash_balance.sql
-- snapshots に待機資金（現金）カラムを追加
ALTER TABLE snapshots ADD COLUMN cash_balance BIGINT NOT NULL DEFAULT 0;
