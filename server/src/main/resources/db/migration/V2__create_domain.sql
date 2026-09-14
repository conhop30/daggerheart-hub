CREATE TABLE domain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color_hex TEXT,
    icon_path TEXT,
    game_set_id INTEGER NOT NULL
);
