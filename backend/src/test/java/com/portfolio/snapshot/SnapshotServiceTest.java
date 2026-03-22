package com.portfolio.snapshot;

import com.portfolio.csv.dto.HoldingRecord;
import com.portfolio.snapshot.model.Snapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SnapshotServiceTest {

    @Mock
    private SnapshotRepository snapshotRepository;

    @InjectMocks
    private SnapshotService snapshotService;

    private static final LocalDate TODAY = LocalDate.of(2024, 3, 1);

    @BeforeEach
    void setUp() {
        when(snapshotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void save_noPreviousSnapshot_savesNewSnapshot() {
        when(snapshotRepository.findBySnapshotDate(TODAY)).thenReturn(Optional.empty());
        List<HoldingRecord> records = List.of(holdingRecord("7203", "100", "280000", "30000"));

        Snapshot result = snapshotService.save(TODAY, records);

        assertThat(result.getSnapshotDate()).isEqualTo(TODAY);
        assertThat(result.getHoldingCount()).isEqualTo(1);
        verify(snapshotRepository, never()).delete(any());
        verify(snapshotRepository).save(any());
    }

    @Test
    void save_existingSnapshotSameDay_deletesOldBeforeSaving() {
        Snapshot existing = new Snapshot(TODAY, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0);
        when(snapshotRepository.findBySnapshotDate(TODAY)).thenReturn(Optional.of(existing));
        List<HoldingRecord> records = List.of(holdingRecord("7203", "100", "280000", "30000"));

        snapshotService.save(TODAY, records);

        verify(snapshotRepository).delete(existing);
        verify(snapshotRepository).flush();
        verify(snapshotRepository).save(any());
    }

    @Test
    void save_multipleRecords_correctTotals() {
        when(snapshotRepository.findBySnapshotDate(TODAY)).thenReturn(Optional.empty());
        List<HoldingRecord> records = List.of(
            holdingRecord("7203", "100", "280000", "30000"),
            holdingRecord("6758", "50", "2700000", "300000")
        );

        Snapshot result = snapshotService.save(TODAY, records);

        assertThat(result.getTotalValuation()).isEqualByComparingTo(new BigDecimal("2980000"));
        assertThat(result.getTotalProfitLoss()).isEqualByComparingTo(new BigDecimal("330000"));
        assertThat(result.getHoldingCount()).isEqualTo(2);
    }

    private HoldingRecord holdingRecord(String ticker, String qty, String valuation, String profitLoss) {
        return new HoldingRecord(
            ticker,
            new BigDecimal(qty),
            new BigDecimal("2500"),
            new BigDecimal("2800"),
            new BigDecimal("50"),
            new BigDecimal("1.82"),
            new BigDecimal(profitLoss),
            new BigDecimal("12.00"),
            new BigDecimal(valuation)
        );
    }
}
