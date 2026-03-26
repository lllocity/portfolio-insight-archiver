package com.portfolio.snapshot.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SnapshotHoldingDto(
    String tickerCode,
    String companyName,
    String sector33Name,
    String totalQuantity,
    String weightedAvgPurchasePrice,
    String currentPrice,
    String dailyChange,
    String dailyChangePct,
    String totalProfitLoss,
    String totalProfitLossPct,
    String totalValuation
) {}
