package com.portfolio.analysis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PortfolioSummary(
    LocalDate snapshotDate,
    BigDecimal totalValuation,
    BigDecimal totalProfitLoss,
    BigDecimal totalProfitLossPct,
    int holdingCount,
    int sectorCount
) {}
