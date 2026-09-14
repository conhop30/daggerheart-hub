package com.daggerheart.hub.heroclass;

import com.daggerheart.hub.shared.Feature;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * The "Class" content type from the spec, named HeroClass to avoid
 * colliding with java.lang.Class. Subclasses are NOT stored here — see
 * the (future) Subclass entity's parentClassId, which is the single
 * source of truth for that relationship (avoids the list-on-both-sides
 * sync problem).
 *
 * Sheet-related fields (AdditionalSheetsRequired/AdditionalSheets) are
 * intentionally omitted for now per the spec's deferral decision.
 */
@Entity
@Table(name = "hero_class")
public class HeroClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(length = 4000)
    private String description;

    // Exactly two Domains, stored as plain ids (see class javadoc on
    // gameset for why this isn't a JPA relationship into the domain
    // module). Validated as a pair at the service layer, not the DB
    // layer — SQLite has no clean way to enforce "exactly 2" declaratively.
    private Long primaryDomainId;
    private Long secondaryDomainId;

    private Integer startingEvasion;

    private Integer startingHp;

    // Flavor text, not a real Equipment reference — confirmed in spec.
    @Column(length = 1000)
    private String classItems;

    @Column(length = 2000)
    private String hopeFeature;

    @ElementCollection
    @CollectionTable(name = "hero_class_feature", joinColumns = @JoinColumn(name = "hero_class_id"))
    private List<Feature> classFeatures = new ArrayList<>();

    private Long gameSetId;

    protected HeroClass() {
        // JPA
    }

    public HeroClass(String name, String description, Long primaryDomainId, Long secondaryDomainId,
                      Integer startingEvasion, Integer startingHp, String classItems, String hopeFeature,
                      Long gameSetId) {
        this.name = name;
        this.description = description;
        this.primaryDomainId = primaryDomainId;
        this.secondaryDomainId = secondaryDomainId;
        this.startingEvasion = startingEvasion;
        this.startingHp = startingHp;
        this.classItems = classItems;
        this.hopeFeature = hopeFeature;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getPrimaryDomainId() {
        return primaryDomainId;
    }

    public void setPrimaryDomainId(Long primaryDomainId) {
        this.primaryDomainId = primaryDomainId;
    }

    public Long getSecondaryDomainId() {
        return secondaryDomainId;
    }

    public void setSecondaryDomainId(Long secondaryDomainId) {
        this.secondaryDomainId = secondaryDomainId;
    }

    public Integer getStartingEvasion() {
        return startingEvasion;
    }

    public void setStartingEvasion(Integer startingEvasion) {
        this.startingEvasion = startingEvasion;
    }

    public Integer getStartingHp() {
        return startingHp;
    }

    public void setStartingHp(Integer startingHp) {
        this.startingHp = startingHp;
    }

    public String getClassItems() {
        return classItems;
    }

    public void setClassItems(String classItems) {
        this.classItems = classItems;
    }

    public String getHopeFeature() {
        return hopeFeature;
    }

    public void setHopeFeature(String hopeFeature) {
        this.hopeFeature = hopeFeature;
    }

    public List<Feature> getClassFeatures() {
        return classFeatures;
    }

    public void setClassFeatures(List<Feature> classFeatures) {
        this.classFeatures = classFeatures;
    }

    public Long getGameSetId() {
        return gameSetId;
    }

    public void setGameSetId(Long gameSetId) {
        this.gameSetId = gameSetId;
    }
}
