package com.daggerheart.hub.subclass.dto;

import com.daggerheart.hub.subclass.FoundationFeature;
import com.daggerheart.hub.subclass.SpellcastTrait;
import jakarta.validation.constraints.NotBlank;

public record FoundationFeatureDto(@NotBlank String name, String description, SpellcastTrait spellcastTrait) {

    public static FoundationFeatureDto from(FoundationFeature feature) {
        return new FoundationFeatureDto(feature.getName(), feature.getDescription(), feature.getSpellcastTrait());
    }

    public FoundationFeature toEntity() {
        return new FoundationFeature(name(), description(), spellcastTrait());
    }
}
