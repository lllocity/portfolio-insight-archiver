package com.portfolio.dividend;

import com.portfolio.jquants.StockMetaCacheRepository;
import com.portfolio.jquants.model.StockMeta;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Scrapes annual dividend per share and payment months from Yahoo Finance.
 * Runs asynchronously after CSV import to avoid HTTP timeout.
 * Re-scrapes all holdings unconditionally on every import to capture forecast updates.
 */
@Service
public class DividendScrapingService {

    private static final Logger log = LoggerFactory.getLogger(DividendScrapingService.class);

    private final StockMetaCacheRepository cacheRepository;

    public DividendScrapingService(StockMetaCacheRepository cacheRepository) {
        this.cacheRepository = cacheRepository;
    }

    @Async("dividendScrapeExecutor")
    public void scrapeAndCacheAsync(List<String> tickerCodes) {
        List<String> stockCodes = tickerCodes.stream()
            .filter(code -> code.matches("\\d{3}[0-9A-Z]"))
            .toList();
        log.info("Starting dividend scraping for {} stock(s)...", stockCodes.size());

        for (String code : stockCodes) {
            try {
                Thread.sleep(1500);
                scrapeOne(code);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Dividend scrape failed for {}: {}", code, e.getMessage());
            }
        }
        log.info("Dividend scraping completed.");
    }

    private void scrapeOne(String code) throws Exception {
        String url = "https://finance.yahoo.co.jp/quote/" + code + ".T/dividend";
        Document doc = Jsoup.connect(url)
            .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
            .timeout(10_000)
            .get();

        BigDecimal dps = parseForecastDps(doc);
        if (dps == null) {
            dps = parseLatestHistoricalDps(doc);
        }

        String monthsStr = parsePaymentMonths(doc);

        StockMeta meta = cacheRepository.findById(code).orElse(null);
        if (meta == null) return;

        meta.setDividendData(dps, monthsStr);
        cacheRepository.save(meta);
        log.info("Dividend scraped for {}: DPS={}, months={}", code, dps, monthsStr);
    }

    // Reads "1株当たり配当金（会社予想）" from the #dvdinfo section header.
    private BigDecimal parseForecastDps(Document doc) {
        Element dvdinfo = doc.selectFirst("section#dvdinfo");
        if (dvdinfo == null) return null;
        Element dd = dvdinfo.selectFirst("ul > li:first-child dd");
        if (dd == null) return null;
        Element valueEl = dd.selectFirst("[class*='DataListItem__value']");
        if (valueEl == null) return null;
        return parseBigDecimal(valueEl.text().trim());
    }

    // Falls back to the most recent historical year's annual dividend (adjusted for splits).
    private BigDecimal parseLatestHistoricalDps(Document doc) {
        Elements tables = doc.select("table");
        if (tables.size() < 2) return null;
        Element histTable = tables.get(1);
        Element firstRow = histTable.selectFirst("tbody tr");
        if (firstRow == null) return null;
        Elements tds = firstRow.select("td");
        if (tds.isEmpty()) return null;
        Element valueEl = tds.get(0).selectFirst("[class*='StyledNumber__value']");
        if (valueEl == null) return null;
        return parseBigDecimal(valueEl.text());
    }

    // Infers payment months from fiscal year end month and which quarters have dividends > 0.
    // Formula: quarter end month = FYE - (4-i)*3, payment month = quarter end + 3.
    private String parsePaymentMonths(Document doc) {
        Element dvdinfo = doc.selectFirst("section#dvdinfo");
        if (dvdinfo == null) return null;
        Element dateEl = dvdinfo.selectFirst("ul > li:first-child [class*='DataListItem__date']");
        if (dateEl == null) return null;
        // Text format: "(2027/03)" — extract month
        String dateText = dateEl.text().replaceAll("[^\\d/]", "");
        String[] dateParts = dateText.split("/");
        if (dateParts.length < 2) return null;
        int fyeMonth;
        try { fyeMonth = Integer.parseInt(dateParts[1]); }
        catch (NumberFormatException e) { return null; }

        Elements tables = doc.select("table");
        if (tables.isEmpty()) return null;
        Element forecastRow = tables.get(0).selectFirst("tbody tr");
        if (forecastRow == null) return null;
        Elements tds = forecastRow.select("td");

        List<Integer> paymentMonths = new ArrayList<>();
        for (int i = 1; i <= 4 && i < tds.size(); i++) {
            Element valueEl = tds.get(i).selectFirst("[class*='StyledNumber__value']");
            if (valueEl == null) continue;
            BigDecimal val = parseBigDecimal(valueEl.text());
            if (val != null && val.compareTo(BigDecimal.ZERO) > 0) {
                int qEndMonth = ((fyeMonth - (4 - i) * 3 - 1 + 120) % 12) + 1;
                int paymentMonth = (qEndMonth % 12) + 3;
                if (paymentMonth > 12) paymentMonth -= 12;
                paymentMonths.add(paymentMonth);
            }
        }

        if (paymentMonths.isEmpty()) return null;
        paymentMonths.sort(Integer::compareTo);
        return paymentMonths.stream().distinct().map(String::valueOf)
            .collect(Collectors.joining(","));
    }

    private BigDecimal parseBigDecimal(String text) {
        if (text == null) return null;
        String cleaned = text.trim().replace(",", "");
        if (cleaned.equals("---") || cleaned.isBlank()) return null;
        try { return new BigDecimal(cleaned); }
        catch (NumberFormatException e) { return null; }
    }
}
