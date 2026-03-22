package com.portfolio.portfolio;

import com.portfolio.analysis.PortfolioAnalysisService;
import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.JQuantsApiClient;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.portfolio.dto.PortfolioResponse;
import com.portfolio.portfolio.dto.PortfolioResponse.*;
import com.portfolio.snapshot.SnapshotService;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioQueryController {

    private static final Logger log = LoggerFactory.getLogger(PortfolioQueryController.class);

    private final SnapshotService snapshotService;
    private final JQuantsApiClient jQuantsApiClient;
    private final PortfolioAnalysisService analysisService;

    public PortfolioQueryController(
        SnapshotService snapshotService,
        JQuantsApiClient jQuantsApiClient,
        PortfolioAnalysisService analysisService
    ) {
        this.snapshotService = snapshotService;
        this.jQuantsApiClient = jQuantsApiClient;
        this.analysisService = analysisService;
    }

    /** GET /api/portfolio/latest — BL-07 */
    @GetMapping("/latest")
    public ResponseEntity<PortfolioResponse> getLatest() {
        Optional<Snapshot> snapshotOpt = snapshotService.findLatest();
        if (snapshotOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        Snapshot snapshot = snapshotOpt.get();
        List<String> tickerCodes = snapshot.getHoldings().stream()
            .map(Holding::getTickerCode).toList();

        List<StockMeta> metaList;
        try {
            metaList = jQuantsApiClient.fetchMetadata(tickerCodes);
        } catch (Exception e) {
            log.warn("J-Quants unavailable on portfolio query, continuing without metadata: {}", e.getMessage());
            metaList = List.of();
        }

        List<EnrichedHolding> enriched = analysisService.mergeWithMeta(snapshot.getHoldings(), metaList);
        List<SectorAllocation> sectors = analysisService.analyzeSectorAllocation(enriched);
        Optional<Snapshot> previous = snapshotService.findLatestBefore(snapshot.getSnapshotDate());
        SnapshotDiff diff = analysisService.calculateDiff(snapshot, previous);

        return ResponseEntity.ok(toResponse(snapshot, enriched, sectors, diff));
    }

    private PortfolioResponse toResponse(Snapshot snapshot, List<EnrichedHolding> enriched,
                                          List<SectorAllocation> sectors, SnapshotDiff diff) {
        SnapshotSummaryDto summaryDto = new SnapshotSummaryDto(
            snapshot.getSnapshotDate().toString(),
            snapshot.getTotalValuation().toPlainString(),
            snapshot.getTotalProfitLoss().toPlainString(),
            snapshot.getTotalProfitLossPct().toPlainString(),
            snapshot.getHoldingCount()
        );

        List<EnrichedHoldingDto> holdingDtos = enriched.stream().map(eh -> {
            Holding h = eh.holding();
            StockMeta m = eh.stockMeta();
            return new EnrichedHoldingDto(
                h.getTickerCode(),
                m != null ? m.getCompanyName() : null,
                eh.getSectorName(),
                h.getTotalQuantity().toPlainString(),
                h.getWeightedAvgPurchasePrice().toPlainString(),
                h.getCurrentPrice().toPlainString(),
                h.getDailyChange().toPlainString(),
                h.getDailyChangePct().toPlainString(),
                h.getTotalProfitLoss().toPlainString(),
                h.getTotalProfitLossPct().toPlainString(),
                h.getTotalValuation().toPlainString(),
                m != null && m.getDividendYield() != null ? m.getDividendYield().toPlainString() : null,
                m != null && m.getPbr() != null ? m.getPbr().toPlainString() : null,
                m != null && m.getPer() != null ? m.getPer().toPlainString() : null
            );
        }).toList();

        List<SectorAllocationDto> sectorDtos = sectors.stream().map(sa ->
            new SectorAllocationDto(sa.sector33Name(), sa.totalValuation().toPlainString(),
                sa.allocationPct().toPlainString(), sa.holdingCount())
        ).toList();

        SnapshotDiffDto diffDto = new SnapshotDiffDto(
            diff.addedHoldings().stream().map(Holding::getTickerCode).toList(),
            diff.removedHoldings().stream().map(Holding::getTickerCode).toList(),
            diff.changedHoldings().stream().map(c ->
                new HoldingChangeDto(c.tickerCode(), c.quantityDiff().toPlainString(),
                    c.valuationDiff().toPlainString())
            ).toList(),
            diff.valuationChange().toPlainString(),
            diff.profitLossChange().toPlainString()
        );

        return new PortfolioResponse(summaryDto, holdingDtos, sectorDtos, diffDto);
    }
}
