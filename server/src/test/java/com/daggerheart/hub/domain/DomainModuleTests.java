package com.daggerheart.hub.domain;

import com.daggerheart.hub.domain.dto.CreateDomainRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;

import static org.assertj.core.api.Assertions.assertThat;

@ApplicationModuleTest
class DomainModuleTests {

    @Autowired
    private DomainService domainService;

    @Test
    void createsAndListsADomain() {
        domainService.create(new CreateDomainRequest("Blade", "Martial combat", "#A97815", null, 1L));

        assertThat(domainService.findAll())
                .extracting("name")
                .contains("Blade");
    }
}
