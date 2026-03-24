package com.portfolio.common.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDateTime;

/**
 * SQLite は TIMESTAMP 型を持たないため、LocalDateTime を ISO-8601 文字列として保存する。
 * Hibernate のデフォルト実装は Unix ミリ秒を保存するが、SQLite JDBC ドライバーが
 * 数値を timestamp として解析できないため、このコンバーターで TEXT として読み書きする。
 */
@Converter
public class LocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {

    @Override
    public String convertToDatabaseColumn(LocalDateTime attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        // SQLite が "YYYY-MM-DD HH:MM:SS" 形式（スペース区切り）で保存した古いデータにも対応
        return LocalDateTime.parse(dbData.replace(' ', 'T'));
    }
}
