package com.daggerheart.hub.domain;

import com.daggerheart.hub.domain.dto.CreateDomainRequest;
import com.daggerheart.hub.domain.dto.DomainResponse;
import com.daggerheart.hub.domain.dto.UpdateDomainRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * The only way other modules (e.g. heroclass, validating that a domain id
 * it was given actually exists) or the frontend should touch Domain data.
 */
@Service
public class DomainService {

    private final DomainRepository repository;

    public DomainService(DomainRepository repository) {
        this.repository = repository;
    }

    public List<DomainResponse> findAll() {
        return repository.findAll().stream()
                .map(DomainResponse::from)
                .toList();
    }

    public DomainResponse findById(Long id) {
        return repository.findById(id)
                .map(DomainResponse::from)
                .orElseThrow(() -> new NoSuchElementException("No domain with id " + id));
    }

    public boolean existsById(Long id) {
        return repository.existsById(id);
    }

    /**
     * Idempotent by name: creating a Domain that already exists (by name,
     * case-insensitive) just returns the existing one instead of erroring
     * or inserting a duplicate. This is what makes re-running a seed
     * script safe without it needing its own existence check first.
     */
    public DomainResponse create(CreateDomainRequest request) {
        return repository.findByNameIgnoreCase(request.name())
                .map(DomainResponse::from)
                .orElseGet(() -> {
                    Domain saved = repository.save(new Domain(
                            request.name(),
                            request.description(),
                            request.colorHex(),
                            request.iconPath(),
                            request.gameSetId()
                    ));
                    return DomainResponse.from(saved);
                });
    }

    /**
     * KNOWN LIMITATION: this does not check whether any HeroClass still
     * references this Domain's id. Domain can't safely depend on heroclass
     * to check that — heroclass already depends on domain, and the
     * reverse would create a cycle, which Spring Modulith forbids. For
     * now, deleting a Domain still in use leaves any HeroClass pointing
     * to it with a dangling id rather than blocking the delete or
     * cascading. Revisit with an event-based check (heroclass listening
     * for a "Domain deleted" event, since that direction of dependency
     * already exists) once this becomes a real problem rather than a
     * theoretical one.
     */
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("No domain with id " + id);
        }
        repository.deleteById(id);
    }

    /**
     * Only fields present in the request are applied — see
     * GameSetService.update for the full explanation of this convention.
     */
    public DomainResponse update(Long id, UpdateDomainRequest request) {
        Domain existing = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("No domain with id " + id));

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
        if (request.colorHex() != null) {
            existing.setColorHex(request.colorHex());
        }
        if (request.iconPath() != null) {
            existing.setIconPath(request.iconPath());
        }
        if (request.gameSetId() != null) {
            existing.setGameSetId(request.gameSetId());
        }

        return DomainResponse.from(repository.save(existing));
    }
}
