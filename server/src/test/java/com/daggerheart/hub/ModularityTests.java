package com.daggerheart.hub;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

/**
 * This is the test that actually proves the plug-in architecture claim —
 * it fails the build the moment any module reaches into another module's
 * internals instead of going through its public service/controller.
 */
class ModularityTests {

    @Test
    void moduleStructureIsRespected() {
        ApplicationModules modules = ApplicationModules.of(HubApplication.class);
        modules.verify();
    }
}
