package com.portfolio.analysis.dto;

import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;

import java.math.BigDecimal;
import java.math.RoundingMode;

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

    /**
     * Estimated annual dividend received based on forecast DPS × held quantity.
     * Returns null for mutual funds, missing metadata, or zero/unknown DPS.
     */
    public BigDecimal getEstimatedAnnualDividend() {
        if (isMutualFund() || stockMeta == null) return null;
        BigDecimal dps = stockMeta.getAnnualDividendPerShare();
        if (dps == null || dps.compareTo(BigDecimal.ZERO) == 0) return null;
        return dps.multiply(holding.getTotalQuantity()).setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Approximate dividend payment months derived from fiscal year end month + interim flag.
     * e.g. 3月決算・中間あり → "〜5月・〜11月頃"
     * Returns null when fiscal year end month is unknown.
     */
    public String getDividendMonths() {
        if (isMutualFund() || stockMeta == null || stockMeta.getFiscalYearEndMonth() == null) return null;
        int fye = stockMeta.getFiscalYearEndMonth();
        // Payment is approximately 2 months after fiscal year end
        int endDivMonth = (fye - 1 + 2) % 12 + 1;
        if (Boolean.TRUE.equals(stockMeta.getHasInterimDividend())) {
            // Interim period ends ~6 months before fiscal year end
            int interimFyeMonth = (fye - 1 + 6) % 12 + 1;
            int interimDivMonth = (interimFyeMonth - 1 + 2) % 12 + 1;
            int a = Math.min(endDivMonth, interimDivMonth);
            int b = Math.max(endDivMonth, interimDivMonth);
            return "〜" + a + "月・〜" + b + "月頃";
        }
        return "〜" + endDivMonth + "月頃";
    }
}
