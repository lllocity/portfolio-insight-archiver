package com.portfolio.snapshot;

import com.portfolio.analysis.ImportOrchestrationService;
import com.portfolio.csv.dto.HoldingRecord;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class SnapshotService {

    private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);

    private final SnapshotRepository snapshotRepository;

    public SnapshotService(SnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    /**
     * Saves a new snapshot for today, overwriting any existing same-day snapshot (BR-SNAP-01).
     */
    @Transactional
    public Snapshot save(LocalDate date, List<HoldingRecord> records) {
        // Delete existing snapshot for today (BR-SNAP-01)
        snapshotRepository.findBySnapshotDate(date).ifPresent(existing -> {
            log.info("Overwriting existing snapshot for date: {}", date);
            snapshotRepository.delete(existing);
            snapshotRepository.flush();
        });

        // Compute totals (BR-SNAP-02)
        BigDecimal totalValuation = records.stream()
            .map(HoldingRecord::totalValuation)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfitLoss = records.stream()
            .map(HoldingRecord::totalProfitLoss)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfitLossPct = ImportOrchestrationService.computeProfitLossPct(records);

        Snapshot snapshot = new Snapshot(date, totalValuation, totalProfitLoss, totalProfitLossPct, records.size());

        for (HoldingRecord r : records) {
            Holding holding = new Holding(
                r.tickerCode(),
                r.totalQuantity(),
                r.weightedAvgPurchasePrice(),
                r.currentPrice(),
                r.dailyChange(),
                r.dailyChangePct(),
                r.totalProfitLoss(),
                r.totalProfitLossPct(),
                r.totalValuation()
            );
            snapshot.addHolding(holding);
        }

        return snapshotRepository.save(snapshot);
    }

    @Transactional(readOnly = true)
    public Optional<Snapshot> findLatest() {
        return snapshotRepository.findLatest();
    }

    @Transactional(readOnly = true)
    public Optional<Snapshot> findLatestBefore(LocalDate date) {
        return snapshotRepository.findLatestBefore(date);
    }

    @Transactional(readOnly = true)
    public List<Snapshot> findAll() {
        return snapshotRepository.findAllByOrderBySnapshotDateDesc();
    }

    @Transactional(readOnly = true)
    public Optional<Snapshot> findByDate(LocalDate date) {
        return snapshotRepository.findBySnapshotDate(date);
    }
}
