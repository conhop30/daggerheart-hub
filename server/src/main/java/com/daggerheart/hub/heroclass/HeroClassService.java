package com.daggerheart.hub.heroclass;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.daggerheart.hub.domain.DomainService;
import com.daggerheart.hub.heroclass.dto.CreateHeroClassRequest;
import com.daggerheart.hub.heroclass.dto.HeroClassResponse;
import com.daggerheart.hub.heroclass.dto.UpdateHeroClassRequest;

/**
 * Depends directly on DomainService (a real, declared dependency between
 * two Spring Modulith modules) purely to validate that the domain ids a
 * caller provides actually exist — never touches Domain's repository or
 * entity directly, only its public service. This is what
 * ModularityTests.verify() checks holds true.
 */
@Service
public class HeroClassService {

    private final HeroClassRepository repository;
    private final DomainService domainService;

    public HeroClassService(HeroClassRepository repository, DomainService domainService) {
        this.repository = repository;
        this.domainService = domainService;
    }

    /**
     * @Transactional matters here specifically because classFeatures is a
     * lazy-loaded @ElementCollection. With open-in-view disabled (as we
     * have it), the Hibernate session would otherwise close before
     * HeroClassResponse.from() touches getClassFeatures(), throwing a
     * LazyInitializationException. This keeps the session open for the
     * whole method, including the DTO mapping.
     */
    @Transactional(readOnly = true)
    public List<HeroClassResponse> findAll() {
        return repository.findAll().stream()
                .map(HeroClassResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public HeroClassResponse findById(Long id) {
        return repository.findById(id)
                .map(HeroClassResponse::from)
                .orElseThrow(() -> new NoSuchElementException("No hero class with id " + id));
    }

    public boolean existsById(Long id) {
        return repository.existsById(id);
    }

    /**
     * Idempotent by name, same reasoning as DomainService. @Transactional
     * here (not just readOnly, since this path can still write) because
     * the "already exists" branch maps an existing entity's lazy
     * classFeatures to a DTO — the same lazy-loading concern as findAll.
     */
    @Transactional
    public HeroClassResponse create(CreateHeroClassRequest request) {
        return repository.findByNameIgnoreCase(request.name())
                .map(HeroClassResponse::from)
                .orElseGet(() -> {
                    validateDomains(request.primaryDomainId(), request.secondaryDomainId());

                    HeroClass heroClass = new HeroClass(
                            request.name(),
                            request.description(),
                            request.primaryDomainId(),
                            request.secondaryDomainId(),
                            request.startingEvasion(),
                            request.startingHp(),
                            request.classItems(),
                            request.hopeFeature(),
                            request.gameSetId()
                    );

                    if (request.classFeatures() != null) {
                        heroClass.setClassFeatures(request.classFeatures().stream().map(dto -> dto.toEntity()).toList());
                    }

                    return HeroClassResponse.from(repository.save(heroClass));
                });
    }

    private void validateDomains(Long primaryDomainId, Long secondaryDomainId) {
        if (primaryDomainId.equals(secondaryDomainId)) {
            throw new IllegalArgumentException("A class's two domains must be different (got the same id twice)");
        }
        if (!domainService.existsById(primaryDomainId)) {
            throw new NoSuchElementException("No domain with id " + primaryDomainId);
        }
        if (!domainService.existsById(secondaryDomainId)) {
            throw new NoSuchElementException("No domain with id " + secondaryDomainId);
        }
    }

    /**
     * Only fields present in the request are applied. The two-domain
     * validation is the one tricky part: if only primaryDomainId is
     * being changed, we still need to validate it against the EXISTING
     * secondaryDomainId (the effective pair after the merge), not against
     * a null the request never provided.
     */
    @Transactional
    public HeroClassResponse update(Long id, UpdateHeroClassRequest request) {
        HeroClass existing = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("No hero class with id " + id));

        if (request.name() != null) {
            boolean nameTaken = repository.findByNameIgnoreCase(request.name())
                    .filter(other -> !other.getId().equals(id))
                    .isPresent();
            if (!nameTaken) {
                existing.setName(request.name());
            }
        }
        if (request.description() != null) {
            existing.setDescription(request.description());
        }

        if (request.primaryDomainId() != null || request.secondaryDomainId() != null) {
            Long effectivePrimary = request.primaryDomainId() != null ? request.primaryDomainId() : existing.getPrimaryDomainId();
            Long effectiveSecondary = request.secondaryDomainId() != null ? request.secondaryDomainId() : existing.getSecondaryDomainId();
            validateDomains(effectivePrimary, effectiveSecondary);
            existing.setPrimaryDomainId(effectivePrimary);
            existing.setSecondaryDomainId(effectiveSecondary);
        }

        if (request.startingEvasion() != null) {
            existing.setStartingEvasion(request.startingEvasion());
        }
        if (request.startingHp() != null) {
            existing.setStartingHp(request.startingHp());
        }
        if (request.classItems() != null) {
            existing.setClassItems(request.classItems());
        }
        if (request.hopeFeature() != null) {
            existing.setHopeFeature(request.hopeFeature());
        }
        if (request.gameSetId() != null) {
            existing.setGameSetId(request.gameSetId());
        }
        if (request.classFeatures() != null) {
            existing.setClassFeatures(new ArrayList<>(request.classFeatures().stream().map(dto -> dto.toEntity()).toList()));
        }

        return HeroClassResponse.from(repository.save(existing));
    }

    /**
     * KNOWN LIMITATION: same as Domain's delete — this does not check
     * whether any Subclass still points to this HeroClass's id via
     * parentClassId. heroclass can't safely depend on subclass to check
     * that without creating a cycle (subclass already depends on
     * heroclass). Deleting a HeroClass with existing Subclasses leaves
     * them with a dangling parentClassId for now.
     */
    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("No hero class with id " + id);
        }
        repository.deleteById(id);
    }
}