package com.portfolio.portfolio.dto;

import java.util.List;

public record PortfolioResponse(
    SnapshotSummaryDto snapshot,
    List<EnrichedHoldingDto> holdings,
    List<SectorAllocationDto> sectors
) {

    public record SnapshotSummaryDto(
        String snapshotDate,
        String totalValuation,
        String totalProfitLoss,
        String totalProfitLossPct,
        int holdingCount
    ) {}

    public record EnrichedHoldingDto(
        String tickerCode,
        String companyName,
        String sectorName,
        String totalQuantity,
        String weightedAvgPurchasePrice,
        String currentPrice,
        String dailyChange,
        String dailyChangePct,
        String totalProfitLoss,
        String totalProfitLossPct,
        String totalValuation,
        String memo,
        String estimatedAnnualDividend,
        String dividendMonths
    ) {}

    public record SectorAllocationDto(
        String sector33Name,
        String totalValuation,
        String allocationPct,
        int holdingCount
    ) {}

    public record TickerSummaryDto(String tickerCode, String companyName) {}

    public record SnapshotDiffDto(
        List<TickerSummaryDto> addedTickers,
        List<TickerSummaryDto> removedTickers
    ) {}
}
