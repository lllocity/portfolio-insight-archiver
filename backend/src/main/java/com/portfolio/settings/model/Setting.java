package com.portfolio.settings.model;

import com.portfolio.common.converter.LocalDateTimeConverter;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "settings")
public class Setting {

    @Id
    @Column(name = "key")
    private String key;

    @Column(name = "value")
    private String value;

    @Column(name = "updated_at", nullable = false)
    @Convert(converter = LocalDateTimeConverter.class)
    private LocalDateTime updatedAt;

    protected Setting() {}

    public Setting(String key, String value) {
        this.key = key;
        this.value = value;
        this.updatedAt = LocalDateTime.now();
    }

    public String getKey() { return key; }
    public String getValue() { return value; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setValue(String value) {
        this.value = value;
        this.updatedAt = LocalDateTime.now();
    }
}
