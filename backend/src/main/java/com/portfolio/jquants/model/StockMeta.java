package com.portfolio.jquants.model;

import com.portfolio.common.converter.LocalDateTimeConverter;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_meta_cache")
public class StockMeta {

    @Id
    @Column(name = "ticker_code")
    private String tickerCode;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "sector33_code")
    private String sector33Code;

    @Column(name = "sector33_name")
    private String sector33Name;

    @Column(name = "dividend_yield")
    private BigDecimal dividendYield;

    @Column(name = "market_cap")
    private BigDecimal marketCap;

    @Column(name = "earnings_date")
    private LocalDate earningsDate;

    @Column(name = "pbr")
    private BigDecimal pbr;

    @Column(name = "per")
    private BigDecimal per;

    @Column(name = "cached_at", nullable = false)
    @Convert(converter = LocalDateTimeConverter.class)
    private LocalDateTime cachedAt;

    protected StockMeta() {}

    public StockMeta(String tickerCode, String companyName, String sector33Code,
                     String sector33Name, BigDecimal dividendYield, BigDecimal marketCap,
                     LocalDate earningsDate, BigDecimal pbr, BigDecimal per) {
        this.tickerCode = tickerCode;
        this.companyName = companyName;
        this.sector33Code = sector33Code;
        this.sector33Name = sector33Name;
        this.dividendYield = dividendYield;
        this.marketCap = marketCap;
        this.earningsDate = earningsDate;
        this.pbr = pbr;
        this.per = per;
        this.cachedAt = LocalDateTime.now();
    }

    public String getTickerCode() { return tickerCode; }
    public String getCompanyName() { return companyName; }
    public String getSector33Code() { return sector33Code; }
    public String getSector33Name() { return sector33Name; }
    public BigDecimal getDividendYield() { return dividendYield; }
    public BigDecimal getMarketCap() { return marketCap; }
    public LocalDate getEarningsDate() { return earningsDate; }
    public BigDecimal getPbr() { return pbr; }
    public BigDecimal getPer() { return per; }
    public LocalDateTime getCachedAt() { return cachedAt; }

    public void refreshCachedAt() {
        this.cachedAt = LocalDateTime.now();
    }
}
