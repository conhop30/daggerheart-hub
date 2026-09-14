package com.daggerheart.hub.heroclass;

import com.daggerheart.hub.heroclass.dto.CreateHeroClassRequest;
import com.daggerheart.hub.heroclass.dto.UpdateHeroClassRequest;
import com.daggerheart.hub.heroclass.dto.HeroClassResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hero-classes")
public class HeroClassController {

    private final HeroClassService service;

    public HeroClassController(HeroClassService service) {
        this.service = service;
    }

    @GetMapping
    public List<HeroClassResponse> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public HeroClassResponse get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HeroClassResponse create(@Valid @RequestBody CreateHeroClassRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public HeroClassResponse update(@PathVariable Long id, @RequestBody UpdateHeroClassRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
