package com.portfolio.prompt;

import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class AiPromptGeneratorServiceTest {

    private AiPromptGeneratorService service;

    @BeforeEach
    void setUp() {
        service = new AiPromptGeneratorService();
    }

    @Test
    void generate_containsAllMandatorySections() {
        PortfolioAnalysisResult analysis = buildAnalysis();

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("## 1. ポートフォリオ概要");
        assertThat(prompt).contains("## 2. 保有銘柄・指標データ");
        assertThat(prompt).contains("## 3. セクター別構成比");
        assertThat(prompt).contains("## 4. 前回からの変化");
        assertThat(prompt).contains("## 6. 投資方針");
        assertThat(prompt).contains("## 7. 分析依頼");
        assertThat(prompt).contains("## 8. 今回の気になること・質問");
    }

    @Test
    void generate_overviewIsTable() {
        PortfolioAnalysisResult analysis = buildAnalysis();

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("| スナップショット日 | 2024-03-01 |");
        assertThat(prompt).contains("| 総評価額 | ¥280,000 |");
        assertThat(prompt).contains("| 保有銘柄数 | 1銘柄 |");
    }

    @Test
    void generate_noMeta_showsDashes() {
        EnrichedHolding eh = new EnrichedHolding(holding("7203"), null);
        PortfolioSummary summary = new PortfolioSummary(
            LocalDate.of(2024, 3, 1), new BigDecimal("280000"),
            new BigDecimal("30000"), new BigDecimal("12.00"), 1, 1);
        PortfolioAnalysisResult analysis = new PortfolioAnalysisResult(
            summary, List.of(eh),
            List.of(new SectorAllocation("不明", new BigDecimal("280000"), new BigDecimal("100.00"), 1)),
            SnapshotDiff.empty()
        );

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("| 7203 | - |");
    }

    @Test
    void generate_noPreviousSnapshot_showsNoDiffMessage() {
        PortfolioAnalysisResult analysis = buildAnalysis();

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("初回スナップショットのため差分なし");
    }

    @Test
    void generate_diffSection_showsTable() {
        StockMeta meta = new StockMeta("7203", "トヨタ自動車", "0050", "輸送用機器",
            null, null, null, null, null);
        EnrichedHolding eh = new EnrichedHolding(holding("7203"), meta);
        PortfolioSummary summary = new PortfolioSummary(
            LocalDate.of(2024, 3, 1), new BigDecimal("280000"),
            new BigDecimal("30000"), new BigDecimal("12.00"), 1, 1);

        Holding added = holding("6758");
        Holding removed = holding("9984");
        HoldingChange increased = new HoldingChange("7203", new BigDecimal("50"),
            new BigDecimal("10000"), holding("7203"), holding("7203"));
        SnapshotDiff diff = new SnapshotDiff(
            List.of(added), List.of(removed), List.of(increased),
            BigDecimal.ZERO, BigDecimal.ZERO);

        PortfolioAnalysisResult analysis = new PortfolioAnalysisResult(
            summary, List.of(eh),
            List.of(new SectorAllocation("輸送用機器", new BigDecimal("280000"), new BigDecimal("100.00"), 1)),
            diff);

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("| 変化の種類 | 銘柄コード | 企業名 | 変化内容 |");
        assertThat(prompt).contains("| 追加 | 6758 |");
        assertThat(prompt).contains("| 除去 | 9984 |");
        assertThat(prompt).contains("| 数量増加 | 7203 | トヨタ自動車 | +50株 |");
    }

    @Test
    void generate_withDividendData_showsDividendColumnsAndSummary() {
        StockMeta meta = new StockMeta("7203", "トヨタ自動車", "0050", "輸送用機器",
            null, null, null, null, null);
        meta.setDividendData(new BigDecimal("10"), "3,9");
        EnrichedHolding eh = new EnrichedHolding(holding("7203"), meta);
        PortfolioSummary summary = new PortfolioSummary(
            LocalDate.of(2024, 3, 1), new BigDecimal("280000"),
            new BigDecimal("30000"), new BigDecimal("12.00"), 1, 1);
        PortfolioAnalysisResult analysis = new PortfolioAnalysisResult(
            summary, List.of(eh),
            List.of(new SectorAllocation("輸送用機器", new BigDecimal("280000"), new BigDecimal("100.00"), 1)),
            SnapshotDiff.empty());

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("年間配当額(円)");
        assertThat(prompt).contains("支払い月");
        assertThat(prompt).contains("1,000");   // 10 dps × 100 shares
        assertThat(prompt).contains("3月・9月頃");
        assertThat(prompt).contains("年間配当合計（予想）");
        assertThat(prompt).contains("配当利回り（予想）");
        assertThat(prompt).contains("配当収入の評価");
        assertThat(prompt).contains("配当の観点から買い増し・整理を検討すべき銘柄");
    }

    @Test
    void generate_noDividendData_showsDashes() {
        String prompt = service.generate(buildAnalysis(), Map.of());

        assertThat(prompt).contains("年間配当額(円)");
        assertThat(prompt).doesNotContain("年間配当合計（予想）");
    }

    @Test
    void generate_investmentPolicyShowsPlaceholder() {
        PortfolioAnalysisResult analysis = buildAnalysis();

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("（変更なし）");
        assertThat(prompt).doesNotContain("バリュー株（低PBR・低PER）");
    }

    @Test
    void generate_analysisRequestUsesCheckboxes() {
        PortfolioAnalysisResult analysis = buildAnalysis();

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("- [ ] 現在のポートフォリオの総合評価");
        assertThat(prompt).contains("- [ ] 整理・売却を検討すべき銘柄とその理由（機会コスト比較含む）");
        assertThat(prompt).contains("- [ ] LINEヤフー削減タイミングの評価");
        assertThat(prompt).contains("- [ ] その他：（自由記入）");
    }

    private PortfolioAnalysisResult buildAnalysis() {
        StockMeta meta = new StockMeta("7203", "トヨタ自動車", "0050", "輸送用機器",
            new BigDecimal("2.5"), new BigDecimal("30000000"), null, null, null);
        EnrichedHolding eh = new EnrichedHolding(holding("7203"), meta);
        PortfolioSummary summary = new PortfolioSummary(
            LocalDate.of(2024, 3, 1), new BigDecimal("280000"),
            new BigDecimal("30000"), new BigDecimal("12.00"), 1, 1);
        return new PortfolioAnalysisResult(
            summary, List.of(eh),
            List.of(new SectorAllocation("輸送用機器", new BigDecimal("280000"), new BigDecimal("100.00"), 1)),
            SnapshotDiff.empty()
        );
    }

    private Holding holding(String ticker) {
        return new Holding(ticker, new BigDecimal("100"), new BigDecimal("2500"),
            new BigDecimal("2800"), new BigDecimal("50"), new BigDecimal("1.82"),
            new BigDecimal("30000"), new BigDecimal("12.00"), new BigDecimal("280000"));
    }
}
