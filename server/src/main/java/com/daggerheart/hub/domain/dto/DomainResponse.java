package com.daggerheart.hub.domain.dto;

import com.daggerheart.hub.domain.Domain;

public record DomainResponse(
        Long id,
        String name,
        String description,
        String colorHex,
        String iconPath,
        Long gameSetId
) {
    public static DomainResponse from(Domain domain) {
        return new DomainResponse(
                domain.getId(),
                domain.getName(),
                domain.getDescription(),
                domain.getColorHex(),
                domain.getIconPath(),
                domain.getGameSetId()
        );
    }
}
