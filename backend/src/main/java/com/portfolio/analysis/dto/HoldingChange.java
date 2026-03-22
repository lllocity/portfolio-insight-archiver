package com.portfolio.analysis.dto;

import com.portfolio.snapshot.model.Holding;

import java.math.BigDecimal;

public record HoldingChange(
    String tickerCode,
    BigDecimal quantityDiff,
    BigDecimal valuationDiff,
    Holding previous,
    Holding current
) {}
