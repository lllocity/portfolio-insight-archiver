package com.portfolio.jquants;

import com.portfolio.jquants.model.StockMeta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * J-Quants API client with 24-hour SQLite cache and in-memory token cache.
 * Gracefully degrades if JQUANTS_REFRESH_TOKEN is not set (BR-JQ-03).
 */
@Service
public class JQuantsApiClient {

    private static final Logger log = LoggerFactory.getLogger(JQuantsApiClient.class);
    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private final WebClient webClient;
    private final JQuantsIdTokenCache tokenCache;
    private final StockMetaCacheRepository cacheRepository;
    private final int idTokenTtlHours;
    private final int timeoutSeconds;

    public JQuantsApiClient(
        @Value("${app.jquants.base-url:https://api.jquants.com}") String baseUrl,
        @Value("${app.jquants.timeout-seconds:5}") int timeoutSeconds,
        @Value("${app.jquants.id-token-ttl-hours:24}") int idTokenTtlHours,
        JQuantsIdTokenCache tokenCache,
        StockMetaCacheRepository cacheRepository
    ) {
        this.webClient = WebClient.builder()
            .baseUrl(baseUrl)
            .build();
        this.tokenCache = tokenCache;
        this.cacheRepository = cacheRepository;
        this.idTokenTtlHours = idTokenTtlHours;
        this.timeoutSeconds = timeoutSeconds;
    }

    /**
     * Fetches metadata for the given ticker codes.
     * Uses SQLite 24-hour cache first; fetches only stale/missing entries from API.
     * Returns empty list (not an error) if refresh token is not configured.
     */
    public List<StockMeta> fetchMetadata(List<String> tickerCodes) {
        String refreshToken = System.getenv("JQUANTS_REFRESH_TOKEN");
        if (refreshToken == null || refreshToken.isBlank()) {
            log.info("JQUANTS_REFRESH_TOKEN not set, skipping J-Quants API call.");
            return List.of();
        }

        // Filter out mutual fund identifiers (non-4-digit codes) — J-Quants has no data for them
        List<String> stockCodes = tickerCodes.stream()
            .filter(code -> code.matches("\\d{4}"))
            .toList();
        if (stockCodes.isEmpty()) return List.of();

        // Check SQLite cache
        List<StockMeta> cached = cacheRepository.findAllByTickerCodeIn(stockCodes);
        LocalDateTime now = LocalDateTime.now(JST);

        Map<String, StockMeta> validCache = new HashMap<>();
        for (StockMeta meta : cached) {
            if (meta.getCachedAt().plusHours(24).isAfter(now)) {
                validCache.put(meta.getTickerCode(), meta);
            }
        }

        List<String> staleCodes = stockCodes.stream()
            .filter(code -> !validCache.containsKey(code))
            .toList();

        if (!staleCodes.isEmpty()) {
            String idToken = getIdToken(refreshToken);
            fetchAndCache(staleCodes, idToken, validCache);
        }

        // Return results for stock codes only (funds will have null meta via mergeWithMeta)
        return stockCodes.stream()
            .map(code -> validCache.get(code))
            .filter(Objects::nonNull)
            .toList();
    }

    private String getIdToken(String refreshToken) {
        if (tokenCache.hasValidToken()) {
            return tokenCache.getToken();
        }

        log.info("Fetching new J-Quants ID token...");
        try {
            Map<?, ?> response = webClient.post()
                .uri("/v1/token/auth_refresh")
                .bodyValue(Map.of("refreshtoken", refreshToken))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();

            String idToken = (String) response.get("idToken");
            tokenCache.store(idToken, idTokenTtlHours);
            return idToken;

        } catch (WebClientResponseException.Unauthorized e) {
            tokenCache.invalidate();
            throw new RuntimeException("J-Quants refresh token is invalid or expired.", e);
        }
    }

    private void fetchAndCache(List<String> tickerCodes, String idToken,
                                Map<String, StockMeta> validCache) {
        for (String code : tickerCodes) {
            try {
                Map<?, ?> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                        .path("/v1/listed/info")
                        .queryParam("code", code)
                        .build())
                    .header("Authorization", "Bearer " + idToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

                StockMeta meta = parseStockMeta(code, response);
                cacheRepository.save(meta);
                validCache.put(code, meta);

            } catch (WebClientResponseException.Unauthorized e) {
                tokenCache.invalidate();
                log.warn("J-Quants token expired mid-request for {}, skipping.", code);
            } catch (Exception e) {
                log.warn("Failed to fetch J-Quants metadata for ticker {}: {}", code, e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private StockMeta parseStockMeta(String tickerCode, Map<?, ?> response) {
        List<Map<String, Object>> info = (List<Map<String, Object>>) response.get("info");
        if (info == null || info.isEmpty()) {
            return new StockMeta(tickerCode, null, null, null, null, null, null, null, null);
        }

        Map<String, Object> item = info.get(0);
        return new StockMeta(
            tickerCode,
            getString(item, "CompanyNameEn"),
            getString(item, "Sector33Code"),
            getString(item, "Sector33CodeName"),
            getDecimal(item, "AnnualDividend"),
            getDecimal(item, "MarketCapitalization"),
            getLocalDate(item, "NextAnnouncementDate"),
            getDecimal(item, "PBR"),   // null on free plan — OK per BR-JQ-05
            getDecimal(item, "PER")    // null on free plan — OK per BR-JQ-05
        );
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof String s ? s : null;
    }

    private BigDecimal getDecimal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate getLocalDate(Map<String, Object> map, String key) {
        String val = getString(map, key);
        if (val == null || val.isBlank()) return null;
        try {
            return LocalDate.parse(val);
        } catch (Exception e) {
            return null;
        }
    }
}
