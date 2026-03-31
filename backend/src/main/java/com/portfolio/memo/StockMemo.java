package com.portfolio.memo;

import com.portfolio.common.converter.LocalDateTimeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_memo")
public class StockMemo {

    @Id
    @Column(name = "ticker_code")
    private String tickerCode;

    @Column(nullable = false)
    private String content;

    @Column(name = "updated_at", nullable = false)
    @Convert(converter = LocalDateTimeConverter.class)
    private LocalDateTime updatedAt;

    protected StockMemo() {}

    public StockMemo(String tickerCode, String content) {
        this.tickerCode = tickerCode;
        this.content = content;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateContent(String content) {
        this.content = content;
        this.updatedAt = LocalDateTime.now();
    }

    public String getTickerCode() { return tickerCode; }
    public String getContent() { return content; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
