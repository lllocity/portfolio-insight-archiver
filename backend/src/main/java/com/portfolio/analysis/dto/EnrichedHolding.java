package com.portfolio.analysis.dto;

import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.stream.Collectors;

public record EnrichedHolding(
    Holding holding,
    StockMeta stockMeta  // nullable — null when J-Quants fetch failed or for mutual funds
) {
    /** Mutual fund tickers are the full fund name (not a 4-character stock code like 7203 or 186A). */
    public boolean isMutualFund() {
        return !holding.getTickerCode().matches("\\d{3}[0-9A-Z]");
    }

    public String getSectorName() {
        if (isMutualFund()) {
            return "投資信託";
        }
        if (stockMeta == null || stockMeta.getSector33Name() == null) {
            return "不明";
        }
        return stockMeta.getSector33Name();
    }

    public BigDecimal getEstimatedAnnualDividend() {
        if (isMutualFund() || stockMeta == null) return null;
        BigDecimal dps = stockMeta.getAnnualDividendPerShare();
        if (dps == null || dps.compareTo(BigDecimal.ZERO) == 0) return null;
        return dps.multiply(holding.getTotalQuantity()).setScale(0, RoundingMode.HALF_UP);
    }

    public String getDividendMonths() {
        if (isMutualFund() || stockMeta == null || stockMeta.getDividendMonths() == null) return null;
        String[] months = stockMeta.getDividendMonths().split(",");
        return Arrays.stream(months)
            .map(m -> m + "月")
            .collect(Collectors.joining("・")) + "頃";
    }
}
