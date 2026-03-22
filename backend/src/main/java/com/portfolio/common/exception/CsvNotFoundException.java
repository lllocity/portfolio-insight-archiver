package com.portfolio.common.exception;

public class CsvNotFoundException extends RuntimeException {

    public CsvNotFoundException(String path) {
        super("CSV file not found: " + path);
    }
}
