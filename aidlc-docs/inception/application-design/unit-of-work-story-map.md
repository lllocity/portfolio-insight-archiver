# Unit of Work Story Map — Portfolio Insight & Archiver

> User Stories フェーズはスキップのため、機能要件（FR）を各ユニットにマッピングする。

---

## Unit 1: backend — 機能要件マッピング

### csv モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-CSV-01 | SBI証券CSVを設定パスから読み込む | `CsvParserService` |
| FR-CSV-02 | Dockerマウントディレクトリからの読み込み | `CsvImportController` |
| FR-CSV-03 | SBI証券CSVカラム構造のパース | `CsvParserService` |
| FR-CSV-04 | 取り込み後SQLiteに保存 | → snapshot モジュールへ |

### jquants モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-JQUANTS-01 | 銘柄コードからJ-Quants APIでメタデータ取得 | `JQuantsApiClient` |
| FR-JQUANTS-02 | セクター・配当利回り・決算日・時価総額取得 | `JQuantsApiClient` |
| FR-JQUANTS-03 | PBR/PER取得（無料プランで不可の場合は除外） | `JQuantsApiClient` |
| FR-JQUANTS-04 | 日本株のみ対応 | `JQuantsApiClient` |

### analysis モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-ANALYSIS-01 | セクター別構成比計算 | `PortfolioAnalysisService` |
| FR-ANALYSIS-02 | セクター偏りの識別 | `PortfolioAnalysisService` |
| FR-ANALYSIS-03 | PBR/PER/配当利回り一覧（オンスクリーン） | `PortfolioAnalysisService` |
| FR-ANALYSIS-04 | 前回スナップショットとの差分計算 | `PortfolioAnalysisService` |
| FR-ANALYSIS-05 | 損益・評価額の集計 | `PortfolioAnalysisService` |
| — | CSVインポート全体フローの調整 | `ImportOrchestrationService` |

### prompt モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-AI-01 | 構造化AI分析プロンプト生成 | `AiPromptGeneratorService` |
| FR-AI-02 | プロンプトをコピペ用に提供 | → frontend へ |
| FR-AI-03 | 買い増し・整理候補の判断基準をプロンプトに含める | `AiPromptGeneratorService` |
| FR-AI-04 | AI API直接呼び出しなし | （非実装） |

### snapshot モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-CSV-04 | CSVデータをSQLiteに保存 | `SnapshotService`, `SnapshotRepository` |
| FR-GDOCS-01 | CSVインポートのたびにスナップショット作成 | `SnapshotService` |
| FR-GDOCS-03 | 同日上書き | `SnapshotService` |

### google モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-GDOCS-01 | CSVインポート時に自動アーカイブ | `GoogleDocsArchiveService` |
| FR-GDOCS-02 | ファイル名 `YYYY-MM-DD` | `GoogleDocsArchiveService` |
| FR-GDOCS-03 | 同日上書き | `GoogleDocsArchiveService` |
| FR-GDOCS-04 | 指定フォルダに新規Doc作成 | `GoogleDocsArchiveService` |
| FR-GDOCS-05 | アーカイブ内容（銘柄リスト・セクター比・AIプロンプト・差分） | `GoogleDocsArchiveService` |
| FR-AUTH-01 | サービスアカウントJSONキーで認証 | `GoogleDocsArchiveService` |
| FR-AUTH-03 | JSONキーパスを環境変数で指定 | `GoogleDocsArchiveService` |
| FR-AUTH-04 | フォルダへの編集権限付与（ユーザー作業） | （ドキュメントのみ） |

### settings モジュール

| 要件ID | 内容 | 実装クラス |
|---|---|---|
| FR-AUTH-03 | JSONキーパスを設定で管理 | `SettingsRepository` |
| — | CSVパス・DriveフォルダID・J-Quantsトークン管理 | `SettingsRepository` |

---

## Unit 2: frontend — 機能要件マッピング

### PortfolioPage

| 要件ID | 内容 | コンポーネント |
|---|---|---|
| FR-CSV-01/02 | CSVインポートUI（パス入力・ボタン） | `CsvImportForm.vue` |
| FR-ANALYSIS-01/02 | セクター別構成比グラフ | `SectorChart.vue` |
| FR-ANALYSIS-03/05 | 銘柄テーブル（評価額・損益・指標） | `HoldingsTable.vue` |
| — | サマリーカード（総評価額・損益） | `SummaryCard.vue` |

### HistoryPage

| 要件ID | 内容 | コンポーネント |
|---|---|---|
| FR-ANALYSIS-04 | 前回スナップショットとの差分表示 | `DiffView.vue` |
| — | スナップショット一覧 | `HistoryPage.vue` |

### PromptPage

| 要件ID | 内容 | コンポーネント |
|---|---|---|
| FR-AI-01/02 | AIプロンプト表示・コピーボタン | `PromptPage.vue` |

### SettingsPage

| 要件ID | 内容 | コンポーネント |
|---|---|---|
| FR-AUTH-03 | JSONキーパス・DriveフォルダID・J-Quantsトークン設定 | `SettingsPage.vue` |

---

## NFR マッピング

| NFR ID | 担当ユニット | 担当モジュール |
|---|---|---|
| NFR-PERF-01/02 | backend | jquants（タイムアウト） |
| NFR-PERF-03 | backend | jquants（キャッシュ） |
| NFR-SEC-03/04 | backend | 全モジュール（ロギング・セキュリティヘッダー） |
| NFR-SEC-05 | backend | csv, settings（入力バリデーション） |
| NFR-SEC-08 | backend | 全コントローラー（CORS） |
| NFR-SEC-09/12 | backend | google, settings（秘密情報管理） |
| NFR-SEC-15 | backend | 全モジュール（エラーハンドリング） |
| NFR-AVAIL-02 | backend | jquants（グレースフルデグラデーション） |
| NFR-AVAIL-03 | backend | google（障害フォールバック） |
