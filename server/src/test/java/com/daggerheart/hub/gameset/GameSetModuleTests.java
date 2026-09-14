package com.daggerheart.hub.gameset;

import com.daggerheart.hub.gameset.dto.CreateGameSetRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * @ApplicationModuleTest boots ONLY the gameset module (and its declared
 * dependencies, which for gameset is none) — this is the direct test of
 * "can this module run/be unplugged in isolation."
 */
@ApplicationModuleTest
class GameSetModuleTests {

    @Autowired
    private GameSetService gameSetService;

    @Test
    void createsAndListsAGameSet() {
        gameSetService.create(new CreateGameSetRequest("Frontier", 3, null));

        assertThat(gameSetService.findAll())
                .extracting("name")
                .contains("Frontier");
    }
}
