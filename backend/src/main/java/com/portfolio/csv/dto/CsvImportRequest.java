package com.portfolio.csv.dto;

import jakarta.validation.constraints.NotBlank;

public record CsvImportRequest(
    @NotBlank(message = "filePath must not be blank")
    String filePath
) {}
