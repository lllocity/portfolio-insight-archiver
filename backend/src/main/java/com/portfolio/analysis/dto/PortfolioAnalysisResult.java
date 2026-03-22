package com.portfolio.analysis.dto;

import java.util.List;

public record PortfolioAnalysisResult(
    PortfolioSummary summary,
    List<EnrichedHolding> enrichedHoldings,
    List<SectorAllocation> sectorAllocations,
    SnapshotDiff diff
) {}
