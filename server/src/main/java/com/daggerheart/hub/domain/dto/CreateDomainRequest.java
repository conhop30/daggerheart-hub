package com.daggerheart.hub.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDomainRequest(
        @NotBlank String name,
        String description,
        String colorHex,
        String iconPath,
        @NotNull Long gameSetId
) {
}
