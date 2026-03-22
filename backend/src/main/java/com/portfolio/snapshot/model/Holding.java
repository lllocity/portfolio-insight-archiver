package com.portfolio.snapshot.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "holdings",
       uniqueConstraints = @UniqueConstraint(columnNames = {"snapshot_id", "ticker_code"}))
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private Snapshot snapshot;

    @Column(name = "ticker_code", nullable = false)
    private String tickerCode;

    @Column(name = "total_quantity", nullable = false)
    private BigDecimal totalQuantity;

    @Column(name = "weighted_avg_purchase_price", nullable = false)
    private BigDecimal weightedAvgPurchasePrice;

    @Column(name = "current_price", nullable = false)
    private BigDecimal currentPrice;

    @Column(name = "daily_change", nullable = false)
    private BigDecimal dailyChange;

    @Column(name = "daily_change_pct", nullable = false)
    private BigDecimal dailyChangePct;

    @Column(name = "total_profit_loss", nullable = false)
    private BigDecimal totalProfitLoss;

    @Column(name = "total_profit_loss_pct", nullable = false)
    private BigDecimal totalProfitLossPct;

    @Column(name = "total_valuation", nullable = false)
    private BigDecimal totalValuation;

    protected Holding() {}

    public Holding(String tickerCode, BigDecimal totalQuantity,
                   BigDecimal weightedAvgPurchasePrice, BigDecimal currentPrice,
                   BigDecimal dailyChange, BigDecimal dailyChangePct,
                   BigDecimal totalProfitLoss, BigDecimal totalProfitLossPct,
                   BigDecimal totalValuation) {
        this.tickerCode = tickerCode;
        this.totalQuantity = totalQuantity;
        this.weightedAvgPurchasePrice = weightedAvgPurchasePrice;
        this.currentPrice = currentPrice;
        this.dailyChange = dailyChange;
        this.dailyChangePct = dailyChangePct;
        this.totalProfitLoss = totalProfitLoss;
        this.totalProfitLossPct = totalProfitLossPct;
        this.totalValuation = totalValuation;
    }

    public Long getId() { return id; }
    public Snapshot getSnapshot() { return snapshot; }
    public void setSnapshot(Snapshot snapshot) { this.snapshot = snapshot; }
    public String getTickerCode() { return tickerCode; }
    public BigDecimal getTotalQuantity() { return totalQuantity; }
    public BigDecimal getWeightedAvgPurchasePrice() { return weightedAvgPurchasePrice; }
    public BigDecimal getCurrentPrice() { return currentPrice; }
    public BigDecimal getDailyChange() { return dailyChange; }
    public BigDecimal getDailyChangePct() { return dailyChangePct; }
    public BigDecimal getTotalProfitLoss() { return totalProfitLoss; }
    public BigDecimal getTotalProfitLossPct() { return totalProfitLossPct; }
    public BigDecimal getTotalValuation() { return totalValuation; }
}
