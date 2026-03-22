package com.portfolio.analysis;

import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioAnalysisService {

    /**
     * Merges holdings with J-Quants metadata.
     * If metadata is missing for a ticker, stockMeta will be null (graceful degradation).
     */
    public List<EnrichedHolding> mergeWithMeta(List<Holding> holdings, List<StockMeta> metaList) {
        Map<String, StockMeta> metaMap = metaList.stream()
            .collect(Collectors.toMap(StockMeta::getTickerCode, m -> m));

        return holdings.stream()
            .map(h -> new EnrichedHolding(h, metaMap.get(h.getTickerCode())))
            .toList();
    }

    /**
     * Calculates sector allocation from enriched holdings (BR-SECTOR-01~03).
     */
    public List<SectorAllocation> analyzeSectorAllocation(List<EnrichedHolding> enrichedHoldings) {
        Map<String, BigDecimal> sectorValuation = new LinkedHashMap<>();
        Map<String, Integer> sectorCount = new LinkedHashMap<>();

        for (EnrichedHolding eh : enrichedHoldings) {
            String sector = eh.getSectorName(); // returns "不明" if null
            BigDecimal val = eh.holding().getTotalValuation();
            sectorValuation.merge(sector, val, BigDecimal::add);
            sectorCount.merge(sector, 1, Integer::sum);
        }

        BigDecimal totalValuation = sectorValuation.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return sectorValuation.entrySet().stream()
            .map(entry -> {
                String sector = entry.getKey();
                BigDecimal val = entry.getValue();
                BigDecimal pct = totalValuation.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : val.divide(totalValuation, 6, RoundingMode.HALF_UP)
                         .multiply(BigDecimal.valueOf(100))
                         .setScale(2, RoundingMode.HALF_UP);
                return new SectorAllocation(sector, val, pct, sectorCount.get(sector));
            })
            .sorted(Comparator.comparing(SectorAllocation::totalValuation).reversed())
            .toList();
    }

    /**
     * Calculates portfolio summary from enriched holdings and snapshot totals.
     */
    public PortfolioSummary summarize(Snapshot snapshot, List<SectorAllocation> sectors) {
        return new PortfolioSummary(
            snapshot.getSnapshotDate(),
            snapshot.getTotalValuation(),
            snapshot.getTotalProfitLoss(),
            snapshot.getTotalProfitLossPct(),
            snapshot.getHoldingCount(),
            sectors.size()
        );
    }

    /**
     * Calculates diff between current and previous snapshot (BR-DIFF-01~03).
     * Returns empty diff if no previous snapshot exists.
     */
    public SnapshotDiff calculateDiff(Snapshot current, Optional<Snapshot> previousOpt) {
        if (previousOpt.isEmpty()) {
            return SnapshotDiff.empty();
        }

        Snapshot previous = previousOpt.get();

        Map<String, Holding> currentMap = current.getHoldings().stream()
            .collect(Collectors.toMap(Holding::getTickerCode, h -> h));
        Map<String, Holding> previousMap = previous.getHoldings().stream()
            .collect(Collectors.toMap(Holding::getTickerCode, h -> h));

        List<Holding> added = currentMap.entrySet().stream()
            .filter(e -> !previousMap.containsKey(e.getKey()))
            .map(Map.Entry::getValue)
            .toList();

        List<Holding> removed = previousMap.entrySet().stream()
            .filter(e -> !currentMap.containsKey(e.getKey()))
            .map(Map.Entry::getValue)
            .toList();

        List<HoldingChange> changed = currentMap.entrySet().stream()
            .filter(e -> previousMap.containsKey(e.getKey()))
            .filter(e -> isDifferent(e.getValue(), previousMap.get(e.getKey())))
            .map(e -> {
                Holding curr = e.getValue();
                Holding prev = previousMap.get(e.getKey());
                BigDecimal qtyDiff = curr.getTotalQuantity().subtract(prev.getTotalQuantity());
                BigDecimal valDiff = curr.getTotalValuation().subtract(prev.getTotalValuation());
                return new HoldingChange(e.getKey(), qtyDiff, valDiff, prev, curr);
            })
            .toList();

        BigDecimal valuationChange = current.getTotalValuation().subtract(previous.getTotalValuation());
        BigDecimal profitLossChange = current.getTotalProfitLoss().subtract(previous.getTotalProfitLoss());

        return new SnapshotDiff(added, removed, changed, valuationChange, profitLossChange);
    }

    private boolean isDifferent(Holding current, Holding previous) {
        return current.getTotalQuantity().compareTo(previous.getTotalQuantity()) != 0
            || current.getTotalValuation().compareTo(previous.getTotalValuation()) != 0;
    }
}
