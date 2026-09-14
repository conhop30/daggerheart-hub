# Creates the nine core Daggerheart Domains through the running API.
# Safe to run more than once - the API itself is idempotent by name now,
# so a repeat run just confirms each domain already exists rather than
# creating a duplicate.
# Run with the backend already up (mvn spring-boot:run in /server).

$baseUrl = "http://localhost:8787/api"

$domains = @(
    @{ name = "Arcana";   description = "Raw, instinctual magic drawn from within. Volatile in untrained hands, but capable of commanding energy and the elements when properly channeled."; colorHex = "#7C5FC4"; gameSetId = 1 },
    @{ name = "Blade";    description = "Mastery of weapons in all their forms, from steel to bow to the improvised. Its adherents pursue lethal precision and dominion over death itself."; colorHex = "#B23A3A"; gameSetId = 1 },
    @{ name = "Bone";     description = "Command over one's own body and a sharp read on the battlefield. Practitioners combine physical discipline with tactical instinct."; colorHex = "#C9B896"; gameSetId = 1 },
    @{ name = "Codex";    description = "Magic built on study rather than instinct - equations, texts, and recorded lore. Offers broad, versatile command of magical knowledge."; colorHex = "#3A5A8C"; gameSetId = 1 },
    @{ name = "Grace";    description = "Charisma as a form of power. Through performance, charm, or deception, its wielders bend how others perceive reality."; colorHex = "#D46A9F"; gameSetId = 1 },
    @{ name = "Midnight"; description = "Shadow, secrecy, and obscurity. Practitioners specialize in stealth, misdirection, and uncovering what's hidden."; colorHex = "#2E2054"; gameSetId = 1 },
    @{ name = "Sage";     description = "Power drawn from the natural world. Grants the vitality of growing things and the ferocity of a predator alike."; colorHex = "#5B8C51"; gameSetId = 1 },
    @{ name = "Splendor"; description = "Command over life itself - the power to heal, sustain, and in rare cases, end it."; colorHex = "#D9A93A"; gameSetId = 1 },
    @{ name = "Valor";    description = "Protection through strength, whether offered by shield or by blade. Its followers exist to guard others in battle."; colorHex = "#5B7A99"; gameSetId = 1 }
)

foreach ($d in $domains) {
    $body = $d | ConvertTo-Json
    $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/domains" -ContentType "application/json" -Body $body
    Write-Host "Created $($response.name) (id $($response.id))"
}