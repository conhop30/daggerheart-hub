package com.daggerheart.hub.subclass;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.daggerheart.hub.heroclass.HeroClassService;
import com.daggerheart.hub.subclass.dto.CreateSubclassRequest;
import com.daggerheart.hub.subclass.dto.SubclassResponse;
import com.daggerheart.hub.subclass.dto.UpdateSubclassRequest;

/**
 * Depends on HeroClassService (subclass -> heroclass), the same pattern
 * as heroclass -> domain. findByParentClass is the actual query behind
 * the Class detail screen's Subclass nav — "every Subclass whose
 * parentClassId matches this Class," which is what makes a Subclass from
 * any Set automatically appear there.
 */
@Service
public class SubclassService {

    private final SubclassRepository repository;
    private final HeroClassService heroClassService;

    public SubclassService(SubclassRepository repository, HeroClassService heroClassService) {
        this.repository = repository;
        this.heroClassService = heroClassService;
    }

    // @Transactional here for the same reason as HeroClassService — all
    // three of Subclass's feature lists are lazy @ElementCollections that
    // need an open session while SubclassResponse.from() reads them.
    @Transactional(readOnly = true)
    public List<SubclassResponse> findAll() {
        return repository.findAll().stream()
                .map(SubclassResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubclassResponse> findByParentClass(Long parentClassId) {
        return repository.findByParentClassId(parentClassId).stream()
                .map(SubclassResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubclassResponse findById(Long id) {
        return repository.findById(id)
                .map(SubclassResponse::from)
                .orElseThrow(() -> new NoSuchElementException("No subclass with id " + id));
    }

    // Idempotent by name, same reasoning and @Transactional need as
    // HeroClassService.create — the existing-record path touches three
    // lazy feature lists.
    @Transactional
    public SubclassResponse create(CreateSubclassRequest request) {
        return repository.findByNameIgnoreCase(request.name())
                .map(SubclassResponse::from)
                .orElseGet(() -> {
                    if (!heroClassService.existsById(request.parentClassId())) {
                        throw new NoSuchElementException("No hero class with id " + request.parentClassId());
                    }

                    Subclass subclass = new Subclass(
                            request.name(),
                            request.oneliner(),
                            request.parentClassId(),
                            request.spellcastTrait(),
                            request.gameSetId()
                    );

                    if (request.foundationFeatures() != null) {
                        subclass.setFoundationFeatures(request.foundationFeatures().stream().map(dto -> dto.toEntity()).toList());
                    }
                    if (request.specializationFeatures() != null) {
                        subclass.setSpecializationFeatures(request.specializationFeatures().stream().map(dto -> dto.toEntity()).toList());
                    }
                    if (request.masteryFeatures() != null) {
                        subclass.setMasteryFeatures(request.masteryFeatures().stream().map(dto -> dto.toEntity()).toList());
                    }

                    return SubclassResponse.from(repository.save(subclass));
                });
    }

    @Transactional
    public SubclassResponse update(Long id, UpdateSubclassRequest request) {
        Subclass existing = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("No subclass with id " + id));

        if (request.name() != null) {
            boolean nameTaken = repository.findByNameIgnoreCase(request.name())
                    .filter(other -> !other.getId().equals(id))
                    .isPresent();
            if (!nameTaken) {
                existing.setName(request.name());
            }
        }
        if (request.oneliner() != null) {
            existing.setOneliner(request.oneliner());
        }
        if (request.parentClassId() != null) {
            if (!heroClassService.existsById(request.parentClassId())) {
                throw new NoSuchElementException("No hero class with id " + request.parentClassId());
            }
            existing.setParentClassId(request.parentClassId());
        }
        if (request.spellcastTrait() != null) {
            existing.setSpellcastTrait(request.spellcastTrait());
        }
        if (request.gameSetId() != null) {
            existing.setGameSetId(request.gameSetId());
        }
        if (request.foundationFeatures() != null) {
            existing.setFoundationFeatures(new ArrayList<>(request.foundationFeatures().stream().map(dto -> dto.toEntity()).toList()));
        }
        if (request.specializationFeatures() != null) {
            existing.setSpecializationFeatures(new ArrayList<>(request.specializationFeatures().stream().map(dto -> dto.toEntity()).toList()));
        }
        if (request.masteryFeatures() != null) {
            existing.setMasteryFeatures(new ArrayList<>(request.masteryFeatures().stream().map(dto -> dto.toEntity()).toList()));
        }

        return SubclassResponse.from(repository.save(existing));
    }

    // Safe to delete freely for now — nothing else references a Subclass
    // by id yet, unlike Domain/HeroClass, which both have the dangling-
    // reference caveat noted in their own delete() methods.
    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("No subclass with id " + id);
        }
        repository.deleteById(id);
    }
}