CREATE TABLE subclass (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    oneliner TEXT,
    parent_class_id INTEGER NOT NULL,
    spellcast_trait TEXT,
    game_set_id INTEGER NOT NULL
);

CREATE TABLE subclass_foundation_feature (
    subclass_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    spellcast_trait TEXT,
    FOREIGN KEY (subclass_id) REFERENCES subclass(id)
);

CREATE TABLE subclass_specialization_feature (
    subclass_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (subclass_id) REFERENCES subclass(id)
);

CREATE TABLE subclass_mastery_feature (
    subclass_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (subclass_id) REFERENCES subclass(id)
);
