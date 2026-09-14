package com.daggerheart.hub.subclass;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface SubclassRepository extends JpaRepository<Subclass, Long> {
    List<Subclass> findByParentClassId(Long parentClassId);
    Optional<Subclass> findByNameIgnoreCase(String name);
}
