package com.portfolio.memo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface StockMemoRepository extends JpaRepository<StockMemo, String> {

    List<StockMemo> findAllByTickerCodeIn(List<String> tickerCodes);

    @Modifying
    @Transactional
    @Query("DELETE FROM StockMemo m WHERE m.tickerCode NOT IN :tickerCodes")
    void deleteAllByTickerCodeNotIn(@Param("tickerCodes") List<String> tickerCodes);
}
