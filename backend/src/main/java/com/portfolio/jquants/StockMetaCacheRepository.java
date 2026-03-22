package com.portfolio.jquants;

import com.portfolio.jquants.model.StockMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMetaCacheRepository extends JpaRepository<StockMeta, String> {

    List<StockMeta> findAllByTickerCodeIn(List<String> tickerCodes);
}
