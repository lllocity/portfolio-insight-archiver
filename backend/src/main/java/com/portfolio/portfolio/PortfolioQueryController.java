package com.portfolio.portfolio;

import com.portfolio.analysis.PortfolioAnalysisService;
import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.StockMetaCacheRepository;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.memo.StockMemoRepository;
import com.portfolio.portfolio.dto.PortfolioResponse;
import com.portfolio.portfolio.dto.PortfolioResponse.*;
import com.portfolio.snapshot.SnapshotService;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioQueryController {

    private final SnapshotService snapshotService;
    private final StockMetaCacheRepository stockMetaCacheRepository;
    private final PortfolioAnalysisService analysisService;
    private final StockMemoRepository stockMemoRepository;

    public PortfolioQueryController(
        SnapshotService snapshotService,
        StockMetaCacheRepository stockMetaCacheRepository,
        PortfolioAnalysisService analysisService,
        StockMemoRepository stockMemoRepository
    ) {
        this.snapshotService = snapshotService;
        this.stockMetaCacheRepository = stockMetaCacheRepository;
        this.analysisService = analysisService;
        this.stockMemoRepository = stockMemoRepository;
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

        Map<String, StockMeta> metaMap = stockMetaCacheRepository.findAllByTickerCodeIn(tickerCodes)
            .stream().collect(Collectors.toMap(StockMeta::getTickerCode, m -> m));

        Map<String, String> memoMap = stockMemoRepository.findAllByTickerCodeIn(tickerCodes)
            .stream().collect(Collectors.toMap(m -> m.getTickerCode(), m -> m.getContent()));

        List<EnrichedHolding> enriched = analysisService.mergeWithMeta(snapshot.getHoldings(),
            List.copyOf(metaMap.values()));
        List<SectorAllocation> sectors = analysisService.analyzeSectorAllocation(enriched);

        return ResponseEntity.ok(toResponse(snapshot, enriched, sectors, memoMap));
    }

    private PortfolioResponse toResponse(Snapshot snapshot, List<EnrichedHolding> enriched,
                                          List<SectorAllocation> sectors, Map<String, String> memoMap) {
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
                memoMap.get(h.getTickerCode()),
                eh.getEstimatedAnnualDividend() != null
                    ? eh.getEstimatedAnnualDividend().toPlainString() : null,
                eh.getDividendMonths()
            );
        }).toList();

        List<SectorAllocationDto> sectorDtos = sectors.stream().map(sa ->
            new SectorAllocationDto(sa.sector33Name(), sa.totalValuation().toPlainString(),
                sa.allocationPct().toPlainString(), sa.holdingCount())
        ).toList();

        return new PortfolioResponse(summaryDto, holdingDtos, sectorDtos);
    }
}
