package com.portfolio.csv;

import com.portfolio.common.exception.PathSecurityException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Validates that a given CSV file path is within the allowed directory.
 * Prevents path traversal attacks (SECURITY-01).
 */
@Component
public class CsvPathValidator {

    private final Path allowedDir;

    public CsvPathValidator(@Value("${app.csv.allowed-dir:/data}") String allowedDir) {
        this.allowedDir = Paths.get(allowedDir).toAbsolutePath().normalize();
    }

    /**
     * Returns the validated, normalized Path for the given file path string.
     *
     * @throws PathSecurityException if the path escapes the allowed directory
     */
    public Path validate(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            throw new PathSecurityException("File path must not be blank.");
        }

        Path normalized;
        try {
            normalized = Paths.get(filePath).toAbsolutePath().normalize();
        } catch (Exception e) {
            throw new PathSecurityException("Invalid file path format.");
        }

        if (!normalized.startsWith(allowedDir)) {
            throw new PathSecurityException(
                "File path is outside the allowed directory: " + allowedDir);
        }

        return normalized;
    }
}
