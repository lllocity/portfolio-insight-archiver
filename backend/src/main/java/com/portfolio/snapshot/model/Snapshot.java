package com.portfolio.snapshot.model;

import com.portfolio.common.converter.LocalDateConverter;
import com.portfolio.common.converter.LocalDateTimeConverter;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "snapshots")
public class Snapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_date", nullable = false, unique = true)
    @Convert(converter = LocalDateConverter.class)
    private LocalDate snapshotDate;

    @Column(name = "total_valuation", nullable = false)
    private BigDecimal totalValuation;

    @Column(name = "total_profit_loss", nullable = false)
    private BigDecimal totalProfitLoss;

    @Column(name = "total_profit_loss_pct", nullable = false)
    private BigDecimal totalProfitLossPct;

    @Column(name = "holding_count", nullable = false)
    private Integer holdingCount;

    @Column(name = "created_at", nullable = false)
    @Convert(converter = LocalDateTimeConverter.class)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Holding> holdings = new ArrayList<>();

    protected Snapshot() {}

    public Snapshot(LocalDate snapshotDate, BigDecimal totalValuation,
                    BigDecimal totalProfitLoss, BigDecimal totalProfitLossPct,
                    Integer holdingCount) {
        this.snapshotDate = snapshotDate;
        this.totalValuation = totalValuation;
        this.totalProfitLoss = totalProfitLoss;
        this.totalProfitLossPct = totalProfitLossPct;
        this.holdingCount = holdingCount;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public BigDecimal getTotalValuation() { return totalValuation; }
    public BigDecimal getTotalProfitLoss() { return totalProfitLoss; }
    public BigDecimal getTotalProfitLossPct() { return totalProfitLossPct; }
    public Integer getHoldingCount() { return holdingCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<Holding> getHoldings() { return holdings; }

    public void addHolding(Holding holding) {
        holdings.add(holding);
        holding.setSnapshot(this);
    }
}
