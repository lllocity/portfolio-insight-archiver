package com.portfolio.prompt;

import com.portfolio.analysis.PortfolioAnalysisService;
import com.portfolio.analysis.dto.*;
import com.portfolio.jquants.JQuantsApiClient;
import com.portfolio.jquants.model.StockMeta;
import com.portfolio.prompt.dto.PromptResponse;
import com.portfolio.snapshot.SnapshotService;
import com.portfolio.snapshot.model.Holding;
import com.portfolio.snapshot.model.Snapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/prompt")
public class PromptController {

    private static final Logger log = LoggerFactory.getLogger(PromptController.class);

    private final SnapshotService snapshotService;
    private final JQuantsApiClient jQuantsApiClient;
    private final PortfolioAnalysisService analysisService;
    private final AiPromptGeneratorService promptGeneratorService;

    public PromptController(SnapshotService snapshotService,
                            JQuantsApiClient jQuantsApiClient,
                            PortfolioAnalysisService analysisService,
                            AiPromptGeneratorService promptGeneratorService) {
        this.snapshotService = snapshotService;
        this.jQuantsApiClient = jQuantsApiClient;
        this.analysisService = analysisService;
        this.promptGeneratorService = promptGeneratorService;
    }

    /** GET /api/prompt/latest — 最新スナップショットからAIプロンプトを生成して返却 */
    @GetMapping("/latest")
    public ResponseEntity<PromptResponse> getLatestPrompt() {
        Optional<Snapshot> snapshotOpt = snapshotService.findLatest();
        if (snapshotOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        Snapshot snapshot = snapshotOpt.get();
        List<String> tickerCodes = snapshot.getHoldings().stream()
            .map(Holding::getTickerCode).toList();

        List<StockMeta> metaList;
        try {
            metaList = jQuantsApiClient.fetchMetadata(tickerCodes);
        } catch (Exception e) {
            log.warn("J-Quants unavailable on prompt generation, continuing without metadata: {}", e.getMessage());
            metaList = List.of();
        }

        List<EnrichedHolding> enriched = analysisService.mergeWithMeta(snapshot.getHoldings(), metaList);
        List<SectorAllocation> sectors = analysisService.analyzeSectorAllocation(enriched);
        PortfolioSummary summary = analysisService.summarize(snapshot, sectors);
        Optional<Snapshot> previous = snapshotService.findLatestBefore(snapshot.getSnapshotDate());
        SnapshotDiff diff = analysisService.calculateDiff(snapshot, previous);

        PortfolioAnalysisResult result = new PortfolioAnalysisResult(summary, enriched, sectors, diff);
        String prompt = promptGeneratorService.generate(result);

        return ResponseEntity.ok(new PromptResponse(prompt));
    }
}
