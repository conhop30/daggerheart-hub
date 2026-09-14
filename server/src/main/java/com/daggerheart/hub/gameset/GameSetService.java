package com.daggerheart.hub.gameset;

import com.daggerheart.hub.gameset.dto.CreateGameSetRequest;
import com.daggerheart.hub.gameset.dto.GameSetResponse;
import com.daggerheart.hub.gameset.dto.UpdateGameSetRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Everything outside this package should talk to GameSet data through this
 * service (or the controller below it), never through GameSetRepository
 * directly — the repository is package-private on purpose.
 */
@Service
public class GameSetService {

    private final GameSetRepository repository;

    public GameSetService(GameSetRepository repository) {
        this.repository = repository;
    }

    public List<GameSetResponse> findAll() {
        return repository.findAll().stream()
                .map(GameSetResponse::from)
                .toList();
    }

    public GameSetResponse findById(Long id) {
        return repository.findById(id)
                .map(GameSetResponse::from)
                .orElseThrow(() -> new NoSuchElementException("No game set with id " + id));
    }

    public GameSetResponse create(CreateGameSetRequest request) {
        GameSet saved = repository.save(
                new GameSet(request.name(), request.displayOrder(), request.badgeIcon())
        );
        return GameSetResponse.from(saved);
    }

    /**
     * The uniqueness check excludes the record's own id — otherwise saving
     * an edit without renaming would always "find itself" as a conflict.
     */
    /**
     * Only fields present in the request are applied — a null field means
     * "leave this alone," not "clear it." If the new name would collide
     * with a different existing game set, that one field is silently
     * skipped rather than failing the whole update, consistent with how
     * create() treats duplicates.
     */
    public GameSetResponse update(Long id, UpdateGameSetRequest request) {
        GameSet existing = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("No game set with id " + id));

        if (request.name() != null) {
            boolean nameTaken = repository.findByNameIgnoreCase(request.name())
                    .filter(other -> !other.getId().equals(id))
                    .isPresent();
            if (!nameTaken) {
                existing.setName(request.name());
            }
        }
        if (request.displayOrder() != null) {
            existing.setDisplayOrder(request.displayOrder());
        }
        if (request.badgeIcon() != null) {
            existing.setBadgeIcon(request.badgeIcon());
        }

        return GameSetResponse.from(repository.save(existing));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("No game set with id " + id);
        }
        repository.deleteById(id);
    }
}
