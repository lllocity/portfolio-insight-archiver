package com.portfolio.snapshot;

import com.portfolio.snapshot.model.Snapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface SnapshotRepository extends JpaRepository<Snapshot, Long> {

    Optional<Snapshot> findBySnapshotDate(LocalDate snapshotDate);

    @Query("SELECT s FROM Snapshot s ORDER BY s.snapshotDate DESC LIMIT 1")
    Optional<Snapshot> findLatest();

    @Query("SELECT s FROM Snapshot s WHERE s.snapshotDate < :date ORDER BY s.snapshotDate DESC LIMIT 1")
    Optional<Snapshot> findLatestBefore(@Param("date") LocalDate date);
}
