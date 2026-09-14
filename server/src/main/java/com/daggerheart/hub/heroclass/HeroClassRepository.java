package com.daggerheart.hub.heroclass;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface HeroClassRepository extends JpaRepository<HeroClass, Long> {
    Optional<HeroClass> findByNameIgnoreCase(String name);
}
