package com.portfolio.memo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/memos")
public class StockMemoController {

    private final StockMemoRepository stockMemoRepository;

    public StockMemoController(StockMemoRepository stockMemoRepository) {
        this.stockMemoRepository = stockMemoRepository;
    }

    record MemoRequest(String content) {}

    /** PUT /api/memos/{tickerCode} — メモを作成または更新 */
    @PutMapping("/{tickerCode}")
    public ResponseEntity<Void> upsert(@PathVariable String tickerCode,
                                       @RequestBody MemoRequest request) {
        if (request.content() == null || request.content().length() > 100) {
            return ResponseEntity.badRequest().build();
        }
        Optional<StockMemo> existing = stockMemoRepository.findById(tickerCode);
        if (existing.isPresent()) {
            existing.get().updateContent(request.content());
            stockMemoRepository.save(existing.get());
        } else {
            stockMemoRepository.save(new StockMemo(tickerCode, request.content()));
        }
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/memos/{tickerCode} — メモを削除 */
    @DeleteMapping("/{tickerCode}")
    public ResponseEntity<Void> delete(@PathVariable String tickerCode) {
        stockMemoRepository.deleteById(tickerCode);
        return ResponseEntity.noContent().build();
    }
}
