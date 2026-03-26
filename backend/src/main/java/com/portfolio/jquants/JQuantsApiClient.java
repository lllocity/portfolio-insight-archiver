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
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();
        this.cacheRepository = cacheRepository;
        this.timeoutSeconds = timeoutSeconds;
    }

    /**
     * Fetches metadata for the given ticker codes.
     * Checks SQLite cache first; if any are stale/missing, fetches ALL listed stocks
     * in a single API call and saves only the needed ones.
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
            // Fetch ALL listed stocks in one API call, save only what we need
            fetchAllAndCache(new HashSet<>(staleCodes), apiKey, validCache);
        }

        return stockCodes.stream()
            .map(code -> validCache.get(code))
            .filter(Objects::nonNull)
            .toList();
    }

    @SuppressWarnings("unchecked")
    private void fetchAllAndCache(Set<String> targetCodes, String apiKey,
                                   Map<String, StockMeta> validCache) {
        try {
            log.info("Fetching all listed stocks from J-Quants /v2/equities/master...");
            Map<?, ?> response = webClient.get()
                .uri("/v2/equities/master")
                .header("x-api-key", apiKey)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(Math.max(timeoutSeconds, 30)))
                .block();

            List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
            if (data == null) return;

            int saved = 0;
            for (Map<String, Object> item : data) {
                String rawCode = getString(item, "Code");
                if (rawCode == null) continue;
                // API returns 5-digit codes (e.g. "72030"), normalize to 4-digit
                String code = rawCode.length() == 5 ? rawCode.substring(0, 4) : rawCode;
                if (!targetCodes.contains(code)) continue;

                StockMeta meta = new StockMeta(
                    code,
                    getString(item, "CoName"),
                    getString(item, "S33"),
                    getString(item, "S33Nm"),
                    null, null, null, null, null
                );
                cacheRepository.save(meta);
                validCache.put(code, meta);
                saved++;
            }
            log.info("Saved {} stock metadata entries to cache.", saved);

        } catch (Exception e) {
            log.warn("Failed to fetch J-Quants master data: {}", e.getMessage());
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof String s ? s : null;
    }

}
