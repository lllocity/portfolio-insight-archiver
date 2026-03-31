CREATE TABLE stock_memo (
    ticker_code TEXT PRIMARY KEY,
    content     TEXT NOT NULL CHECK(length(content) <= 100),
    updated_at  TEXT NOT NULL
);
