package com.daggerheart.hub.subclass.dto;

import com.daggerheart.hub.shared.dto.FeatureDto;
import com.daggerheart.hub.subclass.SpellcastTrait;

import java.util.List;

public record UpdateSubclassRequest(
        String name,
        String oneliner,
        Long parentClassId,
        SpellcastTrait spellcastTrait,
        List<FoundationFeatureDto> foundationFeatures,
        List<FeatureDto> specializationFeatures,
        List<FeatureDto> masteryFeatures,
        Long gameSetId
) {
}
