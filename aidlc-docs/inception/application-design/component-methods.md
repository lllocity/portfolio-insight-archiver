# Component Methods — Portfolio Insight & Archiver

> **Note**: 詳細なビジネスルールは CONSTRUCTION フェーズの Functional Design で定義する。
> ここでは高レベルのメソッドシグネチャと責務のみを示す。

---

## BE-01: CsvImportController

```java
// POST /api/csv/import
ImportResultDto importCsv(CsvImportRequest request);
// request: { filePath: String }
// response: { success: boolean, importedCount: int, snapshotDate: LocalDate, errors: List<String> }
```

---

## BE-02: CsvParserService

```java
// 指定パスのCSVを読み込み、内部モデルのリストに変換
List<HoldingRecord> parse(String filePath);

// ファイルの文字コードを判定
Charset detectCharset(Path filePath);
```

**HoldingRecord** (内部モデル):
| フィールド | 型 | CSVカラム |
|---|---|---|
| tickerCode | String | 銘柄（コード） |
| purchaseDate | LocalDate | 買付日 |
| quantity | BigDecimal | 数量 |
| purchasePrice | BigDecimal | 取得単価 |
| currentPrice | BigDecimal | 現在値 |
| dailyChange | BigDecimal | 前日比 |
| dailyChangePct | BigDecimal | 前日比（％） |
| profitLoss | BigDecimal | 損益 |
| profitLossPct | BigDecimal | 損益（％） |
| valuationAmount | BigDecimal | 評価額 |

---

## BE-03: PortfolioAnalysisService

```java
// セクター別構成比を計算
List<SectorAllocation> analyzeSectorAllocation(List<HoldingRecord> holdings, List<StockMeta> meta);

// 評価額・損益の集計
PortfolioSummary summarize(List<HoldingRecord> holdings);

// 前回スナップショットとの差分計算
SnapshotDiff calculateDiff(Snapshot current, Snapshot previous);
// diff: { added: List<HoldingRecord>, removed: List<HoldingRecord>, valuationChange: BigDecimal }

// J-Quantsデータと保有データのマージ
List<EnrichedHolding> mergeWithMeta(List<HoldingRecord> holdings, List<StockMeta> meta);
```

---

## BE-04: JQuantsApiClient

```java
// 銘柄コードリストからメタデータを取得（キャッシュ優先）
List<StockMeta> fetchMetadata(List<String> tickerCodes);

// J-Quants認証（リフレッシュトークン → IDトークン）
String authenticate();

// キャッシュの有効期限確認
boolean isCacheValid(String tickerCode);
```

**StockMeta** (内部モデル):
| フィールド | 型 | 取得元 |
|---|---|---|
| tickerCode | String | — |
| companyName | String | J-Quants |
| sector33Code | String | J-Quants |
| sector33Name | String | J-Quants |
| dividendYield | BigDecimal | J-Quants |
| marketCap | BigDecimal | J-Quants |
| earningsDate | LocalDate | J-Quants |
| pbr | BigDecimal | J-Quants |
| per | BigDecimal | J-Quants |

---

## BE-05: AiPromptGeneratorService

```java
// 構造化AI分析プロンプトを生成
String generatePrompt(PortfolioContext context);
// context: { holdings: List<EnrichedHolding>, summary: PortfolioSummary, diff: SnapshotDiff }

// プロンプトセクションを個別生成（内部用）
String buildPortfolioOverviewSection(PortfolioSummary summary);
String buildMetricsSection(List<EnrichedHolding> holdings);
String buildInvestmentPolicySection();
String buildQuestionsSection(SnapshotDiff diff);
```

**プロンプト構造**:
```
【ポートフォリオ概要】総評価額・総損益・セクター分布サマリー
【指標データ】銘柄ごとのPBR/PER/配当利回り/セクター一覧表
【投資方針】バリュー株・高配当・国策テーマ重視の方針説明
【質問事項】買い増し候補・整理候補の具体的な分析依頼
```

---

## BE-06: SnapshotService

```java
// スナップショットを保存（同日上書き）
Snapshot saveSnapshot(LocalDate date, List<HoldingRecord> holdings);

// 全スナップショット一覧を取得（日付降順）
List<SnapshotSummary> listSnapshots();

// 特定日のスナップショットを取得
Optional<Snapshot> findByDate(LocalDate date);

// 直前のスナップショットを取得（差分計算用）
Optional<Snapshot> findPrevious(LocalDate currentDate);

// 最新スナップショットを取得
Optional<Snapshot> findLatest();
```

---

## BE-07: GoogleDocsArchiveService

```java
// スナップショットをGoogle Docsにアーカイブ（同日上書き）
String archive(Snapshot snapshot, PortfolioAnalysisResult analysis, String aiPrompt);
// returns: Google Doc URL

// サービスアカウント認証の初期化
void initializeCredentials(String keyFilePath);

// 同名ドキュメントを検索
Optional<String> findExistingDoc(String title, String folderId);
// returns: documentId if exists

// ドキュメントコンテンツを構築
String buildDocumentContent(Snapshot snapshot, PortfolioAnalysisResult analysis, String aiPrompt);
```

---

## BE-08: SettingsRepository

```java
// 設定値を取得
Optional<String> get(String key);

// 設定値を保存
void set(String key, String value);

// 全設定を取得
Map<String, String> getAll();
```

**管理する設定キー**:
| キー | 説明 |
|---|---|
| `csv.default.path` | CSVファイルのデフォルトパス |
| `google.drive.folder.id` | アーカイブ先Google DriveフォルダID |
| `jquants.refresh.token` | J-Quants APIリフレッシュトークン |
| `google.sa.key.path` | サービスアカウントJSONキーパス |

---

## フロントエンド APIクライアント（TypeScript）

```typescript
// api/csvApi.ts
importCsv(filePath: string): Promise<ImportResult>

// api/portfolioApi.ts
getLatestPortfolio(): Promise<PortfolioData>
getPrompt(): Promise<string>

// api/historyApi.ts
listSnapshots(): Promise<SnapshotSummary[]>
getDiff(dateA: string, dateB: string): Promise<SnapshotDiff>

// api/settingsApi.ts
getSettings(): Promise<Settings>
saveSettings(settings: Settings): Promise<void>
```
