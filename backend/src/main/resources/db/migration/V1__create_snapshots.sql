CREATE TABLE snapshots (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date       TEXT    NOT NULL UNIQUE,
    total_valuation     TEXT    NOT NULL,
    total_profit_loss   TEXT    NOT NULL,
    total_profit_loss_pct TEXT  NOT NULL,
    holding_count       INTEGER NOT NULL,
    created_at          TEXT    NOT NULL
);
