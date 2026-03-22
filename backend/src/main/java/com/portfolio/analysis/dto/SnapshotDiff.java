package com.portfolio.analysis.dto;

import com.portfolio.snapshot.model.Holding;

import java.math.BigDecimal;
import java.util.List;

public record SnapshotDiff(
    List<Holding> addedHoldings,
    List<Holding> removedHoldings,
    List<HoldingChange> changedHoldings,
    BigDecimal valuationChange,
    BigDecimal profitLossChange
) {
    public static SnapshotDiff empty() {
        return new SnapshotDiff(List.of(), List.of(), List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public boolean isEmpty() {
        return addedHoldings.isEmpty() && removedHoldings.isEmpty() && changedHoldings.isEmpty();
    }
}
