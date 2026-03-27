package com.portfolio.snapshot;

import com.portfolio.analysis.PortfolioAnalysisService;
import com.portfolio.analysis.dto.SnapshotDiff;
import com.portfolio.jquants.StockMetaCacheRepository;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.portfolio.dto.PortfolioResponse.HoldingChangeDto;
import com.portfolio.portfolio.dto.PortfolioResponse.SnapshotDiffDto;
import com.portfolio.portfolio.dto.PortfolioResponse.TickerSummaryDto;
import com.portfolio.snapshot.dto.SnapshotHoldingDto;
import com.portfolio.snapshot.dto.SnapshotListItemDto;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/snapshots")
public class SnapshotQueryController {

    private final SnapshotService snapshotService;
    private final PortfolioAnalysisService analysisService;
    private final StockMetaCacheRepository stockMetaCacheRepository;

    public SnapshotQueryController(SnapshotService snapshotService,
                                   PortfolioAnalysisService analysisService,
                                   StockMetaCacheRepository stockMetaCacheRepository) {
        this.snapshotService = snapshotService;
        this.analysisService = analysisService;
        this.stockMetaCacheRepository = stockMetaCacheRepository;
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

    /** GET /api/snapshots/{date}/holdings — 指定日の保有銘柄一覧 */
    @GetMapping("/{date}/holdings")
    public ResponseEntity<List<SnapshotHoldingDto>> getHoldings(
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        Optional<Snapshot> snap = snapshotService.findByDate(date);
        if (snap.isEmpty()) return ResponseEntity.notFound().build();

        List<String> tickers = snap.get().getHoldings().stream()
            .map(Holding::getTickerCode).toList();
        Map<String, StockMeta> metaMap = stockMetaCacheRepository.findAllByTickerCodeIn(tickers).stream()
            .collect(Collectors.toMap(StockMeta::getTickerCode, m -> m));

        List<SnapshotHoldingDto> result = snap.get().getHoldings().stream().map(h -> {
            StockMeta meta = metaMap.get(h.getTickerCode());
            return new SnapshotHoldingDto(
                h.getTickerCode(),
                meta != null ? meta.getCompanyName() : null,
                meta != null ? meta.getSector33Name() : null,
                h.getTotalQuantity().toPlainString(),
                h.getWeightedAvgPurchasePrice().toPlainString(),
                h.getCurrentPrice().toPlainString(),
                h.getDailyChange().toPlainString(),
                h.getDailyChangePct().toPlainString(),
                h.getTotalProfitLoss().toPlainString(),
                h.getTotalProfitLossPct().toPlainString(),
                h.getTotalValuation().toPlainString()
            );
        }).toList();

        return ResponseEntity.ok(result);
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

        // Load meta for all relevant tickers (added, removed, changed)
        Set<String> allTickers = new HashSet<>();
        diff.addedHoldings().forEach(h -> allTickers.add(h.getTickerCode()));
        diff.removedHoldings().forEach(h -> allTickers.add(h.getTickerCode()));
        diff.changedHoldings().forEach(c -> allTickers.add(c.tickerCode()));
        Map<String, StockMeta> metaMap = stockMetaCacheRepository.findAllByTickerCodeIn(List.copyOf(allTickers))
            .stream().collect(Collectors.toMap(StockMeta::getTickerCode, m -> m));

        SnapshotDiffDto dto = new SnapshotDiffDto(
            diff.addedHoldings().stream().map(h -> {
                StockMeta m = metaMap.get(h.getTickerCode());
                return new TickerSummaryDto(h.getTickerCode(), m != null ? m.getCompanyName() : null);
            }).toList(),
            diff.removedHoldings().stream().map(h -> {
                StockMeta m = metaMap.get(h.getTickerCode());
                return new TickerSummaryDto(h.getTickerCode(), m != null ? m.getCompanyName() : null);
            }).toList(),
            diff.changedHoldings().stream().map(c -> {
                StockMeta m = metaMap.get(c.tickerCode());
                return new HoldingChangeDto(
                    c.tickerCode(),
                    m != null ? m.getCompanyName() : null,
                    c.previous().getTotalQuantity().toPlainString(),
                    c.current().getTotalQuantity().toPlainString(),
                    c.quantityDiff().toPlainString(),
                    c.valuationDiff().toPlainString()
                );
            }).toList(),
            diff.valuationChange().toPlainString(),
            diff.profitLossChange().toPlainString()
        );

        return ResponseEntity.ok(dto);
    }
}
