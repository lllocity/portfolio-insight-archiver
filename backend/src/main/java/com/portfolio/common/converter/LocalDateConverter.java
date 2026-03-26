package com.portfolio.common.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;

/**
 * SQLite は DATE 型を持たないため、LocalDate を ISO-8601 文字列（YYYY-MM-DD）として保存する。
 * Hibernate のデフォルト実装は Unix ミリ秒を保存するが、SQLite JDBC ドライバーが
 * 数値を date として解析できないため、このコンバーターで TEXT として読み書きする。
 */
@Converter
public class LocalDateConverter implements AttributeConverter<LocalDate, String> {

    @Override
    public String convertToDatabaseColumn(LocalDate attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public LocalDate convertToEntityAttribute(String dbData) {
        return dbData == null ? null : LocalDate.parse(dbData);
    }
}
