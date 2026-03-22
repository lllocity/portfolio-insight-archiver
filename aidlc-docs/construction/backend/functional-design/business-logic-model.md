# Business Logic Model — backend

---

## BL-01: CSVインポートオーケストレーション

**トリガー**: `POST /api/csv/import { filePath }`

```
ImportOrchestrationService.execute(filePath)
│
├─[1] CsvParserService.parse(filePath)
│        ├─ Shift-JISで読み込み
│        ├─ ヘッダー行を検出・スキップ
│        ├─ 各行をHoldingRecordにマッピング
│        └─ 同一銘柄コードを集約（BR-CSV-04）
│        → List<HoldingRecord> または ParseException
│
├─[2] SnapshotService.findPrevious(today)
│        → Optional<Snapshot> previousSnapshot
│
├─[3] JQuantsApiClient.fetchMetadata(tickerCodes)
│        ├─ キャッシュ確認（24時間以内ならSQLiteから返す）
│        ├─ 未キャッシュ分をJ-Quants APIに問い合わせ
│        ├─ 結果をSQLiteにキャッシュ保存
│        └─ 失敗時: 警告を記録して空Listを返す（グレースフル）
│        → List<StockMeta>
│
├─[4] PortfolioAnalysisService.analyze(holdings, meta, previousSnapshot)
│        ├─ mergeWithMeta() → List<EnrichedHolding>
│        ├─ summarize()     → PortfolioSummary
│        ├─ analyzeSectorAllocation() → List<SectorAllocation>
│        └─ calculateDiff() → SnapshotDiff（前回なければ空）
│        → PortfolioAnalysisResult
│
├─[5] SnapshotService.save(today, holdings, summary)
│        ├─ 同日スナップショットが存在する場合は削除（BR-SNAP-01）
│        └─ Snapshot + Holdings をSQLiteに保存
│        → Snapshot
│
├─[6] AiPromptGeneratorService.generate(enrichedHoldings, analysis)
│        ├─ セクション1: ポートフォリオ概要
│        ├─ セクション2: 指標データテーブル
│        ├─ セクション3: セクター別構成比テーブル
│        ├─ セクション4: 前回からの変化
│        ├─ セクション5: 投資方針（固定テキスト）
│        └─ セクション6: 分析依頼
│        → String promptText
│
└─[7] GoogleDocsArchiveService.archive(snapshot, analysis, promptText)
         ├─ サービスアカウント未設定 → スキップ（BR-GDOCS-04）
         ├─ 同名ドキュメント検索 → 存在すれば削除（BR-GDOCS-02）
         ├─ 新規ドキュメント作成
         └─ コンテンツ書き込み（リッチフォーマット）（BR-GDOCS-03）
         → String docUrl または null（失敗時）

→ ImportResultDto {
    success: true,
    snapshotDate: YYYY-MM-DD,
    importedCount: N,
    docUrl: "https://...",  // null if skipped/failed
    warnings: [...]         // J-Quants/Google Docs の警告
  }
```

---

## BL-02: 銘柄集約アルゴリズム

入力: CSVの複数行（同一銘柄コードあり）
出力: 銘柄コードごとに集約されたHoldingRecord

```
Map<tickerCode, List<RawRow>> groupedRows = CSVの全行をticklerCodeでグループ化

for each (tickerCode, rows) in groupedRows:
    totalQuantity          = Σ rows[i].quantity
    totalCost              = Σ (rows[i].quantity × rows[i].purchasePrice)
    weightedAvgPrice       = totalCost / totalQuantity
    totalValuation         = Σ rows[i].valuationAmount
    totalProfitLoss        = Σ rows[i].profitLoss
    totalProfitLossPct     = totalProfitLoss / totalCost × 100
    currentPrice           = rows[0].currentPrice    // 同一銘柄は同値
    dailyChange            = rows[0].dailyChange
    dailyChangePct         = rows[0].dailyChangePct

    yield HoldingRecord(tickerCode, totalQuantity, weightedAvgPrice,
                        currentPrice, dailyChange, dailyChangePct,
                        totalProfitLoss, totalProfitLossPct, totalValuation)
```

---

## BL-03: セクター構成比計算

```
input: List<EnrichedHolding>

sectorMap = Map<sector33Name, BigDecimal>  // セクター → 評価額合計

for each holding in enrichedHoldings:
    sectorName = holding.stockMeta?.sector33Name ?? "不明"
    sectorMap[sectorName] += holding.holding.totalValuation

totalValuation = Σ all valuations

for each (sectorName, sectorValuation) in sectorMap:
    allocationPct = (sectorValuation / totalValuation × 100).roundTo(2)
    yield SectorAllocation(sectorName, sectorValuation, allocationPct, count)
```

---

## BL-04: スナップショット差分計算

```
input: currentSnapshot, previousSnapshot (Optional)

if previousSnapshot is empty:
    return SnapshotDiff.empty()

currentMap  = Map<tickerCode, Holding> from currentSnapshot
previousMap = Map<tickerCode, Holding> from previousSnapshot

added   = currentMap.keys  - previousMap.keys  → List<Holding>
removed = previousMap.keys - currentMap.keys   → List<Holding>
changed = currentMap.keys ∩ previousMap.keys
            .filter { currentMap[it] differs from previousMap[it] }
            .map { HoldingChange(previous=previousMap[it], current=currentMap[it]) }

valuationChange   = currentSnapshot.totalValuation - previousSnapshot.totalValuation
profitLossChange  = currentSnapshot.totalProfitLoss - previousSnapshot.totalProfitLoss

return SnapshotDiff(added, removed, changed, valuationChange, profitLossChange)
```

「differs」の判定:
- `totalQuantity` が異なる、または
- `totalValuation` が異なる

---

## BL-05: J-Quants ID Token取得フロー

```
fetchIdToken():
    if idToken in memoryCache AND not expired:
        return cachedIdToken

    refreshToken = settingsRepository.get("jquants.refresh.token")
    if refreshToken is null:
        throw JQuantsNotConfiguredException

    response = POST /v1/token/auth_refresh { refreshToken }
    idToken = response.idToken
    expiresAt = now() + 24 hours

    memoryCache.set(idToken, expiresAt)
    return idToken
```

---

## BL-06: Google Docs コンテンツ構築

```
buildDocument(snapshot, analysis, promptText):
    doc = []

    // HEADING_1
    doc.append(heading1("${snapshot.snapshotDate} ポートフォリオスナップショット"))

    // HEADING_2: サマリー
    doc.append(heading2("サマリー"))
    doc.append(paragraph(
        "総評価額: ¥${format(snapshot.totalValuation)} | " +
        "総損益: ${format(snapshot.totalProfitLoss)} (${snapshot.totalProfitLossPct}%)"
    ))

    // HEADING_2: 保有銘柄リスト
    doc.append(heading2("保有銘柄リスト"))
    doc.append(table(
        headers: ["銘柄コード","企業名","セクター","数量","評価額","損益","損益率"],
        rows: analysis.enrichedHoldings.map { toRow(it) }
    ))

    // HEADING_2: セクター別構成比
    doc.append(heading2("セクター別構成比"))
    doc.append(table(
        headers: ["セクター","評価額","構成比"],
        rows: analysis.sectorAllocations.map { toRow(it) }
    ))

    // HEADING_2: 前回からの差分
    doc.append(heading2("前回スナップショットとの差分"))
    if analysis.diff.isEmpty:
        doc.append(paragraph("（初回スナップショットのため差分なし）"))
    else:
        doc.append(paragraph("前回: ${previousSnapshot.snapshotDate}"))
        doc.append(diffTable(analysis.diff))

    // HEADING_2: AI分析プロンプト
    doc.append(heading2("AI分析プロンプト"))
    doc.append(paragraph(promptText))

    return doc
```

---

## BL-07: ポートフォリオ参照フロー（GET /api/portfolio/latest）

```
PortfolioQueryController.getLatest():
    snapshot = SnapshotService.findLatest()
    if snapshot is empty → return 204 No Content

    tickerCodes = snapshot.holdings.map { it.tickerCode }
    meta        = JQuantsApiClient.fetchMetadata(tickerCodes)  // キャッシュ優先
    enriched    = PortfolioAnalysisService.mergeWithMeta(snapshot.holdings, meta)
    summary     = snapshot (totalValuation, totalProfitLoss, etc.)
    sectors     = PortfolioAnalysisService.analyzeSectorAllocation(enriched)
    previous    = SnapshotService.findPrevious(snapshot.snapshotDate)
    diff        = PortfolioAnalysisService.calculateDiff(snapshot, previous)

    return PortfolioData { snapshot, enrichedHoldings, sectors, diff }
```
