package com.daggerheart.hub.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A Daggerheart Domain (Blade, Bone, Codex, etc). Referenced by HeroClass
 * via a plain gameSetId-style Long id, not a JPA relationship — see
 * HeroClass for why.
 *
 * Domain Cards are a separate first-class entity (Card), not modeled here,
 * per the spec — a Domain doesn't need to know its Cards' internals.
 */
@Entity
@Table(name = "domain")
public class Domain {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String description;

    // Hex string, e.g. "#A97815" — chosen over a raw int for direct CSS use.
    private String colorHex;

    // Path/reference to the domain icon asset. Real asset handling (upload,
    // storage location) is a later concern — this just holds a reference.
    private String iconPath;

    // Cross-module reference to GameSet, stored as a plain id — same
    // decoupling pattern as everywhere else, not a JPA relationship.
    private Long gameSetId;

    protected Domain() {
        // JPA
    }

    public Domain(String name, String description, String colorHex, String iconPath, Long gameSetId) {
        this.name = name;
        this.description = description;
        this.colorHex = colorHex;
        this.iconPath = iconPath;
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

    public String getColorHex() {
        return colorHex;
    }

    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }

    public String getIconPath() {
        return iconPath;
    }

    public void setIconPath(String iconPath) {
        this.iconPath = iconPath;
    }

    public Long getGameSetId() {
        return gameSetId;
    }

    public void setGameSetId(Long gameSetId) {
        this.gameSetId = gameSetId;
    }
}
