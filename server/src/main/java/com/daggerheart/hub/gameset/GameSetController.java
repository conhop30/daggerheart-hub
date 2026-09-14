package com.daggerheart.hub.gameset;

import com.daggerheart.hub.gameset.dto.CreateGameSetRequest;
import com.daggerheart.hub.gameset.dto.UpdateGameSetRequest;
import com.daggerheart.hub.gameset.dto.GameSetResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * The shape here (list/get/create/update/delete, sentence-case JSON keys
 * via records) is the pattern every other module's controller should
 * follow — this is the "consistent contract" from the architecture doc,
 * made concrete.
 */
@RestController
@RequestMapping("/api/game-sets")
public class GameSetController {

    private final GameSetService service;

    public GameSetController(GameSetService service) {
        this.service = service;
    }

    @GetMapping
    public List<GameSetResponse> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public GameSetResponse get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameSetResponse create(@Valid @RequestBody CreateGameSetRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public GameSetResponse update(@PathVariable Long id, @RequestBody UpdateGameSetRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
