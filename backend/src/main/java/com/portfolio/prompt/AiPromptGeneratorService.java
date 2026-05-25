package com.portfolio.prompt;

import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Generates structured AI analysis prompt (BR-PROMPT-01/02).
 * 8-section format for copy-paste to ChatGPT/Claude.
 */
@Service
public class AiPromptGeneratorService {

    private static final NumberFormat JPY_FORMAT = NumberFormat.getNumberInstance(Locale.JAPAN);

    public String generate(PortfolioAnalysisResult analysis, Map<String, String> memos) {
        PortfolioSummary summary = analysis.summary();
        StringBuilder sb = new StringBuilder();

        // Build company name lookup from current holdings
        Map<String, String> nameMap = analysis.enrichedHoldings().stream()
            .collect(Collectors.toMap(
                eh -> eh.holding().getTickerCode(),
                eh -> eh.stockMeta() != null ? nvl(eh.stockMeta().getCompanyName()) : "-"
            ));

        BigDecimal totalDividend = analysis.enrichedHoldings().stream()
            .map(EnrichedHolding::getEstimatedAnnualDividend)
            .filter(d -> d != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Section 1: Overview (table format)
        sb.append("# ポートフォリオ分析依頼\n\n");
        sb.append("## 1. ポートフォリオ概要\n\n");
        sb.append("| 項目 | 値 |\n");
        sb.append("|---|---|\n");
        sb.append("| スナップショット日 | ").append(summary.snapshotDate()).append(" |\n");
        sb.append("| 総評価額 | ¥").append(JPY_FORMAT.format(summary.totalValuation())).append(" |\n");
        sb.append("| 総損益 | ").append(formatPl(summary.totalProfitLoss()))
          .append("（").append(formatPct(summary.totalProfitLossPct())).append("） |\n");
        sb.append("| 保有銘柄数 | ").append(summary.holdingCount()).append("銘柄 |\n");
        sb.append("| セクター数 | ").append(summary.sectorCount()).append("業種 |\n");
        if (totalDividend.compareTo(BigDecimal.ZERO) > 0) {
            sb.append("| 年間配当合計（予想） | ¥").append(JPY_FORMAT.format(totalDividend)).append(" |\n");
            BigDecimal yield = totalDividend.divide(summary.totalValuation(), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
            sb.append("| 配当利回り（予想） | ").append(yield).append("% |\n");
        }
        sb.append("\n");

        // Section 2: Holdings with metrics
        sb.append("## 2. 保有銘柄・指標データ\n\n");
        sb.append("| 銘柄コード | 企業名 | セクター | 数量 | 評価額(円) | 損益率(%) | 年間配当額(円) | 支払い月 |\n");
        sb.append("|---|---|---|---|---|---|---|---|\n");
        for (EnrichedHolding eh : analysis.enrichedHoldings()) {
            Holding h = eh.holding();
            StockMeta meta = eh.stockMeta();
            BigDecimal dividend = eh.getEstimatedAnnualDividend();
            sb.append("| ").append(h.getTickerCode()).append(" | ");
            sb.append(meta != null ? nvl(meta.getCompanyName()) : "-").append(" | ");
            sb.append(eh.getSectorName()).append(" | ");
            sb.append(h.getTotalQuantity()).append(" | ");
            sb.append(JPY_FORMAT.format(h.getTotalValuation())).append(" | ");
            sb.append(h.getTotalProfitLossPct()).append(" | ");
            sb.append(dividend != null ? JPY_FORMAT.format(dividend) : "-").append(" | ");
            sb.append(eh.getDividendMonths() != null ? eh.getDividendMonths() : "-").append(" |\n");
        }
        sb.append("\n");

        // Section 3: Sector allocation
        sb.append("## 3. セクター別構成比\n\n");
        sb.append("| セクター | 構成比(%) | 評価額(円) |\n");
        sb.append("|---|---|---|\n");
        for (SectorAllocation sa : analysis.sectorAllocations()) {
            sb.append("| ").append(sa.sector33Name()).append(" | ")
              .append(sa.allocationPct()).append(" | ")
              .append(JPY_FORMAT.format(sa.totalValuation())).append(" |\n");
        }
        sb.append("\n");

        // Section 4: Diff from previous (table format with company names)
        sb.append("## 4. 前回からの変化\n\n");
        SnapshotDiff diff = analysis.diff();
        if (diff.isEmpty()) {
            sb.append("（初回スナップショットのため差分なし）\n\n");
        } else {
            sb.append("| 変化の種類 | 銘柄コード | 企業名 | 変化内容 |\n");
            sb.append("|---|---|---|---|\n");
            for (Holding h : diff.addedHoldings()) {
                sb.append("| 追加 | ").append(h.getTickerCode()).append(" | ")
                  .append(nameMap.getOrDefault(h.getTickerCode(), "-")).append(" | 新規購入 |\n");
            }
            for (Holding h : diff.removedHoldings()) {
                sb.append("| 除去 | ").append(h.getTickerCode()).append(" | ")
                  .append(nameMap.getOrDefault(h.getTickerCode(), "-")).append(" | 売却・整理 |\n");
            }
            for (HoldingChange c : diff.changedHoldings()) {
                if (c.quantityDiff().compareTo(BigDecimal.ZERO) > 0) {
                    sb.append("| 数量増加 | ").append(c.tickerCode()).append(" | ")
                      .append(nameMap.getOrDefault(c.tickerCode(), "-")).append(" | +")
                      .append(c.quantityDiff().stripTrailingZeros().toPlainString()).append("株 |\n");
                } else if (c.quantityDiff().compareTo(BigDecimal.ZERO) < 0) {
                    sb.append("| 数量減少 | ").append(c.tickerCode()).append(" | ")
                      .append(nameMap.getOrDefault(c.tickerCode(), "-")).append(" | ")
                      .append(c.quantityDiff().stripTrailingZeros().toPlainString()).append("株 |\n");
                }
            }
            sb.append("\n");
        }

        // Section 5: Per-stock memos (only if any exist)
        Map<String, String> memosToPrint = new java.util.LinkedHashMap<>();
        for (EnrichedHolding eh : analysis.enrichedHoldings()) {
            String memo = memos.get(eh.holding().getTickerCode());
            if (memo != null && !memo.isBlank()) {
                memosToPrint.put(eh.holding().getTickerCode(),
                    memo + "|" + (eh.stockMeta() != null ? nvl(eh.stockMeta().getCompanyName()) : "-"));
            }
        }
        if (!memosToPrint.isEmpty()) {
            sb.append("## 5. 銘柄別メモ（保有方針・アドバイス履歴）\n\n");
            sb.append("| 銘柄コード | 企業名 | メモ（保有方針・過去アドバイス） |\n");
            sb.append("|---|---|---|\n");
            memosToPrint.forEach((ticker, val) -> {
                String[] parts = val.split("\\|", 2);
                sb.append("| ").append(ticker).append(" | ")
                  .append(parts[1]).append(" | ")
                  .append(parts[0]).append(" |\n");
            });
            sb.append("\n");
        }

        // Section 6: Investment policy (placeholder — base policy is in CLAUDE.md)
        sb.append("## 6. 投資方針（変更がある場合のみ記入）\n\n");
        sb.append("※ 基本方針はCLAUDE.mdに定義済みのため、変更や補足がある場合のみ記入してください。\n\n");
        sb.append("（変更なし）\n\n");

        // Section 7: Analysis request (checkboxes)
        sb.append("## 7. 分析依頼\n\n");
        sb.append("以下の観点から分析・アドバイスをお願いします:\n\n");
        sb.append("- [ ] 現在のポートフォリオの総合評価\n");
        sb.append("- [ ] 買い増しを検討すべき銘柄とその理由\n");
        sb.append("- [ ] 整理・売却を検討すべき銘柄とその理由（機会コスト比較含む）\n");
        sb.append("- [ ] セクター偏りへの指摘と改善提案\n");
        sb.append("- [ ] 投資方針に合致しているかの評価\n");
        sb.append("- [ ] LINEヤフー削減タイミングの評価\n");
        sb.append("- [ ] 配当収入の評価（配当利回り水準・月別支払い分散の偏り）\n");
        sb.append("- [ ] 配当の観点から買い増し・整理を検討すべき銘柄\n");
        sb.append("- [ ] その他：（自由記入）\n\n");

        // Section 8: Free-form questions (placeholder)
        sb.append("## 8. 今回の気になること・質問（任意）\n\n");
        sb.append("（自由記入）\n");

        return sb.toString();
    }

    private String formatPl(BigDecimal value) {
        if (value == null) return "-";
        String prefix = value.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return prefix + "¥" + JPY_FORMAT.format(value);
    }

    private String formatPct(BigDecimal value) {
        if (value == null) return "-";
        String prefix = value.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return prefix + value + "%";
    }

    private String nvl(String s) {
        return s != null ? s : "-";
    }

}
