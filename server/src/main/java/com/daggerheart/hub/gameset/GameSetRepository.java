package com.daggerheart.hub.gameset;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface GameSetRepository extends JpaRepository<GameSet, Long> {
    Optional<GameSet> findByNameIgnoreCase(String name);
}
