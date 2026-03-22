package com.portfolio.csv;

import com.portfolio.analysis.ImportOrchestrationService;
import com.portfolio.csv.dto.CsvImportRequest;
import com.portfolio.csv.dto.ImportResultDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/csv")
public class CsvImportController {

    private final ImportOrchestrationService orchestrationService;

    public CsvImportController(ImportOrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    @PostMapping("/import")
    public ResponseEntity<ImportResultDto> importCsv(@Valid @RequestBody CsvImportRequest request) {
        ImportResultDto result = orchestrationService.execute(request.filePath());
        return ResponseEntity.ok(result);
    }
}
