package com.portfolio.snapshot;

import com.portfolio.analysis.PortfolioAnalysisService;
import com.portfolio.analysis.dto.SnapshotDiff;
import com.portfolio.snapshot.dto.SnapshotListItemDto;
import com.portfolio.snapshot.model.Snapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SnapshotQueryControllerTest {

    private SnapshotService snapshotService;
    private PortfolioAnalysisService analysisService;
    private SnapshotQueryController controller;

    @BeforeEach
    void setUp() {
        snapshotService = mock(SnapshotService.class);
        analysisService = mock(PortfolioAnalysisService.class);
        controller = new SnapshotQueryController(snapshotService, analysisService);
    }

    @Test
    void listSnapshots_returnsAllInDescOrder() {
        Snapshot s1 = snapshot(LocalDate.of(2026, 3, 17), "4800000");
        Snapshot s2 = snapshot(LocalDate.of(2026, 3, 24), "5000000");
        when(snapshotService.findAll()).thenReturn(List.of(s2, s1));

        var response = controller.listSnapshots();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        List<SnapshotListItemDto> items = response.getBody();
        assertThat(items).hasSize(2);
        assertThat(items.get(0).snapshotDate()).isEqualTo("2026-03-24");
        assertThat(items.get(1).snapshotDate()).isEqualTo("2026-03-17");
    }

    @Test
    void listSnapshots_empty_returnsEmptyList() {
        when(snapshotService.findAll()).thenReturn(List.of());

        var response = controller.listSnapshots();

        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void getSnapshotDiff_missingFromDate_returns404() {
        when(snapshotService.findByDate(LocalDate.of(2026, 3, 17))).thenReturn(Optional.empty());
        when(snapshotService.findByDate(LocalDate.of(2026, 3, 24)))
            .thenReturn(Optional.of(snapshot(LocalDate.of(2026, 3, 24), "5000000")));

        var response = controller.getSnapshotDiff(
            LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 24));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void getSnapshotDiff_bothExist_returnsDiff() {
        Snapshot from = snapshot(LocalDate.of(2026, 3, 17), "4800000");
        Snapshot to = snapshot(LocalDate.of(2026, 3, 24), "5000000");
        when(snapshotService.findByDate(LocalDate.of(2026, 3, 17))).thenReturn(Optional.of(from));
        when(snapshotService.findByDate(LocalDate.of(2026, 3, 24))).thenReturn(Optional.of(to));

        SnapshotDiff diff = new SnapshotDiff(List.of(), List.of(), List.of(),
            new BigDecimal("200000"), BigDecimal.ZERO);
        when(analysisService.calculateDiff(to, Optional.of(from))).thenReturn(diff);

        var response = controller.getSnapshotDiff(
            LocalDate.of(2026, 3, 17), LocalDate.of(2026, 3, 24));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().valuationChange()).isEqualTo("200000");
    }

    private Snapshot snapshot(LocalDate date, String valuation) {
        return new Snapshot(date, new BigDecimal(valuation), BigDecimal.ZERO, BigDecimal.ZERO, 5);
    }
}
