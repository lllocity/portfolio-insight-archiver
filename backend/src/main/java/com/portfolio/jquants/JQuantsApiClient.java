package com.portfolio.jquants;

import com.portfolio.jquants.model.StockMeta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * J-Quants API client (v2) with 24-hour SQLite cache.
 * Uses x-api-key header authentication.
 * Gracefully degrades if JQUANTS_API_KEY is not set (BR-JQ-03).
 */
@Service
public class JQuantsApiClient {

    private static final Logger log = LoggerFactory.getLogger(JQuantsApiClient.class);
    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private final WebClient webClient;
    private final StockMetaCacheRepository cacheRepository;
    private final int timeoutSeconds;

    public JQuantsApiClient(
        @Value("${app.jquants.base-url:https://api.jquants.com}") String baseUrl,
        @Value("${app.jquants.timeout-seconds:5}") int timeoutSeconds,
        StockMetaCacheRepository cacheRepository
    ) {
        this.webClient = WebClient.builder()
            .baseUrl(baseUrl)
            .build();
        this.cacheRepository = cacheRepository;
        this.timeoutSeconds = timeoutSeconds;
    }

    /**
     * Fetches metadata for the given ticker codes.
     * Uses SQLite 24-hour cache first; fetches only stale/missing entries from API.
     * Returns empty list (not an error) if API key is not configured.
     */
    public List<StockMeta> fetchMetadata(List<String> tickerCodes) {
        String apiKey = System.getenv("JQUANTS_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            log.info("JQUANTS_API_KEY not set, skipping J-Quants API call.");
            return List.of();
        }

        // Filter out mutual fund identifiers (non-4-digit codes)
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
            fetchAndCache(staleCodes, apiKey, validCache);
        }

        return stockCodes.stream()
            .map(code -> validCache.get(code))
            .filter(Objects::nonNull)
            .toList();
    }

    private void fetchAndCache(List<String> tickerCodes, String apiKey,
                                Map<String, StockMeta> validCache) {
        for (String code : tickerCodes) {
            try {
                Map<?, ?> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                        .path("/v2/equities/master")
                        .queryParam("code", code)
                        .build())
                    .header("x-api-key", apiKey)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

                StockMeta meta = parseStockMeta(code, response);
                cacheRepository.save(meta);
                validCache.put(code, meta);

            } catch (Exception e) {
                log.warn("Failed to fetch J-Quants metadata for ticker {}: {}", code, e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private StockMeta parseStockMeta(String tickerCode, Map<?, ?> response) {
        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data == null || data.isEmpty()) {
            return new StockMeta(tickerCode, null, null, null, null, null, null, null, null);
        }

        Map<String, Object> item = data.get(0);
        return new StockMeta(
            tickerCode,
            getString(item, "CoName"),
            getString(item, "S33"),
            getString(item, "S33Nm"),
            null,   // dividendYield: not available in /v2/equities/master
            null,   // marketCap: not available in /v2/equities/master
            null,   // earningsDate: not available in /v2/equities/master
            null,   // pbr: not available in /v2/equities/master
            null    // per: not available in /v2/equities/master
        );
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof String s ? s : null;
    }

}
