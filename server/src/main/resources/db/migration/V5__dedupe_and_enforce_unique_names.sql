-- One-time cleanup: keep only the lowest-id row per duplicate name, for
-- every table that's been created by hand through the API so far. Child
-- feature rows are removed first so no orphaned rows are left behind.

DELETE FROM hero_class_feature
WHERE hero_class_id IN (
    SELECT id FROM hero_class
    WHERE id NOT IN (SELECT MIN(id) FROM hero_class GROUP BY name)
);
DELETE FROM hero_class
WHERE id NOT IN (SELECT MIN(id) FROM hero_class GROUP BY name);

DELETE FROM domain
WHERE id NOT IN (SELECT MIN(id) FROM domain GROUP BY name);

DELETE FROM subclass_foundation_feature
WHERE subclass_id IN (
    SELECT id FROM subclass
    WHERE id NOT IN (SELECT MIN(id) FROM subclass GROUP BY name)
);
DELETE FROM subclass_specialization_feature
WHERE subclass_id IN (
    SELECT id FROM subclass
    WHERE id NOT IN (SELECT MIN(id) FROM subclass GROUP BY name)
);
DELETE FROM subclass_mastery_feature
WHERE subclass_id IN (
    SELECT id FROM subclass
    WHERE id NOT IN (SELECT MIN(id) FROM subclass GROUP BY name)
);
DELETE FROM subclass
WHERE id NOT IN (SELECT MIN(id) FROM subclass GROUP BY name);

-- Going forward: a database-level backstop against duplicate names, in
-- addition to the service-layer check below. Belt and suspenders — the
-- service check should catch this first, but a raw insert that somehow
-- bypassed it would still be rejected here rather than silently
-- succeeding.
CREATE UNIQUE INDEX idx_domain_name ON domain(name);
CREATE UNIQUE INDEX idx_hero_class_name ON hero_class(name);
CREATE UNIQUE INDEX idx_subclass_name ON subclass(name);
