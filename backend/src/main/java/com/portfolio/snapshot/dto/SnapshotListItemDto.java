package com.portfolio.snapshot.dto;

public record SnapshotListItemDto(
    String snapshotDate,
    String totalValuation,
    String totalProfitLoss,
    String totalProfitLossPct,
    int holdingCount
) {}
