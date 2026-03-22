CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT NOT NULL
);

-- Default non-sensitive settings
INSERT INTO settings (key, value, updated_at) VALUES
    ('csv.default.path',      '/data/New_file.csv', datetime('now')),
    ('google.drive.folder.id', NULL,                 datetime('now'));
