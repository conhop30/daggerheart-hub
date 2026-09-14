package com.daggerheart.hub.subclass;

/**
 * Deliberately has no UNKNOWN value — per the spec, "not yet chosen"
 * during editing is represented by a null field, not a fake enum member.
 * NONE is a real, distinct value meaning "genuinely has no spellcast
 * trait," which is different from "hasn't been set yet."
 */
public enum SpellcastTrait {
    STRENGTH, FINESSE, KNOWLEDGE, PRESENCE, AGILITY, INSTINCT, NONE
}
