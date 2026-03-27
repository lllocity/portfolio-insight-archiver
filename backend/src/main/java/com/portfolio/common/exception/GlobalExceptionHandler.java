package com.portfolio.common.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(CsvParseException.class)
    public ResponseEntity<ApiErrorResponse> handleCsvParse(CsvParseException ex) {
        log.warn("CSV parse error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiErrorResponse.of(422, "CSV_PARSE_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        // 個人ツールのため根本原因をメッセージに含める（スタックトレースは除く）
        String message = ex.getMessage() != null
            ? ex.getClass().getSimpleName() + ": " + ex.getMessage()
            : "予期しないエラーが発生しました";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiErrorResponse.of(500, "INTERNAL_SERVER_ERROR", message));
    }
}
