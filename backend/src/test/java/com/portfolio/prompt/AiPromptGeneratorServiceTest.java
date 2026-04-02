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

        // Company name "-" in holdings table
        assertThat(prompt).contains("| 7203 | - |");
    }

    @Test
    void generate_noPreviousSnapshot_showsNoDiffMessage() {
        PortfolioAnalysisResult analysis = buildAnalysis();  // uses SnapshotDiff.empty()

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("初回スナップショットのため差分なし");
    }

    @Test
    void generate_investmentPolicyIsFixed() {
        PortfolioAnalysisResult analysis = buildAnalysis();

        String prompt = service.generate(analysis, Map.of());

        assertThat(prompt).contains("バリュー株（低PBR・低PER）、高配当銘柄、国策テーマ銘柄");
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
