package com.portfolio.csv;

import com.portfolio.analysis.ImportOrchestrationService;
import com.portfolio.common.exception.CsvParseException;
import com.portfolio.csv.dto.ImportResultDto;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/csv")
public class CsvImportController {

    private final ImportOrchestrationService orchestrationService;

    public CsvImportController(ImportOrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResultDto> importCsv(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(orchestrationService.executeFromUpload(file.getInputStream()));
        } catch (IOException e) {
            throw new CsvParseException("Failed to read uploaded file: " + e.getMessage(), e);
        }
    }
}
