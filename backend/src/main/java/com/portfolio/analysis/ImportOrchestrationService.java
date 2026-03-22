package com.portfolio.analysis;

import com.portfolio.analysis.dto.*;
import com.portfolio.csv.CsvParserService;
import com.portfolio.csv.CsvPathValidator;
import com.portfolio.csv.dto.HoldingRecord;
import com.portfolio.csv.dto.ImportResultDto;
import com.portfolio.google.GoogleDocsArchiveService;
import com.portfolio.jquants.JQuantsApiClient;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.prompt.AiPromptGeneratorService;
import com.portfolio.snapshot.SnapshotService;
import com.portfolio.snapshot.model.Snapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
    private final PortfolioAnalysisService analysisService;
    private final AiPromptGeneratorService promptGeneratorService;
    private final GoogleDocsArchiveService googleDocsArchiveService;

    public ImportOrchestrationService(
        CsvPathValidator csvPathValidator,
        CsvParserService csvParserService,
        SnapshotService snapshotService,
        JQuantsApiClient jQuantsApiClient,
        PortfolioAnalysisService analysisService,
        AiPromptGeneratorService promptGeneratorService,
        GoogleDocsArchiveService googleDocsArchiveService
    ) {
        this.csvPathValidator = csvPathValidator;
        this.csvParserService = csvParserService;
        this.snapshotService = snapshotService;
        this.jQuantsApiClient = jQuantsApiClient;
        this.analysisService = analysisService;
        this.promptGeneratorService = promptGeneratorService;
        this.googleDocsArchiveService = googleDocsArchiveService;
    }

    public ImportResultDto execute(String filePath) {
        List<String> warnings = new ArrayList<>();
        LocalDate today = LocalDate.now(JST);

        // [1] Validate path and parse CSV
        Path validatedPath = csvPathValidator.validate(filePath);
        List<HoldingRecord> records = csvParserService.parse(validatedPath);

        // [2] Fetch previous snapshot for diff
        Optional<Snapshot> previousSnapshot = snapshotService.findLatestBefore(today);

        // [3] Fetch J-Quants metadata (graceful degradation on failure)
        List<String> tickerCodes = records.stream().map(HoldingRecord::tickerCode).toList();
        List<StockMeta> metaList;
        try {
            metaList = jQuantsApiClient.fetchMetadata(tickerCodes);
        } catch (Exception e) {
            log.warn("J-Quants API unavailable, continuing without metadata: {}", e.getMessage());
            warnings.add("J-Quants API is unavailable. Stock metadata will not be included.");
            metaList = List.of();
        }

        // [4] Build snapshot entity (save first to get IDs)
        Snapshot snapshot = snapshotService.save(today, records);

        // [5] Analysis
        List<EnrichedHolding> enriched = analysisService.mergeWithMeta(snapshot.getHoldings(), metaList);
        List<SectorAllocation> sectors = analysisService.analyzeSectorAllocation(enriched);
        PortfolioSummary summary = analysisService.summarize(snapshot, sectors);
        SnapshotDiff diff = analysisService.calculateDiff(snapshot, previousSnapshot);

        PortfolioAnalysisResult analysisResult = new PortfolioAnalysisResult(summary, enriched, sectors, diff);

        // [6] Generate AI prompt
        String promptText = promptGeneratorService.generate(analysisResult);

        // [7] Archive to Google Docs (graceful degradation on failure)
        String docUrl = null;
        try {
            docUrl = googleDocsArchiveService.archive(snapshot, analysisResult, promptText);
        } catch (Exception e) {
            log.warn("Google Docs archive failed, continuing: {}", e.getMessage());
            warnings.add("Google Docs archive was skipped: " + e.getMessage());
        }

        return new ImportResultDto(true, today, records.size(), docUrl, warnings.isEmpty() ? null : warnings);
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
