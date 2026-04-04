package com.portfolio.csv;

import com.portfolio.analysis.ImportOrchestrationService;
import com.portfolio.common.exception.CsvParseException;
import com.portfolio.csv.dto.ImportResultDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/csv")
public class CsvImportController {

    private final ImportOrchestrationService orchestrationService;

    public CsvImportController(ImportOrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResultDto> importCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "snapshotDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate snapshotDate) {
        try {
            return ResponseEntity.ok(orchestrationService.executeFromUpload(file.getInputStream(), snapshotDate));
        } catch (IOException e) {
            throw new CsvParseException("Failed to read uploaded file: " + e.getMessage(), e);
        }
    }
}
