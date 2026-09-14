package com.daggerheart.hub.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface DomainRepository extends JpaRepository<Domain, Long> {
    Optional<Domain> findByNameIgnoreCase(String name);
}
