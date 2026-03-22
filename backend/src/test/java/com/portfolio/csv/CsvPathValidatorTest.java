package com.portfolio.csv;

import com.portfolio.common.exception.PathSecurityException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.*;

class CsvPathValidatorTest {

    private CsvPathValidator validator;

    @BeforeEach
    void setUp() {
        validator = new CsvPathValidator("/data");
    }

    @Test
    void validPath_returnsNormalizedPath() {
        Path result = validator.validate("/data/New_file.csv");
        assertThat(result.toString()).isEqualTo("/data/New_file.csv");
    }

    @Test
    void pathTraversal_throwsPathSecurityException() {
        assertThatThrownBy(() -> validator.validate("/data/../etc/passwd"))
            .isInstanceOf(PathSecurityException.class);
    }

    @Test
    void pathOutsideAllowedDir_throwsPathSecurityException() {
        assertThatThrownBy(() -> validator.validate("/tmp/evil.csv"))
            .isInstanceOf(PathSecurityException.class);
    }

    @Test
    void blankPath_throwsPathSecurityException() {
        assertThatThrownBy(() -> validator.validate(""))
            .isInstanceOf(PathSecurityException.class);
    }

    @Test
    void nullPath_throwsPathSecurityException() {
        assertThatThrownBy(() -> validator.validate(null))
            .isInstanceOf(PathSecurityException.class);
    }

    @Test
    void nestedValidPath_accepted() {
        Path result = validator.validate("/data/subdir/portfolio.csv");
        assertThat(result.startsWith("/data")).isTrue();
    }
}
