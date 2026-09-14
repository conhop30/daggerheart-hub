package com.daggerheart.hub.shared.dto;

import com.daggerheart.hub.shared.Feature;
import jakarta.validation.constraints.NotBlank;

public record FeatureDto(@NotBlank String name, String description) {

    public static FeatureDto from(Feature feature) {
        return new FeatureDto(feature.getName(), feature.getDescription());
    }

    public Feature toEntity() {
        return new Feature(name(), description());
    }
}
