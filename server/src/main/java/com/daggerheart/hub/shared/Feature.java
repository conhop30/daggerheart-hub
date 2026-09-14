package com.daggerheart.hub.shared;

import jakarta.persistence.Embeddable;

/**
 * The plain Name+Description shape used for feature lists across several
 * content types (HeroClass.classFeatures, Subclass.specializationFeatures
 * and masteryFeatures, and eventually Adversary/Environment/Transformation/
 * Community/Ancestry). Extracted here once a second module (subclass)
 * needed the exact same shape HeroClass already had — see the git history
 * of heroclass.ClassFeature for the original, module-local version this
 * replaced.
 *
 * Deliberately NOT used for Subclass's FoundationFeatures, which need an
 * extra optional SpellcastTrait field — that stays as its own type local
 * to the subclass module rather than bolting an unused field onto every
 * other feature list.
 */
@Embeddable
public class Feature {

    private String name;

    private String description;

    protected Feature() {
        // JPA
    }

    public Feature(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }
}
