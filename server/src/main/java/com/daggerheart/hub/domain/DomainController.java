package com.daggerheart.hub.domain;

import com.daggerheart.hub.domain.dto.CreateDomainRequest;
import com.daggerheart.hub.domain.dto.UpdateDomainRequest;
import com.daggerheart.hub.domain.dto.DomainResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/domains")
public class DomainController {

    private final DomainService service;

    public DomainController(DomainService service) {
        this.service = service;
    }

    @GetMapping
    public List<DomainResponse> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public DomainResponse get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DomainResponse create(@Valid @RequestBody CreateDomainRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public DomainResponse update(@PathVariable Long id, @RequestBody UpdateDomainRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
