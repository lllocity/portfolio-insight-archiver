package com.portfolio.prompt;

import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

/**
 * Generates structured AI analysis prompt (BR-PROMPT-01/02).
 * Fixed 6-section format for copy-paste to ChatGPT/Claude.
 */
@Service
public class AiPromptGeneratorService {

    private static final NumberFormat JPY_FORMAT = NumberFormat.getNumberInstance(Locale.JAPAN);

    public String generate(PortfolioAnalysisResult analysis) {
        PortfolioSummary summary = analysis.summary();
        StringBuilder sb = new StringBuilder();

        // Section 1: Overview
        sb.append("# ポートフォリオ分析依頼\n\n");
        sb.append("## 1. ポートフォリオ概要\n");
        sb.append("スナップショット日: ").append(summary.snapshotDate()).append("\n");
        sb.append("総評価額: ¥").append(JPY_FORMAT.format(summary.totalValuation())).append("\n");
        sb.append("総損益: ").append(formatPl(summary.totalProfitLoss()))
          .append(" (").append(summary.totalProfitLossPct()).append("%)\n");
        sb.append("保有銘柄数: ").append(summary.holdingCount()).append("銘柄\n");
        sb.append("セクター数: ").append(summary.sectorCount()).append("業種\n\n");

        // Section 2: Holdings with metrics
        sb.append("## 2. 保有銘柄・指標データ\n");
        sb.append("| 銘柄コード | 企業名 | セクター | 数量 | 評価額(円) | 損益率(%) | 配当利回り(%) | PBR | PER |\n");
        sb.append("|---|---|---|---|---|---|---|---|---|\n");

        for (EnrichedHolding eh : analysis.enrichedHoldings()) {
            Holding h = eh.holding();
            StockMeta meta = eh.stockMeta();
            sb.append("| ").append(h.getTickerCode()).append(" | ");
            sb.append(meta != null ? nvl(meta.getCompanyName()) : "-").append(" | ");
            sb.append(eh.getSectorName()).append(" | ");
            sb.append(h.getTotalQuantity()).append(" | ");
            sb.append(JPY_FORMAT.format(h.getTotalValuation())).append(" | ");
            sb.append(h.getTotalProfitLossPct()).append(" | ");
            sb.append(meta != null ? nvlDecimal(meta.getDividendYield()) : "-").append(" | ");
            sb.append(meta != null ? nvlDecimal(meta.getPbr()) : "-").append(" | ");
            sb.append(meta != null ? nvlDecimal(meta.getPer()) : "-").append(" |\n");
        }
        sb.append("※ PBR/PERは取得できた場合のみ表示\n\n");

        // Section 3: Sector allocation
        sb.append("## 3. セクター別構成比\n");
        sb.append("| セクター | 構成比(%) | 評価額(円) |\n");
        sb.append("|---|---|---|\n");
        for (SectorAllocation sa : analysis.sectorAllocations()) {
            sb.append("| ").append(sa.sector33Name()).append(" | ")
              .append(sa.allocationPct()).append(" | ")
              .append(JPY_FORMAT.format(sa.totalValuation())).append(" |\n");
        }
        sb.append("\n");

        // Section 4: Diff from previous
        sb.append("## 4. 前回からの変化");
        SnapshotDiff diff = analysis.diff();
        if (diff.isEmpty()) {
            sb.append("\n（初回スナップショットのため差分なし）\n\n");
        } else {
            sb.append("\n");
            appendDiffSection(sb, "追加銘柄", diff.addedHoldings().stream()
                .map(Holding::getTickerCode).toList());
            appendDiffSection(sb, "除去銘柄", diff.removedHoldings().stream()
                .map(Holding::getTickerCode).toList());
            appendDiffSection(sb, "数量増加", diff.changedHoldings().stream()
                .filter(c -> c.quantityDiff().compareTo(BigDecimal.ZERO) > 0)
                .map(c -> c.tickerCode() + "(" + c.quantityDiff() + ")")
                .toList());
            appendDiffSection(sb, "数量減少", diff.changedHoldings().stream()
                .filter(c -> c.quantityDiff().compareTo(BigDecimal.ZERO) < 0)
                .map(c -> c.tickerCode() + "(" + c.quantityDiff() + ")")
                .toList());
            sb.append("\n");
        }

        // Section 5: Investment policy (fixed text — BR-PROMPT-01)
        sb.append("## 5. 投資方針\n");
        sb.append("バリュー株（低PBR・低PER）、高配当銘柄、国策テーマ銘柄（造船・銀行・保険・防衛等）を重視したポートフォリオを構築しています。\n\n");

        // Section 6: Analysis request
        sb.append("## 6. 分析依頼\n");
        sb.append("以下の観点から分析・アドバイスをお願いします:\n");
        sb.append("1. 現在のポートフォリオの総合評価\n");
        sb.append("2. 買い増しを検討すべき銘柄とその理由\n");
        sb.append("3. 整理・売却を検討すべき銘柄とその理由\n");
        sb.append("4. セクター偏りへの指摘と改善提案\n");
        sb.append("5. 投資方針に合致しているかの評価\n");

        return sb.toString();
    }

    private void appendDiffSection(StringBuilder sb, String label, List<String> items) {
        sb.append(label).append(": ");
        if (items.isEmpty()) {
            sb.append("なし");
        } else {
            sb.append(String.join(", ", items));
        }
        sb.append("\n");
    }

    private String formatPl(BigDecimal value) {
        if (value == null) return "-";
        String prefix = value.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return prefix + "¥" + JPY_FORMAT.format(value);
    }

    private String nvl(String s) {
        return s != null ? s : "-";
    }

    private String nvlDecimal(BigDecimal d) {
        return d != null ? d.toPlainString() : "-";
    }
}
