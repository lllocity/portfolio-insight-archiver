# Domain Entities — backend

## エンティティ一覧

---

### Snapshot（スナップショット）

CSVインポート1回分のポートフォリオ状態を表す。日付でユニーク。

| フィールド | 型 | 制約 | 説明 |
|---|---|---|---|
| id | Long | PK, AUTO | 内部ID |
| snapshotDate | LocalDate | UNIQUE, NOT NULL | スナップショット日付（YYYY-MM-DD） |
| totalValuation | BigDecimal | NOT NULL | 総評価額（円） |
| totalProfitLoss | BigDecimal | NOT NULL | 総損益（円） |
| totalProfitLossPct | BigDecimal | NOT NULL | 総損益率（%） |
| holdingCount | Integer | NOT NULL | 保有銘柄数（集約後） |
| createdAt | LocalDateTime | NOT NULL | 作成日時 |
| holdings | List\<Holding\> | 1:N | 保有銘柄リスト（集約済み） |

**SQLiteテーブル名**: `snapshots`

---

### Holding（保有銘柄・集約済み）

Snapshot内の1銘柄を表す。同一スナップショット内で銘柄コードがユニーク（複数買付行は集約済み）。

| フィールド | 型 | 制約 | 説明 |
|---|---|---|---|
| id | Long | PK, AUTO | 内部ID |
| snapshotId | Long | FK → snapshots.id, NOT NULL | 所属スナップショット |
| tickerCode | String | NOT NULL | 銘柄コード（例: "7203"） |
| totalQuantity | BigDecimal | NOT NULL | 保有数量（合計） |
| weightedAvgPurchasePrice | BigDecimal | NOT NULL | 加重平均取得単価（円） |
| currentPrice | BigDecimal | NOT NULL | 現在値（円） |
| dailyChange | BigDecimal | NOT NULL | 前日比（円） |
| dailyChangePct | BigDecimal | NOT NULL | 前日比（%） |
| totalProfitLoss | BigDecimal | NOT NULL | 評価損益（円） |
| totalProfitLossPct | BigDecimal | NOT NULL | 評価損益率（%） |
| totalValuation | BigDecimal | NOT NULL | 評価額（円） |

**SQLiteテーブル名**: `holdings`
**ユニーク制約**: (snapshotId, tickerCode)

---

### StockMeta（銘柄メタデータキャッシュ）

J-Quants APIから取得した銘柄情報。24時間キャッシュ。

| フィールド | 型 | 制約 | 説明 |
|---|---|---|---|
| tickerCode | String | PK | 銘柄コード |
| companyName | String | | 企業名 |
| sector33Code | String | | 東証33業種コード |
| sector33Name | String | | 東証33業種名 |
| dividendYield | BigDecimal | NULLABLE | 配当利回り（%）|
| marketCap | BigDecimal | NULLABLE | 時価総額（百万円） |
| earningsDate | LocalDate | NULLABLE | 次回決算発表日 |
| pbr | BigDecimal | NULLABLE | PBR（無料プランで取得不可の場合はNULL） |
| per | BigDecimal | NULLABLE | PER（無料プランで取得不可の場合はNULL） |
| cachedAt | LocalDateTime | NOT NULL | キャッシュ取得日時 |

**SQLiteテーブル名**: `stock_meta_cache`

---

### Setting（アプリ設定）

キーバリュー形式の設定ストア。

| フィールド | 型 | 制約 | 説明 |
|---|---|---|---|
| key | String | PK | 設定キー |
| value | String | NULLABLE | 設定値 |
| updatedAt | LocalDateTime | NOT NULL | 更新日時 |

**SQLiteテーブル名**: `settings`

**既定の設定キー（非機密のみ）**:

| キー | 説明 | 例 |
|---|---|---|
| `csv.default.path` | CSVファイルのデフォルトパス | `/data/New_file.csv` |
| `google.drive.folder.id` | アーカイブ先Google DriveフォルダID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs` |

> **機密情報は環境変数で管理（SQLiteには保存しない）**:
>
> | 環境変数 | 説明 | 設定場所 |
> |---|---|---|
> | `JQUANTS_REFRESH_TOKEN` | J-Quants APIリフレッシュトークン | `.env` / Docker Compose `environment:` |
> | `GOOGLE_SA_KEY_PATH` | サービスアカウントJSONキーの絶対パス | `.env` / Docker Compose `environment:` |

---

## 値オブジェクト（VO）

### SectorAllocation（セクター構成比）

永続化しない計算結果オブジェクト。

| フィールド | 型 | 説明 |
|---|---|---|
| sector33Name | String | 東証33業種名 |
| totalValuation | BigDecimal | セクター合計評価額（円） |
| allocationPct | BigDecimal | 構成比（%） |
| holdingCount | Integer | 銘柄数 |

### SnapshotDiff（差分）

永続化しない計算結果オブジェクト。

| フィールド | 型 | 説明 |
|---|---|---|
| addedHoldings | List\<Holding\> | 前回になく今回ある銘柄 |
| removedHoldings | List\<Holding\> | 前回にあり今回ない銘柄 |
| changedHoldings | List\<HoldingChange\> | 両方にあり数量・評価額が変化した銘柄 |
| valuationChange | BigDecimal | 総評価額の変化（円） |
| profitLossChange | BigDecimal | 総損益の変化（円） |

### HoldingChange（銘柄変化）

| フィールド | 型 | 説明 |
|---|---|---|
| tickerCode | String | 銘柄コード |
| quantityDiff | BigDecimal | 数量の変化 |
| valuationDiff | BigDecimal | 評価額の変化（円） |
| previous | Holding | 前回の保有状態 |
| current | Holding | 現在の保有状態 |

### EnrichedHolding（分析用マージデータ）

永続化しない。Holding + StockMeta のマージ結果。

| フィールド | 型 | 説明 |
|---|---|---|
| holding | Holding | 保有銘柄データ |
| stockMeta | StockMeta | NULLABLE（J-Quants取得失敗時はnull） |
| sectorName | String | セクター名（メタ取得失敗時は "不明"） |

---

## エンティティ関係図

```
Snapshot (1) ──── (N) Holding
                        │
                        │ tickerCode
                        ▼
                  StockMeta (cache)

Setting (独立したKVストア)
```
