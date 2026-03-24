package com.portfolio.snapshot;

import com.portfolio.analysis.PortfolioAnalysisService;
import com.portfolio.analysis.dto.SnapshotDiff;
import com.portfolio.portfolio.dto.PortfolioResponse.SnapshotDiffDto;
import com.portfolio.portfolio.dto.PortfolioResponse.HoldingChangeDto;
import com.portfolio.snapshot.dto.SnapshotListItemDto;
import com.portfolio.snapshot.model.Snapshot;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/snapshots")
public class SnapshotQueryController {

    private final SnapshotService snapshotService;
    private final PortfolioAnalysisService analysisService;

    public SnapshotQueryController(SnapshotService snapshotService,
                                   PortfolioAnalysisService analysisService) {
        this.snapshotService = snapshotService;
        this.analysisService = analysisService;
    }

    /** GET /api/snapshots — 全スナップショット一覧（日付降順）*/
    @GetMapping
    public ResponseEntity<List<SnapshotListItemDto>> listSnapshots() {
        List<SnapshotListItemDto> items = snapshotService.findAll().stream()
            .map(s -> new SnapshotListItemDto(
                s.getSnapshotDate().toString(),
                s.getTotalValuation().toPlainString(),
                s.getTotalProfitLoss().toPlainString(),
                s.getTotalProfitLossPct().toPlainString(),
                s.getHoldingCount()
            ))
            .toList();
        return ResponseEntity.ok(items);
    }

    /** GET /api/snapshots/diff?from={date}&to={date} — 2スナップショット間の差分 */
    @GetMapping("/diff")
    public ResponseEntity<SnapshotDiffDto> getSnapshotDiff(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        Optional<Snapshot> fromSnap = snapshotService.findByDate(from);
        Optional<Snapshot> toSnap = snapshotService.findByDate(to);

        if (fromSnap.isEmpty() || toSnap.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SnapshotDiff diff = analysisService.calculateDiff(toSnap.get(), Optional.of(fromSnap.get()));

        SnapshotDiffDto dto = new SnapshotDiffDto(
            diff.addedHoldings().stream().map(h -> h.getTickerCode()).toList(),
            diff.removedHoldings().stream().map(h -> h.getTickerCode()).toList(),
            diff.changedHoldings().stream().map(c ->
                new HoldingChangeDto(c.tickerCode(), c.quantityDiff().toPlainString(),
                    c.valuationDiff().toPlainString())
            ).toList(),
            diff.valuationChange().toPlainString(),
            diff.profitLossChange().toPlainString()
        );

        return ResponseEntity.ok(dto);
    }
}
