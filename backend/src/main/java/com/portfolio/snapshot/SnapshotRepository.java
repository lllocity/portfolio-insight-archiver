package com.portfolio.snapshot;

import com.portfolio.snapshot.model.Snapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SnapshotRepository extends JpaRepository<Snapshot, Long> {

    Optional<Snapshot> findBySnapshotDate(LocalDate snapshotDate);

    List<Snapshot> findAllByOrderBySnapshotDateDesc();

    @Query("SELECT s FROM Snapshot s LEFT JOIN FETCH s.holdings WHERE s.snapshotDate = (SELECT MAX(s2.snapshotDate) FROM Snapshot s2)")
    Optional<Snapshot> findLatest();

    @Query("SELECT s FROM Snapshot s LEFT JOIN FETCH s.holdings WHERE s.snapshotDate = (SELECT MAX(s2.snapshotDate) FROM Snapshot s2 WHERE s2.snapshotDate < :date)")
    Optional<Snapshot> findLatestBefore(@Param("date") LocalDate date);

    @Query("SELECT s FROM Snapshot s LEFT JOIN FETCH s.holdings WHERE s.snapshotDate = :snapshotDate")
    Optional<Snapshot> findBySnapshotDateWithHoldings(@Param("snapshotDate") LocalDate snapshotDate);
}
