# Creates the nine core Daggerheart Classes through the running API.
# Requires the nine Domains to already exist (run create-domains.ps1 first) -
# this script assumes Arcana=1, Blade=2, Bone=3, Codex=4, Grace=5,
# Midnight=6, Sage=7, Splendor=8, Valor=9. If your ids differ, adjust the
# primaryDomainId / secondaryDomainId values below before running.
#
# All description/feature text below is an original paraphrase, not a
# transcription of the rulebook - mechanics (numbers, ranges, costs) are
# kept exact; wording is rewritten.
#
# Safe to run more than once - the API itself is idempotent by name now,
# so a repeat run just confirms each class already exists rather than
# creating a duplicate.

$baseUrl = "http://localhost:8787/api"

$classes = @(
    @{
        name = "Bard"
        description = "Charismatic performers who captivate a room through song, story, or wit - as skilled at rallying allies as they are at pulling a party apart when their pride is wounded."
        primaryDomainId = 5; secondaryDomainId = 4
        startingEvasion = 10; startingHp = 5
        classItems = "A cherished romance novel, or an unopened letter"
        hopeFeature = "Make a Scene: Spend 3 Hope to briefly Distract a target within Close range, giving them a -2 penalty to their Difficulty."
        classFeatures = @(
            @{ name = "Rally"; description = "Once per session, hand yourself and each ally a Rally Die (a d6 at level 1, upgrading to a d8 at level 5). Anyone holding one can spend it, rolling and adding the result to an action, reaction, or damage roll, or using it to clear that many Stress. Any unspent dice are lost at the end of the session." }
        )
        gameSetId = 1
    },
    @{
        name = "Druid"
        description = "Guardians of the wild who draw on nature's raw power, capable of shifting into beastform and channeling the elements themselves."
        primaryDomainId = 7; secondaryDomainId = 1
        startingEvasion = 10; startingHp = 6
        classItems = "A pouch of stones and small bones, or an odd pendant found buried in the dirt"
        hopeFeature = "Evolution: Spend 3 Hope to shift into a Beastform without the usual Stress cost, and raise one trait by +1 for as long as you remain in that form."
        classFeatures = @(
            @{ name = "Beastform"; description = "Mark a Stress to shift into a creature of your tier or lower drawn from the Beastform list, and drop out of that form whenever you choose. While transformed you lose access to weapons and domain spells, though any other features remain available, and spells already active continue as normal; you can still speak and act like yourself. You take on the creature's features and add its Evasion bonus to your own, using the trait it specifies for attacks. Your armor becomes part of the transformed body, and Armor Slots are marked as usual, staying marked after you revert. If you mark your last Hit Point, you drop out of the form automatically." }
            @{ name = "Wildtouch"; description = "At will, produce small, harmless effects tied to nature - coaxing a flower into sudden bloom, stirring up a light breeze, or lighting a campfire." }
        )
        gameSetId = 1
    },
    @{
        name = "Guardian"
        description = "Unshakeable protectors defined less by how they fight than by who they refuse to abandon, standing firm against overwhelming odds."
        primaryDomainId = 9; secondaryDomainId = 2
        startingEvasion = 9; startingHp = 7
        classItems = "A totem passed down from a mentor, or a mysterious key"
        hopeFeature = "Frontline Tank: Spend 3 Hope to immediately clear two Armor Slots."
        classFeatures = @(
            @{ name = "Unstoppable"; description = "Once per long rest, enter an Unstoppable state, gaining an Unstoppable Die that starts at its lowest face (a d4 at level 1, later a d6 at level 5). Each time a damage roll of yours lands one or more Hit Points, the die's value ticks up by one; once it would climb past its highest face, or the scene ends, the die is removed and the state ends. While Unstoppable, physical damage against you is reduced by one severity step, you add the die's current value to your damage rolls, and you can't be Restrained or made Vulnerable." }
        )
        gameSetId = 1
    },
    @{
        name = "Ranger"
        description = "Patient hunters who pair martial skill with deep wilderness knowledge, often fighting alongside a bonded animal companion."
        primaryDomainId = 3; secondaryDomainId = 7
        startingEvasion = 12; startingHp = 6
        classItems = "A trophy from a first kill, or a compass that seems to be broken"
        hopeFeature = "Hold Them Off: When a weapon attack succeeds, spend 3 Hope to apply that same roll against two more adversaries within range."
        classFeatures = @(
            @{ name = "Ranger's Focus"; description = "Spend a Hope to attack a target; on a success, deal normal damage and mark them as your Focus. While a creature is your Focus, you always know their direction, any damage you deal to them forces a Stress, and if an attack against them fails you can drop the Focus to reroll your Duality Dice." }
        )
        gameSetId = 1
    },
    @{
        name = "Rogue"
        description = "Scoundrels who move unseen through shadow and social maneuvering alike, as comfortable picking a lock as talking their way past a guard."
        primaryDomainId = 6; secondaryDomainId = 5
        startingEvasion = 12; startingHp = 6
        classItems = "A set of lock-forging tools, or a grappling hook"
        hopeFeature = "Rogue's Dodge: Spend 3 Hope for a +2 bonus to Evasion, lasting until an attack next succeeds against you or, failing that, until your next rest."
        classFeatures = @(
            @{ name = "Cloaked"; description = "Whenever you'd normally become Hidden, you become Cloaked instead. On top of the usual benefits of being Hidden, staying still lets you remain unseen even if an adversary moves somewhere they'd otherwise spot you. Attacking, or ending a move in an adversary's line of sight, breaks the Cloaked state." }
            @{ name = "Sneak Attack"; description = "When an attack succeeds while you're Cloaked, or while an ally is within Melee range of the target, add a number of d6s equal to your tier to the damage roll (Tier 1 at level 1, Tier 2 at levels 2-4, Tier 3 at levels 5-7, Tier 4 at levels 8-10)." }
        )
        gameSetId = 1
    },
    @{
        name = "Seraph"
        description = "Divine fighters and healers acting on behalf of a god, their purpose ranging from protection to vengeance depending on who they serve."
        primaryDomainId = 8; secondaryDomainId = 9
        startingEvasion = 9; startingHp = 7
        classItems = "A bundle of offerings, or a sigil bearing your god's mark"
        hopeFeature = "Life Support: Spend 3 Hope to clear a Hit Point from an ally within Close range."
        classFeatures = @(
            @{ name = "Prayer Dice"; description = "At the start of each session, roll a number of d4s equal to your Spellcast trait to form a pool of Prayer Dice. Spend any of them, on yourself or an ally within Far range, to soften incoming damage, boost a roll after it's already been made, or convert the die's result directly into Hope. Whatever's left unspent clears at session's end." }
        )
        gameSetId = 1
    },
    @{
        name = "Sorcerer"
        description = "Wielders of innate, often inherited magic, learning not to acquire power but to master the power they were born with."
        primaryDomainId = 1; secondaryDomainId = 6
        startingEvasion = 10; startingHp = 6
        classItems = "A whispering orb, or a treasured family heirloom"
        hopeFeature = "Volatile Magic: Spend 3 Hope to reroll any number of damage dice on a magic-damage attack."
        classFeatures = @(
            @{ name = "Arcane Sense"; description = "Detect magical creatures and objects anywhere within Close range." }
            @{ name = "Minor Illusion"; description = "Make a Spellcast Roll against a difficulty of 10 to conjure a small visual illusion, no bigger than yourself, somewhere within Close range - convincing to anyone viewing it from Close range or beyond." }
            @{ name = "Channel Raw Power"; description = "Once per long rest, move a domain card from your loadout into your vault, then either gain Hope equal to that card's level, or boost a damage-dealing spell by twice the card's level." }
        )
        gameSetId = 1
    },
    @{
        name = "Warrior"
        description = "Lifelong students of weapons and combat, valued as much for agility and discipline as for raw strength."
        primaryDomainId = 2; secondaryDomainId = 3
        startingEvasion = 11; startingHp = 6
        classItems = "A sketch of a lover, or a sharpening stone"
        hopeFeature = "No Mercy: Spend 3 Hope for a +1 bonus to attack rolls until your next rest."
        classFeatures = @(
            @{ name = "Attack of Opportunity"; description = "When an adversary in Melee range tries to disengage, make a reaction roll with a trait of your choice against their Difficulty. On a success, pick one of the following (two if you critically succeed): they're rooted in place, you deal your primary weapon's damage to them, or you move along with them." }
            @{ name = "Combat Training"; description = "Equip weapons without regard for their burden, and add your level as a bonus whenever you deal physical damage." }
        )
        gameSetId = 1
    },
    @{
        name = "Wizard"
        description = "Scholars of magic who draw power from study rather than instinct, often becoming trusted advisors, healers, or war-council strategists."
        primaryDomainId = 4; secondaryDomainId = 8
        startingEvasion = 11; startingHp = 5
        classItems = "A book you're slowly translating, or a tiny, harmless elemental companion"
        hopeFeature = "Not This Time: Spend 3 Hope to force an adversary within Far range to reroll an attack or damage roll."
        classFeatures = @(
            @{ name = "Prestidigitation"; description = "At will, produce small, harmless magical effects - shifting an object's color, conjuring a scent, lighting a candle, levitating something tiny, lighting up a room, or mending a minor item." }
            @{ name = "Strange Patterns"; description = "Pick a number from 1 to 12. Whenever a Duality Die shows that number, gain a Hope or clear a Stress. You may choose a new number during a long rest." }
        )
        gameSetId = 1
    }
)

foreach ($c in $classes) {
    $body = $c | ConvertTo-Json -Depth 5
    $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/hero-classes" -ContentType "application/json" -Body $body
    Write-Host "Created $($response.name) (id $($response.id))"
}