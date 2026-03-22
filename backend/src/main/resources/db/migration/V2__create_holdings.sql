CREATE TABLE holdings (
    id                           INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id                  INTEGER NOT NULL,
    ticker_code                  TEXT    NOT NULL,
    total_quantity               TEXT    NOT NULL,
    weighted_avg_purchase_price  TEXT    NOT NULL,
    current_price                TEXT    NOT NULL,
    daily_change                 TEXT    NOT NULL,
    daily_change_pct             TEXT    NOT NULL,
    total_profit_loss            TEXT    NOT NULL,
    total_profit_loss_pct        TEXT    NOT NULL,
    total_valuation              TEXT    NOT NULL,
    FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE,
    UNIQUE (snapshot_id, ticker_code)
);

CREATE INDEX idx_holdings_snapshot_id ON holdings(snapshot_id);
