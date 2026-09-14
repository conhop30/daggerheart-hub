package com.daggerheart.hub.heroclass;

import com.daggerheart.hub.domain.DomainService;
import com.daggerheart.hub.domain.dto.CreateDomainRequest;
import com.daggerheart.hub.domain.dto.DomainResponse;
import com.daggerheart.hub.heroclass.dto.CreateHeroClassRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * ApplicationModuleTest here pulls in heroclass's declared dependency
 * (domain) too — this is the test that proves the cross-module call in
 * HeroClassService actually works, not just compiles.
 */
@ApplicationModuleTest
class HeroClassModuleTests {

    @Autowired
    private HeroClassService heroClassService;

    @Autowired
    private DomainService domainService;

    @Test
    void createsAHeroClassWithValidDomains() {
        DomainResponse blade = domainService.create(new CreateDomainRequest("Blade", null, null, null, 1L));
        DomainResponse bone = domainService.create(new CreateDomainRequest("Bone", null, null, null, 1L));

        var response = heroClassService.create(new CreateHeroClassRequest(
                "The Guardian", "A stalwart protector", blade.id(), bone.id(),
                10, 7, "A family heirloom", "Unshaken", null, 1L
        ));

        assertThat(response.name()).isEqualTo("The Guardian");
    }

    @Test
    void rejectsDuplicateDomains() {
        DomainResponse blade = domainService.create(new CreateDomainRequest("Blade", null, null, null, 1L));

        assertThrows(IllegalArgumentException.class, () -> heroClassService.create(new CreateHeroClassRequest(
                "Broken Class", null, blade.id(), blade.id(), null, null, null, null, null, 1L
        )));
    }
}
