package com.portfolio.google;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.docs.v1.Docs;
import com.google.api.services.docs.v1.model.*;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.portfolio.analysis.dto.*;
import com.portfolio.snapshot.model.Snapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Archives portfolio snapshot to Google Docs using a Service Account (FR-GDOCS-01~06, FR-AUTH-01~04).
 * Skips gracefully if GOOGLE_SA_KEY_PATH is not configured (BR-GDOCS-04).
 */
@Service
public class GoogleDocsArchiveService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDocsArchiveService.class);
    private static final String APPLICATION_NAME = "Portfolio Insight Archiver";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final NumberFormat JPY_FORMAT = NumberFormat.getNumberInstance(Locale.JAPAN);

    private static final List<String> SCOPES = List.of(
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive"
    );

    /**
     * Creates or overwrites a Google Docs archive for the given snapshot.
     *
     * @return URL of the created document, or null if skipped/failed
     */
    public String archive(Snapshot snapshot, PortfolioAnalysisResult analysis, String promptText) {
        String saKeyPath = System.getenv("GOOGLE_SA_KEY_PATH");
        if (saKeyPath == null || saKeyPath.isBlank() || !Files.exists(Paths.get(saKeyPath))) {
            log.info("GOOGLE_SA_KEY_PATH not set or file missing, skipping Google Docs archive.");
            return null;
        }

        try {
            GoogleCredentials credentials = GoogleCredentials
                .fromStream(new FileInputStream(saKeyPath))
                .createScoped(SCOPES);

            Docs docsService = new Docs.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials)
            ).setApplicationName(APPLICATION_NAME).build();

            Drive driveService = new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials)
            ).setApplicationName(APPLICATION_NAME).build();

            String title = snapshot.getSnapshotDate().format(DATE_FMT) + " ポートフォリオスナップショット";
            String folderId = System.getenv("GOOGLE_DRIVE_FOLDER_ID");

            // Delete existing document with same title (BR-GDOCS-02)
            deleteExistingDoc(driveService, title, folderId);

            // Create new document
            com.google.api.services.docs.v1.model.Document docMetadata =
                new com.google.api.services.docs.v1.model.Document().setTitle(title);
            com.google.api.services.docs.v1.model.Document createdDoc =
                docsService.documents().create(docMetadata).execute();
            String docId = createdDoc.getDocumentId();

            // Move to target folder if specified
            if (folderId != null && !folderId.isBlank()) {
                driveService.files().update(docId, null)
                    .setAddParents(folderId)
                    .setRemoveParents("root")
                    .execute();
            }

            // Write rich content (BR-GDOCS-03)
            List<Request> requests = buildRequests(snapshot, analysis, promptText);
            docsService.documents().batchUpdate(docId,
                new BatchUpdateDocumentRequest().setRequests(requests)).execute();

            String docUrl = "https://docs.google.com/document/d/" + docId;
            log.info("Google Docs archive created: {}", docUrl);
            return docUrl;

        } catch (Exception e) {
            log.error("Failed to archive to Google Docs", e);
            throw new RuntimeException("Google Docs archive failed: " + e.getMessage(), e);
        }
    }

    private void deleteExistingDoc(Drive driveService, String title, String folderId)
            throws IOException {
        String query = "name = '" + title.replace("'", "\\'") + "' and mimeType = 'application/vnd.google-apps.document' and trashed = false";
        if (folderId != null && !folderId.isBlank()) {
            query += " and '" + folderId + "' in parents";
        }

        FileList existing = driveService.files().list()
            .setQ(query)
            .setFields("files(id)")
            .execute();

        for (File file : existing.getFiles()) {
            driveService.files().delete(file.getId()).execute();
            log.info("Deleted existing document: {}", file.getId());
        }
    }

    /**
     * Builds a list of Google Docs API requests to populate the document (BR-GDOCS-03).
     * Inserts content at index 1 (after the initial empty paragraph), building bottom-up
     * since each insert shifts indices.
     */
    private List<Request> buildRequests(Snapshot snapshot, PortfolioAnalysisResult analysis,
                                         String promptText) {
        // We insert text in reverse order (last section first) because each insertText
        // at index 1 prepends to existing content.
        List<Request> requests = new ArrayList<>();

        // Build the full document text first as a simple approach using paragraphs
        // Note: For rich formatting, we insert text and then apply paragraph styles.

        StringBuilder content = new StringBuilder();

        String dateStr = snapshot.getSnapshotDate().format(DATE_FMT);
        PortfolioSummary summary = analysis.summary();

        // Section 1: Summary
        content.append(dateStr).append(" ポートフォリオスナップショット\n");
        content.append("\n");
        content.append("サマリー\n");
        content.append("総評価額: ¥").append(JPY_FORMAT.format(summary.totalValuation()))
               .append(" | 総損益: ").append(formatProfitLoss(summary.totalProfitLoss()))
               .append(" (").append(summary.totalProfitLossPct()).append("%)\n");
        content.append("保有銘柄数: ").append(summary.holdingCount())
               .append(" | スナップショット日: ").append(dateStr).append("\n");
        content.append("\n");

        // Section 2: Holdings table (as text)
        content.append("保有銘柄リスト\n");
        content.append("銘柄コード\t企業名\tセクター\t数量\t評価額\t損益\t損益率\n");
        for (EnrichedHolding eh : analysis.enrichedHoldings()) {
            var h = eh.holding();
            String company = eh.stockMeta() != null ? eh.stockMeta().getCompanyName() : "-";
            content.append(h.getTickerCode()).append("\t")
                   .append(nvl(company)).append("\t")
                   .append(eh.getSectorName()).append("\t")
                   .append(h.getTotalQuantity()).append("\t")
                   .append(JPY_FORMAT.format(h.getTotalValuation())).append("\t")
                   .append(formatProfitLoss(h.getTotalProfitLoss())).append("\t")
                   .append(h.getTotalProfitLossPct()).append("%\n");
        }
        content.append("\n");

        // Section 3: Sector allocation
        content.append("セクター別構成比\n");
        content.append("セクター\t評価額\t構成比\n");
        for (SectorAllocation sa : analysis.sectorAllocations()) {
            content.append(sa.sector33Name()).append("\t")
                   .append(JPY_FORMAT.format(sa.totalValuation())).append("\t")
                   .append(sa.allocationPct()).append("%\n");
        }
        content.append("\n");

        // Section 4: Diff
        content.append("前回スナップショットとの差分\n");
        SnapshotDiff diff = analysis.diff();
        if (diff.isEmpty()) {
            content.append("（初回スナップショットのため差分なし）\n");
        } else {
            content.append("変化種別\t銘柄\t数量変化\t評価額変化\n");
            for (var h : diff.addedHoldings()) {
                content.append("追加\t").append(h.getTickerCode()).append("\t+").append(h.getTotalQuantity()).append("\t-\n");
            }
            for (var h : diff.removedHoldings()) {
                content.append("除去\t").append(h.getTickerCode()).append("\t-").append(h.getTotalQuantity()).append("\t-\n");
            }
            for (var c : diff.changedHoldings()) {
                content.append("変化\t").append(c.tickerCode()).append("\t")
                       .append(c.quantityDiff()).append("\t")
                       .append(formatProfitLoss(c.valuationDiff())).append("\n");
            }
        }
        content.append("\n");

        // Section 5: AI Prompt
        content.append("AI分析プロンプト\n");
        content.append(promptText).append("\n");

        // Single insertText request at index 1
        requests.add(new Request().setInsertText(
            new InsertTextRequest()
                .setLocation(new Location().setIndex(1))
                .setText(content.toString())
        ));

        return requests;
    }

    private String formatProfitLoss(BigDecimal value) {
        if (value == null) return "-";
        String prefix = value.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return prefix + "¥" + JPY_FORMAT.format(value);
    }

    private String nvl(String value) {
        return value != null ? value : "-";
    }
}
