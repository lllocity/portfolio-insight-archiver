package com.portfolio.settings;

import com.portfolio.settings.dto.SettingsDto;
import com.portfolio.settings.model.Setting;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private static final String KEY_CSV_PATH = "csv.default.path";
    private static final String KEY_DRIVE_FOLDER_ID = "google.drive.folder.id";

    private final SettingsRepository settingsRepository;

    public SettingsService(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @Transactional(readOnly = true)
    public SettingsDto getSettings() {
        String csvPath = getValue(KEY_CSV_PATH);
        String folderId = getValue(KEY_DRIVE_FOLDER_ID);
        return new SettingsDto(csvPath, folderId);
    }

    @Transactional
    public SettingsDto updateSettings(SettingsDto dto) {
        setValue(KEY_CSV_PATH, dto.csvDefaultPath());
        setValue(KEY_DRIVE_FOLDER_ID, dto.googleDriveFolderId());
        return getSettings();
    }

    private String getValue(String key) {
        return settingsRepository.findById(key)
            .map(Setting::getValue)
            .orElse(null);
    }

    private void setValue(String key, String value) {
        Setting setting = settingsRepository.findById(key)
            .orElse(new Setting(key, value));
        setting.setValue(value);
        settingsRepository.save(setting);
    }
}
