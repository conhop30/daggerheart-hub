CREATE TABLE game_set (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    display_order INTEGER,
    badge_icon TEXT
);

INSERT INTO game_set (name, display_order) VALUES ('Core', 1);
INSERT INTO game_set (name, display_order) VALUES ('Hope and Fear', 2);
