package com.daggerheart.hub.gameset.dto;

// Every field optional/nullable on purpose — null means "leave this field
// alone," not "clear it." To intentionally blank a text field, send an
// empty string, which is distinguishable from omitting the field.
public record UpdateGameSetRequest(String name, Integer displayOrder, String badgeIcon) {
}
