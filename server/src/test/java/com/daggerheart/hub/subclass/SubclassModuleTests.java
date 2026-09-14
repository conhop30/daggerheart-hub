package com.daggerheart.hub.subclass;

import com.daggerheart.hub.domain.DomainService;
import com.daggerheart.hub.domain.dto.CreateDomainRequest;
import com.daggerheart.hub.domain.dto.DomainResponse;
import com.daggerheart.hub.heroclass.HeroClassService;
import com.daggerheart.hub.heroclass.dto.CreateHeroClassRequest;
import com.daggerheart.hub.heroclass.dto.HeroClassResponse;
import com.daggerheart.hub.subclass.dto.CreateSubclassRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pulls in subclass's full dependency chain (heroclass, which itself
 * depends on domain) — proving the three-module chain actually works
 * together, not just that each one compiles in isolation.
 */
@ApplicationModuleTest
class SubclassModuleTests {

    @Autowired
    private SubclassService subclassService;

    @Autowired
    private HeroClassService heroClassService;

    @Autowired
    private DomainService domainService;

    private Long createTestClass() {
        DomainResponse blade = domainService.create(new CreateDomainRequest("Blade", null, null, null, 1L));
        DomainResponse bone = domainService.create(new CreateDomainRequest("Bone", null, null, null, 1L));
        HeroClassResponse warrior = heroClassService.create(new CreateHeroClassRequest(
                "Warrior", null, blade.id(), bone.id(), 11, 6, null, null, null, 1L
        ));
        return warrior.id();
    }

    @Test
    void createsASubclassAttachedToItsParentClass() {
        Long warriorId = createTestClass();

        var response = subclassService.create(new CreateSubclassRequest(
                "Call of the Brave", "A relentless frontline fighter",
                warriorId, SpellcastTrait.NONE, null, null, null, 1L
        ));

        assertThat(response.parentClassId()).isEqualTo(warriorId);
    }

    @Test
    void findsSubclassesByParentClass() {
        Long warriorId = createTestClass();
        subclassService.create(new CreateSubclassRequest(
                "Stalwart", null, warriorId, SpellcastTrait.NONE, null, null, null, 1L
        ));

        assertThat(subclassService.findByParentClass(warriorId))
                .extracting("name")
                .contains("Stalwart");
    }

    @Test
    void rejectsAnUnknownParentClass() {
        assertThrows(java.util.NoSuchElementException.class, () -> subclassService.create(
                new CreateSubclassRequest("Orphan Subclass", null, 999L, null, null, null, null, 1L)
        ));
    }
}
