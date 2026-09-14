-- Seeds the Hope & Fear expansion's new Dread Domain, its 4 new Classes
-- (Assassin, Brawler, Warlock, Witch), and their 8 Subclasses (2 each).
-- Extracted from the official Hope & Fear PDF -- exact mechanics/numbers/
-- dice/names preserved, all descriptions rewritten in original wording,
-- same copyright approach as V6 and the original Core seed data.
-- Uses the same INSERT OR IGNORE + unconditional UPDATE + delete-then-
-- reinsert-features pattern as V6, so it's safe to run more than once and
-- safe even if any of this data was already partially entered by hand.

-- === Dread Domain ===
INSERT OR IGNORE INTO domain (name, description, color_hex, game_set_id)
VALUES ('Dread', 'The domain of nightmares and fear, drawing on terrors most people are too afraid to touch. Its practitioners summon monstrous forces, weaken their enemies, and wield terror itself as a weapon.', '#3B1220', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE domain SET description = 'The domain of nightmares and fear, drawing on terrors most people are too afraid to touch. Its practitioners summon monstrous forces, weaken their enemies, and wield terror itself as a weapon.', color_hex = '#3B1220' WHERE name = 'Dread';

-- === Hope & Fear Classes (4 total) ===
-- Assassin
INSERT OR IGNORE INTO hero_class (name, primary_domain_id, secondary_domain_id, starting_evasion, starting_hp, class_items, hope_feature, game_set_id)
VALUES ('Assassin', (SELECT id FROM domain WHERE name = 'Blade'), (SELECT id FROM domain WHERE name = 'Midnight'), 12, 5, 'A list of names with several marked off, or a rusted blade bearing a faded insignia', 'Deadly Determination: Spend 3 Hope to steady yourself and clear 2 Stress.', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE hero_class SET primary_domain_id = (SELECT id FROM domain WHERE name = 'Blade'), secondary_domain_id = (SELECT id FROM domain WHERE name = 'Midnight'), starting_evasion = 12, starting_hp = 5, class_items = 'A list of names with several marked off, or a rusted blade bearing a faded insignia', hope_feature = 'Deadly Determination: Spend 3 Hope to steady yourself and clear 2 Stress.' WHERE name = 'Assassin';

DELETE FROM hero_class_feature WHERE hero_class_id = (SELECT id FROM hero_class WHERE name = 'Assassin');
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Marked for Death', 'On a successful weapon attack, mark a Stress to brand the target as Marked for Death; while they carry that mark, add a number of d4s equal to your tier to any damage you deal them. Only one target can be Marked for Death at a time -- the mark ends when you rest, that target falls, or the GM spends Fear equal to your tier to break it.' FROM hero_class WHERE name = 'Assassin';
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Get In & Get Out', 'Spend a Hope to have the GM describe a quick, inconspicuous way into or out of a place you can see; your next roll that relies on that opening gains advantage.' FROM hero_class WHERE name = 'Assassin';

-- Brawler
INSERT OR IGNORE INTO hero_class (name, primary_domain_id, secondary_domain_id, starting_evasion, starting_hp, class_items, hope_feature, game_set_id)
VALUES ('Brawler', (SELECT id FROM domain WHERE name = 'Valor'), (SELECT id FROM domain WHERE name = 'Bone'), 10, 6, 'Hand wraps passed down from a mentor, or a book about a secret hobby', 'Square Up: Spend 3 Hope to intimidate a target within Close range, making them temporarily Vulnerable.', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE hero_class SET primary_domain_id = (SELECT id FROM domain WHERE name = 'Valor'), secondary_domain_id = (SELECT id FROM domain WHERE name = 'Bone'), starting_evasion = 10, starting_hp = 6, class_items = 'Hand wraps passed down from a mentor, or a book about a secret hobby', hope_feature = 'Square Up: Spend 3 Hope to intimidate a target within Close range, making them temporarily Vulnerable.' WHERE name = 'Brawler';

DELETE FROM hero_class_feature WHERE hero_class_id = (SELECT id FROM hero_class WHERE name = 'Brawler');
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'I Am the Weapon', 'Your bare hands count as a weapon of their own -- Brawler''s Strike -- active whenever you have no other weapon equipped. It uses a trait of your choice, reaches Melee range, and deals physical damage equal to your Proficiency in d8s plus d6s. While it''s your active weapon, you also gain a +1 bonus to Evasion.' FROM hero_class WHERE name = 'Brawler';
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Combo Strike', 'After rolling damage on a successful Melee attack, mark a Stress to keep rolling your Combo Die, adding each result as extra damage, until a roll comes in lower than the one before it. Your Combo Die starts as a d4 and can be upgraded a step once per tier as a level-up option.' FROM hero_class WHERE name = 'Brawler';

-- Warlock
INSERT OR IGNORE INTO hero_class (name, primary_domain_id, secondary_domain_id, starting_evasion, starting_hp, class_items, hope_feature, game_set_id)
VALUES ('Warlock', (SELECT id FROM domain WHERE name = 'Dread'), (SELECT id FROM domain WHERE name = 'Grace'), 11, 5, 'A carving of your patron''s symbol, or a ring you can''t remove', 'Patron''s Boon: When you fail a roll, spend 3 Hope to reroll it with advantage.', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE hero_class SET primary_domain_id = (SELECT id FROM domain WHERE name = 'Dread'), secondary_domain_id = (SELECT id FROM domain WHERE name = 'Grace'), starting_evasion = 11, starting_hp = 5, class_items = 'A carving of your patron''s symbol, or a ring you can''t remove', hope_feature = 'Patron''s Boon: When you fail a roll, spend 3 Hope to reroll it with advantage.' WHERE name = 'Warlock';

DELETE FROM hero_class_feature WHERE hero_class_id = (SELECT id FROM hero_class WHERE name = 'Warlock');
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Patron''s Pact', 'You''ve bound yourself to a supernatural patron in exchange for power. Name them, and work with your GM to define their sphere of influence. Before an action roll tied to that sphere, spend a Favor to call on their aid, rolling your Patron Die -- a d6, improving to a d8 at level 5 -- and adding the result.' FROM hero_class WHERE name = 'Warlock';
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Favor', 'Start with 3 Favor. Once per rest, pay tribute to your patron to gain Favor equal to your Spellcast trait; you can also choose to gain a Favor instead of a Hope whenever you succeed on an action roll with Hope.' FROM hero_class WHERE name = 'Warlock';

-- Witch
INSERT OR IGNORE INTO hero_class (name, primary_domain_id, secondary_domain_id, starting_evasion, starting_hp, class_items, hope_feature, game_set_id)
VALUES ('Witch', (SELECT id FROM domain WHERE name = 'Sage'), (SELECT id FROM domain WHERE name = 'Dread'), 10, 6, 'A small harmless pet, or a scrying stone', 'Witch''s Charm: When you or an ally within Far range fails an action roll, spend 3 Hope to turn it into a success with Fear instead.', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE hero_class SET primary_domain_id = (SELECT id FROM domain WHERE name = 'Sage'), secondary_domain_id = (SELECT id FROM domain WHERE name = 'Dread'), starting_evasion = 10, starting_hp = 6, class_items = 'A small harmless pet, or a scrying stone', hope_feature = 'Witch''s Charm: When you or an ally within Far range fails an action roll, spend 3 Hope to turn it into a success with Fear instead.' WHERE name = 'Witch';

DELETE FROM hero_class_feature WHERE hero_class_id = (SELECT id FROM hero_class WHERE name = 'Witch');
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Hex', 'Mark a Stress to temporarily Hex a target within Far range, giving them a penalty to damage rolls and Difficulty equal to your tier. You can have a number of creatures Hexed at once equal to your Spellcast trait.' FROM hero_class WHERE name = 'Witch';
INSERT INTO hero_class_feature (hero_class_id, name, description)
SELECT id, 'Commune', 'Once per long rest during a moment of calm, ask an ancestor, deity, spirit, or otherworldly being a question, then roll a number of d6s equal to your Spellcast trait and pick one result: lower rolls return a vague sensation, mid rolls a sound or vision, and the highest roll lets you psychically experience the answer as a full scene.' FROM hero_class WHERE name = 'Witch';

-- === Hope & Fear Subclasses (8 total, 2 per new Class) ===
-- Assassin: Executioners Guild
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Executioners Guild', 'For assassins who strike down their targets with lethal precision.', (SELECT id FROM hero_class WHERE name = 'Assassin'), 'AGILITY', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For assassins who strike down their targets with lethal precision.', spellcast_trait = 'AGILITY' WHERE name = 'Executioners Guild';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Executioners Guild');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Executioners Guild');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Executioners Guild');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'First Strike', 'The first successful attack you land in a scene deals double damage.' FROM subclass WHERE name = 'Executioners Guild';
INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Ambush', 'Your Marked for Death feature uses d6s instead of d4s.' FROM subclass WHERE name = 'Executioners Guild';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Death Strike', 'When you deal Severe damage to a creature, mark a Stress to force them to mark an additional Hit Point.' FROM subclass WHERE name = 'Executioners Guild';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Scorpion''s Poise', 'Gain a +2 bonus to Evasion against attacks from a creature you''ve Marked for Death.' FROM subclass WHERE name = 'Executioners Guild';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'True Strike', 'Once per long rest, spend a Hope to turn a failed attack into a success instead.' FROM subclass WHERE name = 'Executioners Guild';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Backstab', 'Your Marked for Death feature uses d8s instead of d6s.' FROM subclass WHERE name = 'Executioners Guild';

-- Assassin: Poisoners Guild
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Poisoners Guild', 'For assassins who debilitate their targets with punishing afflictions.', (SELECT id FROM hero_class WHERE name = 'Assassin'), 'KNOWLEDGE', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For assassins who debilitate their targets with punishing afflictions.', spellcast_trait = 'KNOWLEDGE' WHERE name = 'Poisoners Guild';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Poisoners Guild');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Poisoners Guild');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Poisoners Guild');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Toxic Concoctions', 'Mark a Stress to place 1d4+1 tokens on this card; spend a token on a successful weapon attack to afflict the target with a poison you know: Ghost Petal makes them temporarily Vulnerable, Grave Spore forces an extra Stress, and Leech Weed adds 1d6 damage to the attack. Unspent tokens clear on a long rest.' FROM subclass WHERE name = 'Poisoners Guild';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Poison Compendium', 'You also know Midnight Vine, which gives the target disadvantage on attack rolls until they clear it by marking a Stress, and Gorgon Root, which makes them temporarily Restrained.' FROM subclass WHERE name = 'Poisoners Guild';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Twin Fang', 'When you afflict a target you''ve Marked for Death with a poison, spend an additional token to inflict a second known poison at the same time.' FROM subclass WHERE name = 'Poisoners Guild';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Venomancer', 'You also know Blight Seed, which gives the target a -3 penalty to their damage thresholds for the rest of the scene and doesn''t stack, Fear Leaf, which adds damage equal to your rolled Fear Die, and Corpse Thorn, which gives the target disadvantage on reaction rolls for the rest of the scene.' FROM subclass WHERE name = 'Poisoners Guild';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Adder''s Blessing', 'You''re immune to poisons and other toxins.' FROM subclass WHERE name = 'Poisoners Guild';

-- Brawler: Juggernaut
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Juggernaut', 'For brawlers who pulverize their opponents with crushing blows.', (SELECT id FROM hero_class WHERE name = 'Brawler'), 'NONE', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For brawlers who pulverize their opponents with crushing blows.', spellcast_trait = 'NONE' WHERE name = 'Juggernaut';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Juggernaut');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Juggernaut');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Juggernaut');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Rugged', 'Gain a permanent +3 bonus to your Severe damage threshold.' FROM subclass WHERE name = 'Juggernaut';
INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Overwhelm', 'On a successful attack, spend a Hope to either throw the target within Close range or force them to mark a Stress.' FROM subclass WHERE name = 'Juggernaut';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Surrounded', 'When attacking with a Melee weapon, spend any number of Hope to also target that many additional creatures within Melee range.' FROM subclass WHERE name = 'Juggernaut';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Eye for an Eye', 'Once per rest, when an adversary within Melee range makes you mark Hit Points, mark a Stress to force them to mark that same number back.' FROM subclass WHERE name = 'Juggernaut';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Pummeljoy', 'On a critical success with a Melee weapon, gain an extra Hope, clear an extra Stress, and add +1 to your Proficiency for that attack.' FROM subclass WHERE name = 'Juggernaut';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Not Done Yet', 'When you take Severe damage, gain a Hope or clear a Stress.' FROM subclass WHERE name = 'Juggernaut';

-- Brawler: Martial Artist
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Martial Artist', 'For brawlers who draw on many fighting styles to take down their foes.', (SELECT id FROM hero_class WHERE name = 'Brawler'), 'NONE', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For brawlers who draw on many fighting styles to take down their foes.', spellcast_trait = 'NONE' WHERE name = 'Martial Artist';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Martial Artist');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Martial Artist');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Martial Artist');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Stance Fighter', 'Channel your inner resolve into martial stances that grant special combat benefits. Take the Martial Stances reference sheet and choose two Tier 1 stances to start; unlock an additional stance from your tier or below each time you level up.' FROM subclass WHERE name = 'Martial Artist';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Keen Defenses', 'When targeted by an attack, spend a Focus to add a bonus equal to your tier to your Evasion against it.' FROM subclass WHERE name = 'Martial Artist';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Focus Cannon', 'Spend a Focus to make an Instinct Roll against a target within Far range; on a success, deal d20+3 magic damage using your Proficiency.' FROM subclass WHERE name = 'Martial Artist';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Limit Breaker', 'Once per rest, pull off an incredible feat of athleticism without needing to roll for it, then gain a Hope and clear a Stress.' FROM subclass WHERE name = 'Martial Artist';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Flow State', 'Mark a Stress instead of spending a Focus to shift stances, or spend a Focus instead of marking a Stress to start a Combo Strike.' FROM subclass WHERE name = 'Martial Artist';

-- Warlock: Pact of the Endless
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Pact of the Endless', 'For warlocks who stand firm against their enemies and refuse to die.', (SELECT id FROM hero_class WHERE name = 'Warlock'), 'PRESENCE', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For warlocks who stand firm against their enemies and refuse to die.', spellcast_trait = 'PRESENCE' WHERE name = 'Pact of the Endless';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Pact of the Endless');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Pact of the Endless');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Pact of the Endless');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Patron''s Mantle', 'Spend a Favor to take on a terrifying aspect of your patron until you take Severe damage or the scene ends; while active, gain a bonus to your damage thresholds equal to your tier and advantage on rolls to intimidate.' FROM subclass WHERE name = 'Pact of the Endless';
INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Deathless Embrace', 'Once per rest, spend any number of Favor to roll that many Patron Dice, clearing a Hit Point for each result of 4 or higher.' FROM subclass WHERE name = 'Pact of the Endless';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Harrowing Invocation', 'When an adversary attacks you or a nearby ally, spend a Favor to give them disadvantage on the roll; if they still fail, they also mark a Stress.' FROM subclass WHERE name = 'Pact of the Endless';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Damage Sink', 'Once per rest, spend a Favor to halve incoming damage.' FROM subclass WHERE name = 'Pact of the Endless';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Dark Aegis', 'Once per long rest, spend a Favor instead of marking Hit Points when you''d take damage.' FROM subclass WHERE name = 'Pact of the Endless';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Draining Bane', 'When an adversary attacks you or a nearby ally, spend a Favor to Drain them -- they mark a Stress and you clear one, and while Drained they roll attacks with a d12 instead of a d20, including for advantage or disadvantage, until they fail a roll.' FROM subclass WHERE name = 'Pact of the Endless';

-- Warlock: Pact of the Wrathful
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Pact of the Wrathful', 'For warlocks who destroy anyone who moves against them.', (SELECT id FROM hero_class WHERE name = 'Warlock'), 'PRESENCE', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For warlocks who destroy anyone who moves against them.', spellcast_trait = 'PRESENCE' WHERE name = 'Pact of the Wrathful';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Pact of the Wrathful');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Pact of the Wrathful');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Pact of the Wrathful');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Patron''s Fury', 'Spend a Favor to imbue your attacks with your patron''s power until you deal Severe damage or the scene ends; while active, add a number of Patron Dice equal to your tier to your damage rolls.' FROM subclass WHERE name = 'Pact of the Wrathful';
INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Deadly Vengeance', 'When you mark Hit Points from an attack, spend a Favor to roll that many Patron Dice; the attacker marks a Hit Point for each result of 4 or higher.' FROM subclass WHERE name = 'Pact of the Wrathful';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Menacing Reach', 'Spend a Favor to extend your primary weapon''s range by one step, up to Very Far, until you land a successful attack with it.' FROM subclass WHERE name = 'Pact of the Wrathful';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Diminish My Foes', 'When you succeed with Hope on an action roll against a target, spend any number of Favor to force them to mark that many Stress.' FROM subclass WHERE name = 'Pact of the Wrathful';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Fearsome Attack', 'Spend Favor to reroll any number of dice on a damage roll, and keep spending Favor to keep rerolling the same roll.' FROM subclass WHERE name = 'Pact of the Wrathful';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Otherworldly Ire', 'Once per rest, when you take damage, spend any number of Favor to roll that many Patron Dice; a number of creatures within Close range equal to the highest result must each mark a Hit Point.' FROM subclass WHERE name = 'Pact of the Wrathful';

-- Witch: Hedge
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Hedge', 'For witches who use their craft to empower themselves and their allies.', (SELECT id FROM hero_class WHERE name = 'Witch'), 'KNOWLEDGE', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For witches who use their craft to empower themselves and their allies.', spellcast_trait = 'KNOWLEDGE' WHERE name = 'Hedge';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Hedge');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Hedge');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Hedge');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Herbal Remedies', 'Whenever you or an ally clears Hit Points or Stress from a consumable, increase the amount cleared by 1.' FROM subclass WHERE name = 'Hedge';
INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Enchanted Talisman', 'Once per rest, imbue a small item with protection: spend any number of Hope to place that many tokens on it. Whoever holds it can spend a token when they take damage to reduce the Hit Points they mark by one; unused tokens clear on a rest.' FROM subclass WHERE name = 'Hedge';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Walk Between Worlds', 'During a moment of calm, make a Spellcast Roll (13); on a success once per rest, mark a Stress to step past the veil and speak with nearby spirits, placing tokens equal to your Spellcast trait and removing one per question answered until you return.' FROM subclass WHERE name = 'Hedge';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Vexing Malison', 'Gain advantage on attacks against Hexed creatures.' FROM subclass WHERE name = 'Hedge';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Circle of Power', 'Once per rest, mark out a Very Close circle around yourself and place tokens equal to your Spellcast trait on this card; you and allies inside gain +2 to damage thresholds, attack rolls, and Evasion, removing a token each time someone inside acts or evades, until the tokens run out or you leave the circle.' FROM subclass WHERE name = 'Hedge';

-- Witch: Moon
INSERT OR IGNORE INTO subclass (name, oneliner, parent_class_id, spellcast_trait, game_set_id)
VALUES ('Moon', 'For witches who embody celestial power to amplify their magic.', (SELECT id FROM hero_class WHERE name = 'Witch'), 'INSTINCT', (SELECT id FROM game_set WHERE name = 'Hope and Fear'));

UPDATE subclass SET oneliner = 'For witches who embody celestial power to amplify their magic.', spellcast_trait = 'INSTINCT' WHERE name = 'Moon';

DELETE FROM subclass_foundation_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Moon');
DELETE FROM subclass_specialization_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Moon');
DELETE FROM subclass_mastery_feature WHERE subclass_id = (SELECT id FROM subclass WHERE name = 'Moon');

INSERT INTO subclass_foundation_feature (subclass_id, name, description)
SELECT id, 'Night''s Glamour', 'Make a Spellcast Roll (13) to wrap yourself in a bewitching illusion; while Glamoured, gain advantage on rolls that rely on your illusory appearance, and adversaries within Close range must mark a Stress to attack you. The Glamour drops if you mark a Hit Point or deal damage, unless you mark a Stress to hold onto it.' FROM subclass WHERE name = 'Moon';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Moonbeam', 'Once per session, conjure a column of moonlight over a Close-range area for the rest of the scene; you and allies within it gain +1 to Spellcast Rolls and can see through illusions.' FROM subclass WHERE name = 'Moon';
INSERT INTO subclass_specialization_feature (subclass_id, name, description)
SELECT id, 'Ire of Pale Light', 'When a Hexed creature within Very Far range fails an attack, they mark a Stress.' FROM subclass WHERE name = 'Moon';
INSERT INTO subclass_mastery_feature (subclass_id, name, description)
SELECT id, 'Lunar Phases', 'At the start of each session, roll a d6 and apply the matching effect for the rest of the session: a 1 lets you spend a Hope to negate Minor damage, 2-3 grants +2 to damage rolls, a 4 grants +3 to damage thresholds, and 5-6 grants +1 to Evasion. Once per rest, spend a Hope to bump the die up a step, wrapping a 6 back around to 1.' FROM subclass WHERE name = 'Moon';

