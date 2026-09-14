package com.daggerheart.hub.subclass.dto;

import com.daggerheart.hub.shared.dto.FeatureDto;
import com.daggerheart.hub.subclass.SpellcastTrait;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateSubclassRequest(
        @NotBlank String name,
        String oneliner,
        @NotNull Long parentClassId,
        SpellcastTrait spellcastTrait,
        @Valid List<FoundationFeatureDto> foundationFeatures,
        @Valid List<FeatureDto> specializationFeatures,
        @Valid List<FeatureDto> masteryFeatures,
        @NotNull Long gameSetId
) {
}
