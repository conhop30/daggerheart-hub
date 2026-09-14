package com.daggerheart.hub.gameset;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * The "Set" content type from the spec (Core, Hope and Fear, and any future
 * expansion). Named GameSet rather than Set to avoid colliding with
 * java.util.Set. Every other content type holds a foreign key back to one
 * of these rather than a hardcoded enum, so adding a new expansion later is
 * one new row here, not a schema change anywhere else.
 */
@Entity
@Table(name = "game_set")
public class GameSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private Integer displayOrder;

    // Reference/path to the badge icon shown in the Subclass nav grouping.
    private String badgeIcon;

    protected GameSet() {
        // JPA
    }

    public GameSet(String name, Integer displayOrder, String badgeIcon) {
        this.name = name;
        this.displayOrder = displayOrder;
        this.badgeIcon = badgeIcon;
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

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public String getBadgeIcon() {
        return badgeIcon;
    }

    public void setBadgeIcon(String badgeIcon) {
        this.badgeIcon = badgeIcon;
    }
}
