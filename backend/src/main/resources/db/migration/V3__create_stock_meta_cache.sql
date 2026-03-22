CREATE TABLE stock_meta_cache (
    ticker_code    TEXT    PRIMARY KEY,
    company_name   TEXT,
    sector33_code  TEXT,
    sector33_name  TEXT,
    dividend_yield TEXT,
    market_cap     TEXT,
    earnings_date  TEXT,
    pbr            TEXT,
    per            TEXT,
    cached_at      TEXT    NOT NULL
);
