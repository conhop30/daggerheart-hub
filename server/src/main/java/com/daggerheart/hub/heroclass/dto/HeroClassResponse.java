package com.daggerheart.hub.heroclass.dto;

import com.daggerheart.hub.heroclass.HeroClass;
import com.daggerheart.hub.shared.dto.FeatureDto;

import java.util.List;

public record HeroClassResponse(
        Long id,
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
    public static HeroClassResponse from(HeroClass heroClass) {
        return new HeroClassResponse(
                heroClass.getId(),
                heroClass.getName(),
                heroClass.getDescription(),
                heroClass.getPrimaryDomainId(),
                heroClass.getSecondaryDomainId(),
                heroClass.getStartingEvasion(),
                heroClass.getStartingHp(),
                heroClass.getClassItems(),
                heroClass.getHopeFeature(),
                heroClass.getClassFeatures().stream().map(FeatureDto::from).toList(),
                heroClass.getGameSetId()
        );
    }
}
