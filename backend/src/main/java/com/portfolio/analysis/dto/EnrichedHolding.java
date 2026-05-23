package com.portfolio.analysis.dto;

import com.portfolio.jquants.model.StockMeta;
import com.portfolio.snapshot.model.Holding;

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
}
