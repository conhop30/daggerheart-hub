package com.daggerheart.hub.subclass;

import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/**
 * Like shared.Feature (Name+Description), but with an optional per-feature
 * SpellcastTrait override — some subclasses grant a trait swap as a
 * foundation-tier feature rather than baking it into the subclass's own
 * SpellcastTrait. Kept local to this module rather than extending
 * shared.Feature, since Specialization/Mastery features don't need this
 * field at all.
 */
@Embeddable
public class FoundationFeature {

    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    private SpellcastTrait spellcastTrait;

    protected FoundationFeature() {
        // JPA
    }

    public FoundationFeature(String name, String description, SpellcastTrait spellcastTrait) {
        this.name = name;
        this.description = description;
        this.spellcastTrait = spellcastTrait;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public SpellcastTrait getSpellcastTrait() {
        return spellcastTrait;
    }
}
