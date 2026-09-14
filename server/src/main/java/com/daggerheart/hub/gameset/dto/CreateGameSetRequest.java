package com.daggerheart.hub.gameset.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateGameSetRequest(
        @NotBlank String name,
        Integer displayOrder,
        String badgeIcon
) {
}
