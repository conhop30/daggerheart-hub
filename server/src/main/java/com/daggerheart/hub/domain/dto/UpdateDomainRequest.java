package com.daggerheart.hub.domain.dto;

// See UpdateGameSetRequest — same "null means unchanged" convention.
public record UpdateDomainRequest(
        String name,
        String description,
        String colorHex,
        String iconPath,
        Long gameSetId
) {
}
