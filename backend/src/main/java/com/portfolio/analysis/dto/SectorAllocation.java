package com.portfolio.analysis.dto;

import java.math.BigDecimal;

public record SectorAllocation(
    String sector33Name,
    BigDecimal totalValuation,
    BigDecimal allocationPct,
    int holdingCount
) {}
