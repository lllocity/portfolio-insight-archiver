package com.portfolio.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
    int status,
    String error,
    String message,
    LocalDateTime timestamp,
    List<String> details
) {
    public static ApiErrorResponse of(int status, String error, String message) {
        return new ApiErrorResponse(status, error, message, LocalDateTime.now(), null);
    }

    public static ApiErrorResponse of(int status, String error, String message, List<String> details) {
        return new ApiErrorResponse(status, error, message, LocalDateTime.now(), details);
    }
}
