package com.portfolio.jquants;

import com.portfolio.jquants.model.StockMeta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
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

        // Filter out mutual fund identifiers (long fund names, not 4-character stock codes)
        List<String> stockCodes = tickerCodes.stream()
            .filter(code -> code.matches("\\d{3}[0-9A-Z]"))
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

        // Also (re-)fetch dividend info for cached entries whose dividend data is still null
        // — handles migration from before dividend fields were added
        List<String> missingDividend = stockCodes.stream()
            .filter(code -> {
                StockMeta m = validCache.get(code);
                return m != null && m.getAnnualDividendPerShare() == null
                    && m.getHasInterimDividend() == null;
            })
            .toList();

        List<String> dividendFetchCodes = new ArrayList<>(staleCodes);
        for (String code : missingDividend) {
            if (!dividendFetchCodes.contains(code)) dividendFetchCodes.add(code);
        }
        if (!dividendFetchCodes.isEmpty()) {
            fetchAndCacheDividendInfo(dividendFetchCodes, apiKey, validCache);
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
                // API returns 5-character codes (e.g. "72030", "186A0"), normalize to 4-character
                String code = rawCode.length() == 5 ? rawCode.substring(0, 4) : rawCode;
                if (!targetCodes.contains(code)) continue;

                Integer fiscalYearEndMonth = parseMonth(getString(item, "FiscalYearEndMonth"));
                StockMeta meta = new StockMeta(
                    code,
                    getString(item, "CoName"),
                    getString(item, "S33"),
                    getString(item, "S33Nm"),
                    null, null, null, null, null
                );
                meta.setDividendInfo(fiscalYearEndMonth, null, null);
                cacheRepository.save(meta);
                validCache.put(code, meta);
                saved++;
            }
            log.info("Saved {} stock metadata entries to cache.", saved);

        } catch (Exception e) {
            log.warn("Failed to fetch J-Quants master data: {}", e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void fetchAndCacheDividendInfo(List<String> codes, String apiKey,
                                            Map<String, StockMeta> validCache) {
        for (String code : codes) {
            StockMeta meta = validCache.get(code);
            if (meta == null) continue;

            String apiCode = code + "0";  // 4-char → 5-char (e.g. "7203" → "72030")
            try {
                Thread.sleep(500);  // conservative pacing for free-plan rate limit
                Map<?, ?> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/v2/fins/statements")
                        .queryParam("code", apiCode).build())
                    .header("x-api-key", apiKey)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

                if (response == null) continue;
                List<Map<String, Object>> statements =
                    (List<Map<String, Object>>) response.get("statements");
                if (statements == null || statements.isEmpty()) continue;

                // Use the most recent disclosed statement
                Map<String, Object> latest = statements.stream()
                    .max(Comparator.comparing(
                        s -> String.valueOf(s.getOrDefault("DisclosureDate", ""))))
                    .orElse(null);
                if (latest == null) continue;

                // Prefer forecast DPS; fall back to result when forecast is zero
                BigDecimal dps = parseDecimal(getString(latest, "ForecastDividendPerShareAnnual"));
                if (dps == null || dps.compareTo(BigDecimal.ZERO) == 0) {
                    dps = parseDecimal(getString(latest, "ResultDividendPerShareAnnual"));
                }

                BigDecimal q2Forecast = parseDecimal(getString(latest, "ForecastDividendPerShare2ndQuarter"));
                BigDecimal q2Result   = parseDecimal(getString(latest, "ResultDividendPerShare2ndQuarter"));
                boolean hasInterim =
                    (q2Forecast != null && q2Forecast.compareTo(BigDecimal.ZERO) > 0)
                    || (q2Result  != null && q2Result.compareTo(BigDecimal.ZERO)  > 0);

                meta.setDividendInfo(meta.getFiscalYearEndMonth(), dps, hasInterim);
                cacheRepository.save(meta);
                log.debug("Dividend info for {}: DPS={}, hasInterim={}", code, dps, hasInterim);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.debug("Skipping fins/statements for {}: {}", code, e.getMessage());
            }
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof String s ? s : null;
    }

    private Integer parseMonth(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            int month = Integer.parseInt(raw.trim());
            return (month >= 1 && month <= 12) ? month : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.isBlank() || raw.equals("-")) return null;
        try {
            return new BigDecimal(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

}
