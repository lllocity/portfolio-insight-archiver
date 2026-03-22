package com.portfolio.settings;

import com.portfolio.settings.model.Setting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingsRepository extends JpaRepository<Setting, String> {
}
