package com.daggerheart.hub.subclass.dto;

import com.daggerheart.hub.shared.dto.FeatureDto;
import com.daggerheart.hub.subclass.Subclass;
import com.daggerheart.hub.subclass.SpellcastTrait;

import java.util.List;

public record SubclassResponse(
        Long id,
        String name,
        String oneliner,
        Long parentClassId,
        SpellcastTrait spellcastTrait,
        List<FoundationFeatureDto> foundationFeatures,
        List<FeatureDto> specializationFeatures,
        List<FeatureDto> masteryFeatures,
        Long gameSetId
) {
    public static SubclassResponse from(Subclass subclass) {
        return new SubclassResponse(
                subclass.getId(),
                subclass.getName(),
                subclass.getOneliner(),
                subclass.getParentClassId(),
                subclass.getSpellcastTrait(),
                subclass.getFoundationFeatures().stream().map(FoundationFeatureDto::from).toList(),
                subclass.getSpecializationFeatures().stream().map(FeatureDto::from).toList(),
                subclass.getMasteryFeatures().stream().map(FeatureDto::from).toList(),
                subclass.getGameSetId()
        );
    }
}
