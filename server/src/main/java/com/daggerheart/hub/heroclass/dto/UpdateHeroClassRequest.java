package com.daggerheart.hub.heroclass.dto;

import com.daggerheart.hub.shared.dto.FeatureDto;

import java.util.List;

// Same "null means unchanged" convention as UpdateGameSetRequest. Note
// classFeatures follows the same rule at the list level: omitting it
// leaves the existing features alone; sending an empty array clears them.
public record UpdateHeroClassRequest(
        String name,
        String description,
        Long primaryDomainId,
        Long secondaryDomainId,
        Integer startingEvasion,
        Integer startingHp,
        String classItems,
        String hopeFeature,
        List<FeatureDto> classFeatures,
        Long gameSetId
) {
}
