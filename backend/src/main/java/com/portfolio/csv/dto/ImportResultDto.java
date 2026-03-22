package com.portfolio.csv.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ImportResultDto(
    boolean success,
    LocalDate snapshotDate,
    int importedCount,
    String docUrl,
    List<String> warnings
) {}
