package com.daggerheart.hub.subclass;

import com.daggerheart.hub.shared.Feature;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * parentClassId is the single source of truth for the Class<->Subclass
 * relationship — HeroClass does NOT store a list of its Subclasses. The
 * Classes UI asks "give me every Subclass where parentClassId = X" rather
 * than reading a list off the Class record, which is what makes a
 * Subclass from any Set automatically show up under its parent Class.
 *
 * Sheet-related fields are intentionally omitted for now, matching the
 * same deferral as HeroClass.
 */
@Entity
@Table(name = "subclass")
public class Subclass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String oneliner;

    // Cross-module reference to HeroClass — plain id, not a JPA
    // relationship, same decoupling pattern as everywhere else.
    private Long parentClassId;

    // Nullable: null means "not yet chosen" during editing. NONE (a real
    // enum value) means "genuinely has no spellcast trait."
    @Enumerated(EnumType.STRING)
    private SpellcastTrait spellcastTrait;

    @ElementCollection
    @CollectionTable(name = "subclass_foundation_feature", joinColumns = @JoinColumn(name = "subclass_id"))
    private List<FoundationFeature> foundationFeatures = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "subclass_specialization_feature", joinColumns = @JoinColumn(name = "subclass_id"))
    private List<Feature> specializationFeatures = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "subclass_mastery_feature", joinColumns = @JoinColumn(name = "subclass_id"))
    private List<Feature> masteryFeatures = new ArrayList<>();

    private Long gameSetId;

    protected Subclass() {
        // JPA
    }

    public Subclass(String name, String oneliner, Long parentClassId, SpellcastTrait spellcastTrait, Long gameSetId) {
        this.name = name;
        this.oneliner = oneliner;
        this.parentClassId = parentClassId;
        this.spellcastTrait = spellcastTrait;
        this.gameSetId = gameSetId;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOneliner() {
        return oneliner;
    }

    public void setOneliner(String oneliner) {
        this.oneliner = oneliner;
    }

    public Long getParentClassId() {
        return parentClassId;
    }

    public void setParentClassId(Long parentClassId) {
        this.parentClassId = parentClassId;
    }

    public SpellcastTrait getSpellcastTrait() {
        return spellcastTrait;
    }

    public void setSpellcastTrait(SpellcastTrait spellcastTrait) {
        this.spellcastTrait = spellcastTrait;
    }

    public List<FoundationFeature> getFoundationFeatures() {
        return foundationFeatures;
    }

    public void setFoundationFeatures(List<FoundationFeature> foundationFeatures) {
        this.foundationFeatures = foundationFeatures;
    }

    public List<Feature> getSpecializationFeatures() {
        return specializationFeatures;
    }

    public void setSpecializationFeatures(List<Feature> specializationFeatures) {
        this.specializationFeatures = specializationFeatures;
    }

    public List<Feature> getMasteryFeatures() {
        return masteryFeatures;
    }

    public void setMasteryFeatures(List<Feature> masteryFeatures) {
        this.masteryFeatures = masteryFeatures;
    }

    public Long getGameSetId() {
        return gameSetId;
    }

    public void setGameSetId(Long gameSetId) {
        this.gameSetId = gameSetId;
    }
}
