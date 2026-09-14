package com.daggerheart.hub.gameset.dto;

import com.daggerheart.hub.gameset.GameSet;

/**
 * What the API actually returns. Keeping this separate from the entity
 * means the JPA model can change shape without silently changing the
 * public API contract other modules and the frontend depend on.
 */
public record GameSetResponse(Long id, String name, Integer displayOrder, String badgeIcon) {

    public static GameSetResponse from(GameSet gameSet) {
        return new GameSetResponse(
                gameSet.getId(),
                gameSet.getName(),
                gameSet.getDisplayOrder(),
                gameSet.getBadgeIcon()
        );
    }
}
