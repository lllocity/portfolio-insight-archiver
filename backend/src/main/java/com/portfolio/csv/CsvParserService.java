package com.portfolio.csv;

import com.portfolio.common.exception.CsvNotFoundException;
import com.portfolio.common.exception.CsvParseException;
import com.portfolio.csv.dto.HoldingRecord;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * Parses SBI証券 CSV file (Shift-JIS / CP932 encoding).
 *
 * <p>The SBI CSV has multiple sections per file:
 * <ul>
 *   <li>特定口座 / 一般口座 (cash positions)  — column "取得単価"</li>
 *   <li>一般口座 (general account positions)   — column "参考単価"</li>
 *   <li>信用建玉 (margin positions)           — column "建単価"</li>
 *   <li>NISA口座 (NISA positions)             — column "取得単価"</li>
 *   <li>投資信託 (mutual funds)               — column header "ファンド名" → skipped</li>
 * </ul>
 * Each section starts with its own header row containing "銘柄（コード）".
 * Ticker code fields look like "7203 ソニーグループ" — we extract only the 4-digit code.
 * Multiple rows with the same ticker code are aggregated per BR-CSV-04.
 */
@Service
public class CsvParserService {

    private static final Logger log = LoggerFactory.getLogger(CsvParserService.class);
    private static final Charset SHIFT_JIS = Charset.forName("MS932");

    /** Column name for ticker code (present in all stock sections). */
    private static final String COL_TICKER = "銘柄（コード）";
    /** Column name for purchase price in cash/NISA accounts. */
    private static final String COL_PURCHASE_PRICE = "取得単価";
    /** Column name for reference price in general (一般預り) accounts. */
    private static final String COL_REFERENCE_PRICE = "参考単価";
    /** Column name for trade price in margin/credit accounts. */
    private static final String COL_CREDIT_PRICE = "建単価";
    /** Column header that marks the mutual-fund section. */
    private static final String COL_FUND_NAME = "ファンド名";

    /** Minimum number of CSV fields required for a valid data row. */
    private static final int MIN_DATA_FIELDS = 10;

    public List<HoldingRecord> parse(Path filePath) {
        if (!Files.exists(filePath)) {
            throw new CsvNotFoundException(filePath.toString());
        }
        try (BufferedReader reader = Files.newBufferedReader(filePath, SHIFT_JIS)) {
            return parseMultiSection(reader);
        } catch (IOException e) {
            throw new CsvParseException("Failed to read CSV file: " + e.getMessage(), e);
        }
    }

    // -----------------------------------------------------------------------
    // Multi-section parsing
    // -----------------------------------------------------------------------

    private enum SectionType { STOCK, FUND, UNKNOWN }

    private List<HoldingRecord> parseMultiSection(BufferedReader reader) throws IOException {
        // Accumulate all raw rows grouped by ticker/fund identifier (for aggregation)
        Map<String, List<RawRow>> grouped = new LinkedHashMap<>();

        String[] currentHeaders = null;
        String priceColumn = null;
        SectionType sectionType = SectionType.UNKNOWN;

        String line;
        while ((line = reader.readLine()) != null) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            List<String> fields = parseCsvLine(trimmed);
            if (fields.isEmpty()) continue;

            String firstField = fields.get(0);

            // ── Fund section header ──
            if (COL_FUND_NAME.equals(firstField)) {
                currentHeaders = fields.toArray(new String[0]);
                priceColumn = resolvePriceColumn(fields);
                sectionType = SectionType.FUND;
                log.debug("Entering mutual-fund section.");
                continue;
            }

            // ── Stock section header ──
            if (COL_TICKER.equals(firstField)) {
                currentHeaders = fields.toArray(new String[0]);
                priceColumn = resolvePriceColumn(fields);
                sectionType = priceColumn != null ? SectionType.STOCK : SectionType.UNKNOWN;
                if (priceColumn == null) {
                    log.warn("Could not determine purchase-price column from header: {}", fields);
                }
                log.debug("Entering stock section with price column: {}", priceColumn);
                continue;
            }

            if (sectionType == SectionType.UNKNOWN || currentHeaders == null) continue;

            // ── STOCK section: extract 4-digit ticker code ──
            if (sectionType == SectionType.STOCK) {
                String tickerCode = extractTickerCode(firstField);
                if (tickerCode == null) continue;

                Map<String, String> rowMap = mapRow(currentHeaders, fields);
                String priceStr = rowMap.get(priceColumn);
                if (priceStr == null || priceStr.isBlank()) continue;

                grouped.computeIfAbsent(tickerCode, k -> new ArrayList<>())
                       .add(toRawRow(tickerCode, priceStr, rowMap));
            }

            // ── FUND section: use fund name as identifier ──
            else if (sectionType == SectionType.FUND) {
                // Skip total/summary rows: they have fewer fields or start with a digit
                if (fields.size() < MIN_DATA_FIELDS) continue;
                if (firstField.isEmpty() || Character.isDigit(firstField.charAt(0))) continue;
                if (priceColumn == null) continue;

                Map<String, String> rowMap = mapRow(currentHeaders, fields);
                String priceStr = rowMap.get(priceColumn);
                if (priceStr == null || priceStr.isBlank()) continue;

                // Use fund name directly as the "ticker code"
                grouped.computeIfAbsent(firstField, k -> new ArrayList<>())
                       .add(toRawRow(firstField, priceStr, rowMap));
            }
        }

        if (grouped.isEmpty()) {
            throw new CsvParseException("No valid stock holding data found in CSV file.");
        }

        return grouped.entrySet().stream()
            .map(e -> aggregateTicker(e.getKey(), e.getValue()))
            .toList();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private RawRow toRawRow(String id, String priceStr, Map<String, String> rowMap) {
        return new RawRow(
            id,
            rowMap.get("数量"),
            priceStr,
            rowMap.get("現在値"),
            rowMap.get("前日比"),
            rowMap.get("前日比（％）"),
            rowMap.get("損益"),
            rowMap.get("損益（％）"),
            rowMap.get("評価額")
        );
    }

    /**
     * Parse a single CSV line using Apache Commons CSV, returning unquoted field values.
     */
    private List<String> parseCsvLine(String line) {
        try (CSVParser parser = CSVParser.parse(line, CSVFormat.DEFAULT)) {
            List<CSVRecord> records = parser.getRecords();
            if (records.isEmpty()) return List.of();
            List<String> result = new ArrayList<>();
            for (String field : records.get(0)) {
                result.add(field.trim());
            }
            return result;
        } catch (Exception e) {
            log.debug("Could not parse CSV line: {}", line);
            return List.of();
        }
    }

    /**
     * Determine which column holds the per-unit purchase price.
     * Cash/NISA accounts use "取得単価"; margin accounts use "建単価".
     */
    private String resolvePriceColumn(List<String> headers) {
        if (headers.contains(COL_PURCHASE_PRICE)) return COL_PURCHASE_PRICE;
        if (headers.contains(COL_REFERENCE_PRICE)) return COL_REFERENCE_PRICE;
        if (headers.contains(COL_CREDIT_PRICE)) return COL_CREDIT_PRICE;
        return null;
    }

    /**
     * Extracts the 4-digit ticker code from a field like "7203 ソニーグループ".
     * Returns null if the field does not start with a 4-digit stock code.
     */
    private String extractTickerCode(String rawField) {
        if (rawField == null || rawField.isBlank()) return null;
        int spaceIdx = rawField.indexOf(' ');
        String code = spaceIdx > 0 ? rawField.substring(0, spaceIdx) : rawField;
        return code.matches("\\d{4}") ? code : null;
    }

    private Map<String, String> mapRow(String[] headers, List<String> fields) {
        Map<String, String> result = new HashMap<>();
        for (int i = 0; i < Math.min(headers.length, fields.size()); i++) {
            result.put(headers[i], fields.get(i));
        }
        return result;
    }

    // -----------------------------------------------------------------------
    // Aggregation (BR-CSV-04)
    // -----------------------------------------------------------------------

    private HoldingRecord aggregateTicker(String tickerCode, List<RawRow> rows) {
        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal totalValuation = BigDecimal.ZERO;
        BigDecimal totalProfitLoss = BigDecimal.ZERO;

        // Price fields are identical across rows for the same ticker (BR-CSV-04)
        RawRow first = rows.get(0);
        BigDecimal currentPrice = parseNumber(first.currentPrice());
        BigDecimal dailyChange = parseNumber(first.dailyChange());
        BigDecimal dailyChangePct = parseNumber(first.dailyChangePct());

        for (RawRow row : rows) {
            BigDecimal qty = parseNumber(row.quantity());
            BigDecimal purchasePrice = parseNumber(row.purchasePrice());

            totalQuantity = totalQuantity.add(qty);
            totalCost = totalCost.add(qty.multiply(purchasePrice));
            totalValuation = totalValuation.add(parseNumber(row.valuation()));
            totalProfitLoss = totalProfitLoss.add(parseNumber(row.profitLoss()));
        }

        BigDecimal weightedAvg = totalQuantity.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ZERO
            : totalCost.divide(totalQuantity, 4, RoundingMode.HALF_UP);

        BigDecimal totalProfitLossPct = totalCost.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ZERO
            : totalProfitLoss.divide(totalCost, 6, RoundingMode.HALF_UP)
                             .multiply(BigDecimal.valueOf(100))
                             .setScale(2, RoundingMode.HALF_UP);

        return new HoldingRecord(
            tickerCode, totalQuantity, weightedAvg, currentPrice,
            dailyChange, dailyChangePct, totalProfitLoss, totalProfitLossPct, totalValuation
        );
    }

    /**
     * Strips commas, %, and leading + before parsing (BR-CSV-05).
     */
    private BigDecimal parseNumber(String raw) {
        if (raw == null || raw.isBlank() || raw.equals("-") || raw.equals("--")) {
            return BigDecimal.ZERO;
        }
        String cleaned = raw.replace(",", "").replace("%", "").replace("+", "").trim();
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            log.warn("Could not parse number: '{}', defaulting to 0", raw);
            return BigDecimal.ZERO;
        }
    }

    // -----------------------------------------------------------------------
    // Internal transfer object
    // -----------------------------------------------------------------------

    private record RawRow(
        String tickerCode,
        String quantity,
        String purchasePrice,
        String currentPrice,
        String dailyChange,
        String dailyChangePct,
        String profitLoss,
        String profitLossPct,
        String valuation
    ) {}
}
