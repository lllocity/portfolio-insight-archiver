package com.portfolio.analysis;

import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

class PortfolioAnalysisServiceTest {

    private PortfolioAnalysisService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioAnalysisService();
    }

    // --- mergeWithMeta ---

    @Test
    void mergeWithMeta_matchingTicker_includesMeta() {
        Holding h = holding("7203", "280000");
        StockMeta meta = stockMeta("7203", "電機");

        List<EnrichedHolding> result = service.mergeWithMeta(List.of(h), List.of(meta));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).stockMeta()).isNotNull();
        assertThat(result.get(0).getSectorName()).isEqualTo("電機");
    }

    @Test
    void mergeWithMeta_noMatchingMeta_nullStockMeta() {
        Holding h = holding("7203", "280000");

        List<EnrichedHolding> result = service.mergeWithMeta(List.of(h), List.of());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).stockMeta()).isNull();
        assertThat(result.get(0).getSectorName()).isEqualTo("不明");
    }

    @Test
    void mergeWithMeta_mutualFund_sectorIsInvestmentTrust() {
        Holding fundHolding = new Holding("日本成長株ファンド",
            new BigDecimal("293475"), new BigDecimal("17402"), new BigDecimal("22558"),
            new BigDecimal("-273"), new BigDecimal("-1.20"),
            new BigDecimal("151315"), new BigDecimal("29.63"), new BigDecimal("662020"));

        List<EnrichedHolding> result = service.mergeWithMeta(List.of(fundHolding), List.of());

        assertThat(result.get(0).isMutualFund()).isTrue();
        assertThat(result.get(0).getSectorName()).isEqualTo("投資信託");
    }

    // --- analyzeSectorAllocation ---

    @Test
    void analyzeSectorAllocation_calculatesCorrectPct() {
        EnrichedHolding eh1 = new EnrichedHolding(holding("7203", "300000"), stockMeta("7203", "輸送用機器"));
        EnrichedHolding eh2 = new EnrichedHolding(holding("6758", "700000"), stockMeta("6758", "電気機器"));

        List<SectorAllocation> result = service.analyzeSectorAllocation(List.of(eh1, eh2));

        assertThat(result).hasSize(2);
        SectorAllocation electronics = result.stream()
            .filter(s -> s.sector33Name().equals("電気機器")).findFirst().orElseThrow();
        assertThat(electronics.allocationPct()).isEqualByComparingTo(new BigDecimal("70.00"));
    }

    @Test
    void analyzeSectorAllocation_nullMeta_groupedAsUnknown() {
        EnrichedHolding eh = new EnrichedHolding(holding("7203", "500000"), null);

        List<SectorAllocation> result = service.analyzeSectorAllocation(List.of(eh));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).sector33Name()).isEqualTo("不明");
        assertThat(result.get(0).allocationPct()).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    // --- calculateDiff ---

    @Test
    void calculateDiff_noPreviousSnapshot_returnsEmptyDiff() {
        Snapshot current = snapshot(LocalDate.now(), List.of(holding("7203", "280000")));

        SnapshotDiff diff = service.calculateDiff(current, Optional.empty());

        assertThat(diff.isEmpty()).isTrue();
    }

    @Test
    void calculateDiff_newTicker_appearsInAdded() {
        Snapshot previous = snapshot(LocalDate.now().minusDays(7), List.of(holding("6758", "2700000")));
        Snapshot current = snapshot(LocalDate.now(),
            List.of(holding("6758", "2700000"), holding("7203", "280000")));

        SnapshotDiff diff = service.calculateDiff(current, Optional.of(previous));

        assertThat(diff.addedHoldings()).hasSize(1);
        assertThat(diff.addedHoldings().get(0).getTickerCode()).isEqualTo("7203");
        assertThat(diff.removedHoldings()).isEmpty();
    }

    @Test
    void calculateDiff_removedTicker_appearsInRemoved() {
        Snapshot previous = snapshot(LocalDate.now().minusDays(7),
            List.of(holding("6758", "2700000"), holding("7203", "280000")));
        Snapshot current = snapshot(LocalDate.now(), List.of(holding("6758", "2700000")));

        SnapshotDiff diff = service.calculateDiff(current, Optional.of(previous));

        assertThat(diff.removedHoldings()).hasSize(1);
        assertThat(diff.removedHoldings().get(0).getTickerCode()).isEqualTo("7203");
    }

    // --- helpers ---

    private Holding holding(String ticker, String valuation) {
        return new Holding(ticker,
            new BigDecimal("100"),
            new BigDecimal("2500"),
            new BigDecimal("2800"),
            new BigDecimal("50"),
            new BigDecimal("1.82"),
            new BigDecimal("30000"),
            new BigDecimal("12.00"),
            new BigDecimal(valuation));
    }

    private StockMeta stockMeta(String ticker, String sector) {
        return new StockMeta(ticker, "テスト企業", "0010", sector, null, null, null, null, null);
    }

    private Snapshot snapshot(LocalDate date, List<Holding> holdings) {
        Snapshot s = new Snapshot(date, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, holdings.size());
        for (Holding h : holdings) {
            s.addHolding(h);
        }
        return s;
    }
}
