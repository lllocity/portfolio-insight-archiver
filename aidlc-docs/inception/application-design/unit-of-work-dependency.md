# Unit of Work Dependency — Portfolio Insight & Archiver

## ユニット間依存関係マトリクス

| 依存元 → 依存先 | backend | frontend |
|---|---|---|
| **backend** | — | なし |
| **frontend** | HTTP REST API | — |

**frontend は backend に依存**（APIコール）。backend は frontend に依存しない。

---

## ユニット内モジュール依存関係（backend）

```
csv ──────────────────────────────────────────────┐
                                                   ▼
jquants ──────────────────────────────► analysis (ImportOrchestrationService)
                                                   │
snapshot ◄─────────────────────────────────────────┤
                                                   │
prompt ◄────────────────────────────────────────── ┤
                                                   │
google ◄────────────────────────────────────────── ┘

portfolio ──► snapshot, analysis, jquants, prompt
settings  （独立）
```

### モジュール依存マトリクス（backend内）

| モジュール | csv | analysis | jquants | google | prompt | snapshot | settings | portfolio |
|---|---|---|---|---|---|---|---|---|
| **csv** | — | | | | | | | |
| **analysis** | 依存 | — | 依存 | 依存 | 依存 | 依存 | | |
| **jquants** | | | — | | | | | |
| **google** | | | | — | | | | |
| **prompt** | | | | | — | | | |
| **snapshot** | | | | | | — | | |
| **settings** | | | | | | | — | |
| **portfolio** | | 依存 | 依存 | | 依存 | 依存 | | — |

---

## 統合ポイント（frontend ↔ backend）

| APIエンドポイント | 呼び出し元（FE） | 呼び出し先（BE） |
|---|---|---|
| `POST /api/csv/import` | CsvImportForm | CsvImportController |
| `GET /api/portfolio/latest` | PortfolioPage | PortfolioQueryController |
| `GET /api/portfolio/prompt` | PromptPage | PortfolioQueryController |
| `GET /api/portfolio/snapshots` | HistoryPage | PortfolioQueryController |
| `GET /api/portfolio/diff` | HistoryPage | PortfolioQueryController |
| `GET /api/settings` | SettingsPage | SettingsController |
| `PUT /api/settings` | SettingsPage | SettingsController |

---

## 外部依存（両ユニット共通）

| 外部サービス | 利用ユニット | 通信方式 |
|---|---|---|
| J-Quants API | backend (`jquants`) | HTTPS |
| Google Docs API | backend (`google`) | HTTPS |
| SQLite | backend (全モジュール) | ローカルファイルI/O |

---

## 構築時の統合テスト境界

```
[frontend] ──HTTP──► [backend API mock / 実環境]
                          │
                     [SQLite（テスト用インメモリ）]
                          │
              [J-Quants API stub / 実API]
              [Google Docs API stub / 実API]
```

- **frontend単体テスト**: バックエンドAPIをモック
- **backend単体テスト**: 外部API（J-Quants・Google Docs）をモック、SQLiteはインメモリ
- **統合テスト**: Docker Compose 全起動で実通信確認
