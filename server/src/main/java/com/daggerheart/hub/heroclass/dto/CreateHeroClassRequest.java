package com.daggerheart.hub.heroclass.dto;

import com.daggerheart.hub.shared.dto.FeatureDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateHeroClassRequest(
        @NotBlank String name,
        String description,
        @NotNull Long primaryDomainId,
        @NotNull Long secondaryDomainId,
        Integer startingEvasion,
        Integer startingHp,
        String classItems,
        String hopeFeature,
        @Valid List<FeatureDto> classFeatures,
        @NotNull Long gameSetId
) {
}
