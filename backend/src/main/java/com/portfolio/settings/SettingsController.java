package com.portfolio.settings;

import com.portfolio.settings.dto.SettingsDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ResponseEntity<SettingsDto> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping
    public ResponseEntity<SettingsDto> updateSettings(@RequestBody SettingsDto dto) {
        return ResponseEntity.ok(settingsService.updateSettings(dto));
    }
}
