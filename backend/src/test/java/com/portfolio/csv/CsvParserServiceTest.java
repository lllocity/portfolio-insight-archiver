package com.portfolio.csv;

import com.portfolio.common.exception.CsvNotFoundException;
import com.portfolio.common.exception.CsvParseException;
import com.portfolio.csv.dto.HoldingRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Tests for CsvParserService using the real SBI証券 CSV format:
 * - Ticker code field is "XXXX 会社名" (4-digit code + space + name)
 * - Multiple sections per file (特定口座, 信用建玉, NISA, 投資信託)
 * - Each section has its own header row
 * - 信用建玉 section uses "建単価" instead of "取得単価"
 * - Mutual fund section uses "ファンド名" and should be skipped
 */
class CsvParserServiceTest {

    private static final Charset MS932 = Charset.forName("MS932");

    private CsvParserService parser;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        parser = new CsvParserService();
    }

    // ── Single section, single ticker ──────────────────────────────────────

    @Test
    void parse_singleTicker_returnsOneRecord() throws IOException {
        String csv = singleSectionHeader() +
                     "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(1);
        HoldingRecord r = records.get(0);
        assertThat(r.tickerCode()).isEqualTo("7203");
        assertThat(r.totalQuantity()).isEqualByComparingTo(new BigDecimal("100"));
        assertThat(r.totalValuation()).isEqualByComparingTo(new BigDecimal("280000"));
        assertThat(r.currentPrice()).isEqualByComparingTo(new BigDecimal("2800"));
    }

    // ── Aggregation: same ticker in same section ───────────────────────────

    @Test
    void parse_sameTicker_aggregatesRows() throws IOException {
        // 7203: 100 @ 2500 + 50 @ 2600
        // totalQty=150, totalCost=380000, weightedAvg=380000/150=2533.3333
        String csv = singleSectionHeader() +
                     "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
                     "\"7203 トヨタ自動車\",2024-02-01,50,2600,2800,+50,+1.82,+10000,+7.69,140000\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(1);
        HoldingRecord r = records.get(0);
        assertThat(r.tickerCode()).isEqualTo("7203");
        assertThat(r.totalQuantity()).isEqualByComparingTo(new BigDecimal("150"));
        assertThat(r.totalValuation()).isEqualByComparingTo(new BigDecimal("420000"));
        assertThat(r.totalProfitLoss()).isEqualByComparingTo(new BigDecimal("40000"));
        assertThat(r.weightedAvgPurchasePrice())
            .isEqualByComparingTo(new BigDecimal("2533.3333"));
    }

    // ── Multiple distinct tickers ──────────────────────────────────────────

    @Test
    void parse_multipleDistinctTickers_returnsAllAggregated() throws IOException {
        String csv = singleSectionHeader() +
                     "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
                     "\"6758 ソニーグループ\",2024-01-20,200,12000,13500,+100,+0.75,+300000,+12.50,2700000\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(2);
        assertThat(records).extracting(HoldingRecord::tickerCode)
            .containsExactlyInAnyOrder("7203", "6758");
    }

    // ── Multi-section: 特定口座 + NISA (同一フォーマット) ──────────────────

    @Test
    void parse_multipleStockSections_parsesAll() throws IOException {
        String csv =
            // 特定口座 section
            "保有銘柄/特定口座\n" +
            singleSectionHeader() +
            "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
            "合計,,,,,,,,,,\n" +
            // NISA section
            "保有銘柄/NISA口座\n" +
            singleSectionHeader() +
            "\"6758 ソニーグループ\",2024-01-20,200,12000,13500,+100,+0.75,+300000,+12.50,2700000\n" +
            "合計,,,,,,,,,,\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(2);
        assertThat(records).extracting(HoldingRecord::tickerCode)
            .containsExactlyInAnyOrder("7203", "6758");
    }

    // ── Multi-section: 信用建玉 (builds単価) ──────────────────────────────

    @Test
    void parse_creditSection_usesKenTanka() throws IOException {
        String csv =
            // 特定口座 section
            singleSectionHeader() +
            "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
            // 信用建玉 section (建単価 instead of 取得単価)
            "保有銘柄/信用建玉\n" +
            creditSectionHeader() +
            "\"4689 ヤフー\",2024-02-01,500,437,398,-1,-0.25,-19500,-8.94,199000\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(2);
        HoldingRecord yahoo = records.stream()
            .filter(r -> r.tickerCode().equals("4689"))
            .findFirst().orElseThrow();
        assertThat(yahoo.weightedAvgPurchasePrice()).isEqualByComparingTo(new BigDecimal("437"));
        assertThat(yahoo.totalQuantity()).isEqualByComparingTo(new BigDecimal("500"));
    }

    // ── Cross-section aggregation: same ticker in 特定 and 信用 ────────────

    @Test
    void parse_sameTickerAcrossSections_aggregated() throws IOException {
        String csv =
            singleSectionHeader() +
            "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
            creditSectionHeader() +
            "\"7203 トヨタ自動車\",2024-02-01,50,2600,2800,+50,+1.82,+10000,+7.69,140000\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        // Should be aggregated into one record
        assertThat(records).hasSize(1);
        assertThat(records.get(0).totalQuantity()).isEqualByComparingTo(new BigDecimal("150"));
    }

    // ── Mutual fund section is included as "投資信託" ─────────────────────

    @Test
    void parse_fundSection_includedWithFundNameAsTicker() throws IOException {
        String csv =
            singleSectionHeader() +
            "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
            "ファンド名,買付日,数量,取得単価,現在値,前日比,前日比（％）,損益,損益（％）,評価額\n" +
            "日本成長株ファンド,----/--/--,293475,17402,22558,-273,-1.20,+151315,+29.63,662020\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        // Stock + fund should both be present
        assertThat(records).hasSize(2);
        assertThat(records).extracting(HoldingRecord::tickerCode)
            .contains("7203", "日本成長株ファンド");
    }

    @Test
    void parse_fundSection_totalRowSkipped() throws IOException {
        String csv =
            "ファンド名,買付日,数量,取得単価,現在値,前日比,前日比（％）,損益,損益（％）,評価額\n" +
            "日本成長株ファンド,----/--/--,293475,17402,22558,-273,-1.20,+151315,+29.63,662020\n" +
            // Total row: starts with a number
            "2656544.33,+445814.87,+20.17,-38969.78,-1.45\n" +
            singleSectionHeader() +
            "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(2);
        assertThat(records).extracting(HoldingRecord::tickerCode)
            .containsExactlyInAnyOrder("日本成長株ファンド", "7203");
    }

    // ── Section title and total rows are skipped ──────────────────────────

    @Test
    void parse_totalAndTitleRows_skipped() throws IOException {
        String csv =
            "保有銘柄/特定口座\n" +                              // section title
            singleSectionHeader() +
            "\"7203 トヨタ自動車\",2024-01-15,100,2500,2800,+50,+1.82,+30000,+12.00,280000\n" +
            "23284000,+2355800,+11.26,-17350,-0.14\n" +          // total row
            "合計(保有銘柄/特定口座)\n";                          // section total header
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(1);
    }

    // ── Comma-separated numbers and decimal prices ─────────────────────────

    @Test
    void parse_commaSeparatedNumbers_parsedCorrectly() throws IOException {
        String csv = singleSectionHeader() +
                     "\"7203 トヨタ自動車\",2024-01-15,100,\"2,500\",\"2,800\",+50,+1.82,\"+30,000\",+12.00,\"280,000\"\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(1);
        assertThat(records.get(0).currentPrice()).isEqualByComparingTo(new BigDecimal("2800"));
        assertThat(records.get(0).totalValuation()).isEqualByComparingTo(new BigDecimal("280000"));
    }

    @Test
    void parse_decimalPrice_parsedCorrectly() throws IOException {
        // e.g. 5844 with price 4456.7
        String csv = singleSectionHeader() +
                     "\"5844 さくらフィナンシャル\",----/--/--,200,3631,4456.7,-11.3,-0.25,+165140,+22.74,891340\n";
        Path file = writeCsv(csv);

        List<HoldingRecord> records = parser.parse(file);

        assertThat(records).hasSize(1);
        assertThat(records.get(0).currentPrice()).isEqualByComparingTo(new BigDecimal("4456.7"));
    }

    // ── Error cases ────────────────────────────────────────────────────────

    @Test
    void parse_fileNotFound_throwsCsvNotFoundException() {
        assertThatThrownBy(() -> parser.parse(tempDir.resolve("missing.csv")))
            .isInstanceOf(CsvNotFoundException.class);
    }

    @Test
    void parse_noValidStockData_throwsCsvParseException() throws IOException {
        // Only section titles and totals, no actual data
        String csv = "保有銘柄一覧\n合計,0,0\n";
        Path file = writeCsv(csv);

        assertThatThrownBy(() -> parser.parse(file))
            .isInstanceOf(CsvParseException.class)
            .hasMessageContaining("No valid stock holding data");
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * CSV header row for 特定口座 / NISA sections (uses 取得単価).
     */
    private String singleSectionHeader() {
        return "銘柄（コード）,買付日,数量,取得単価,現在値,前日比,前日比（％）,損益,損益（％）,評価額\n";
    }

    /**
     * CSV header row for 信用建玉 section (uses 建単価 instead of 取得単価).
     */
    private String creditSectionHeader() {
        return "銘柄（コード）,建付日,数量,建単価,現在値,前日比,前日比（％）,損益,損益（％）,評価額\n";
    }

    private Path writeCsv(String content) throws IOException {
        Path file = tempDir.resolve("test.csv");
        Files.writeString(file, content, MS932);
        return file;
    }
}
