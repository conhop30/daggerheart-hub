CREATE TABLE hero_class (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    primary_domain_id INTEGER NOT NULL,
    secondary_domain_id INTEGER NOT NULL,
    starting_evasion INTEGER,
    starting_hp INTEGER,
    class_items TEXT,
    hope_feature TEXT,
    game_set_id INTEGER NOT NULL
);

CREATE TABLE hero_class_feature (
    hero_class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (hero_class_id) REFERENCES hero_class(id)
);
