package com.daggerheart.hub.subclass;

import com.daggerheart.hub.subclass.dto.CreateSubclassRequest;
import com.daggerheart.hub.subclass.dto.UpdateSubclassRequest;
import com.daggerheart.hub.subclass.dto.SubclassResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subclasses")
public class SubclassController {

    private final SubclassService service;

    public SubclassController(SubclassService service) {
        this.service = service;
    }

    /**
     * GET /api/subclasses -> everything.
     * GET /api/subclasses?parentClassId=5 -> just that Class's Subclasses,
     * across every Set — this is the call the Class detail screen's
     * Subclass nav actually makes.
     */
    @GetMapping
    public List<SubclassResponse> list(@RequestParam(required = false) Long parentClassId) {
        return parentClassId != null ? service.findByParentClass(parentClassId) : service.findAll();
    }

    @GetMapping("/{id}")
    public SubclassResponse get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubclassResponse create(@Valid @RequestBody CreateSubclassRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public SubclassResponse update(@PathVariable Long id, @RequestBody UpdateSubclassRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
