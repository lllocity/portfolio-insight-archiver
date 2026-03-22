package com.portfolio.jquants;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * In-memory cache for J-Quants ID token (BL-05).
 * ID token is valid for 24 hours; we store it with its expiry time.
 */
@Component
public class JQuantsIdTokenCache {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private String idToken;
    private LocalDateTime expiresAt;

    public boolean hasValidToken() {
        return idToken != null && expiresAt != null
            && LocalDateTime.now(JST).isBefore(expiresAt);
    }

    public String getToken() {
        return idToken;
    }

    public void store(String token, int ttlHours) {
        this.idToken = token;
        this.expiresAt = LocalDateTime.now(JST).plusHours(ttlHours);
    }

    public void invalidate() {
        this.idToken = null;
        this.expiresAt = null;
    }
}
