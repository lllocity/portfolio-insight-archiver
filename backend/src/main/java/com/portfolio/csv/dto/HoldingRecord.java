package com.portfolio.csv.dto;

import java.math.BigDecimal;

/**
 * Intermediate model for a parsed (and aggregated) CSV row.
 */
public record HoldingRecord(
    String tickerCode,
    BigDecimal totalQuantity,
    BigDecimal weightedAvgPurchasePrice,
    BigDecimal currentPrice,
    BigDecimal dailyChange,
    BigDecimal dailyChangePct,
    BigDecimal totalProfitLoss,
    BigDecimal totalProfitLossPct,
    BigDecimal totalValuation
) {}
