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

    @ExceptionHandler(CsvNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleCsvNotFound(CsvNotFoundException ex) {
        log.warn("CSV file not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiErrorResponse.of(404, "NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(CsvParseException.class)
    public ResponseEntity<ApiErrorResponse> handleCsvParse(CsvParseException ex) {
        log.warn("CSV parse error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiErrorResponse.of(422, "CSV_PARSE_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(PathSecurityException.class)
    public ResponseEntity<ApiErrorResponse> handlePathSecurity(PathSecurityException ex) {
        log.warn("Path security violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse.of(400, "INVALID_PATH", "Invalid file path specified."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex) {
        // Do NOT expose stack trace or message to client (BR-ERR-03)
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiErrorResponse.of(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred."));
    }
}
