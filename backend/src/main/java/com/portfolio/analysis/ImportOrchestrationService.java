package com.portfolio.analysis;

import com.portfolio.csv.CsvParserService;
import com.portfolio.csv.CsvPathValidator;
import com.portfolio.csv.dto.HoldingRecord;
import com.portfolio.csv.dto.ImportResultDto;
import com.portfolio.jquants.JQuantsApiClient;
import com.portfolio.snapshot.SnapshotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Orchestrates the full CSV import flow (BL-01).
 */
@Service
public class ImportOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(ImportOrchestrationService.class);
    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private final CsvPathValidator csvPathValidator;
    private final CsvParserService csvParserService;
    private final SnapshotService snapshotService;
    private final JQuantsApiClient jQuantsApiClient;

    public ImportOrchestrationService(
        CsvPathValidator csvPathValidator,
        CsvParserService csvParserService,
        SnapshotService snapshotService,
        JQuantsApiClient jQuantsApiClient
    ) {
        this.csvPathValidator = csvPathValidator;
        this.csvParserService = csvParserService;
        this.snapshotService = snapshotService;
        this.jQuantsApiClient = jQuantsApiClient;
    }

    public ImportResultDto executeFromUpload(InputStream csvStream) {
        return executeWithRecords(csvParserService.parse(csvStream));
    }

    /** Kept for potential CLI/test use. */
    public ImportResultDto execute(String filePath) {
        Path validatedPath = csvPathValidator.validate(filePath);
        return executeWithRecords(csvParserService.parse(validatedPath));
    }

    private ImportResultDto executeWithRecords(List<HoldingRecord> records) {
        List<String> warnings = new ArrayList<>();
        LocalDate today = LocalDate.now(JST);

        // Populate stock_meta_cache; PortfolioQueryController reads from cache at display time
        List<String> tickerCodes = records.stream().map(HoldingRecord::tickerCode).toList();
        try {
            jQuantsApiClient.fetchMetadata(tickerCodes);
        } catch (Exception e) {
            log.warn("J-Quants API unavailable, continuing without metadata: {}", e.getMessage());
            warnings.add("J-Quants API is unavailable. Stock metadata will not be included.");
        }

        snapshotService.save(today, records);

        return new ImportResultDto(true, today, records.size(), warnings.isEmpty() ? null : warnings);
    }

    /**
     * Computes totalProfitLossPct from aggregated holdings (BR-SNAP-02).
     */
    public static BigDecimal computeProfitLossPct(List<HoldingRecord> records) {
        BigDecimal totalCost = records.stream()
            .map(r -> r.totalQuantity().multiply(r.weightedAvgPurchasePrice()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfitLoss = records.stream()
            .map(HoldingRecord::totalProfitLoss)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalCost.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return totalProfitLoss.divide(totalCost, 6, RoundingMode.HALF_UP)
                              .multiply(BigDecimal.valueOf(100))
                              .setScale(2, RoundingMode.HALF_UP);
    }
}
