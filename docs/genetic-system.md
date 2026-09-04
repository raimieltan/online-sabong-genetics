# 🐔 CHICKEN BREEDING & GENETICS SYSTEM

## Game Design & Technical Concept

> **Core inspiration:** ARK selective breeding + Dragon City breeding/collection + fantasy chicken mutations.
>
> **Design goal:** Make breeding a long-term progression system where players can discover rare genetics, build bloodlines, create specialized combat chickens, and hunt extremely rare mutations.

---

# 1. SYSTEM OVERVIEW

Breeding is one of the primary progression systems of the game.

Players own:

* Hens
* Roosters
* Eggs
* Chicks
* Adult chickens
* Genetic bloodlines
* Mutation discoveries

Players breed two compatible adult chickens to produce an egg.

The offspring inherits genetic information from both parents.

The offspring may:

1. Inherit normal traits.
2. Inherit superior stats.
3. Carry hidden recessive genes.
4. Express inherited visual traits.
5. Develop a spontaneous mutation.
6. Express a previously hidden mutation.
7. Become a valuable breeding parent for future generations.

The goal is **not simply to breed the strongest chicken**.

Players should have several reasons to breed:

```text
POWER
COLLECTION
RARITY
COSMETICS
MUTATIONS
GENETIC EXPERIMENTATION
SPECIALIZED BLOODLINES
TRADING
DISCOVERY
```

---

# 2. CORE BREEDING LOOP

The basic gameplay loop:

```text
OBTAIN CHICKENS
      ↓
ANALYZE GENETICS
      ↓
SELECT ROOSTER + HEN
      ↓
BREED
      ↓
EGG PRODUCED
      ↓
INCUBATE
      ↓
HATCH
      ↓
CHICK GENETICS GENERATED
      ↓
GROW TO ADULT
      ↓
ANALYZE / TEST
      ↓
KEEP / SELL / BATTLE / BREED
      ↓
REPEAT
```

The player should constantly be thinking:

> "What happens if I breed these two?"

---

# 3. CHICKEN GENOME

Every chicken has an internal genome.

The genome should contain several categories.

```text
Chicken Genome
│
├── Combat Genes
│   ├── Health
│   ├── Strength
│   ├── Defense
│   ├── Speed
│   ├── Stamina
│   ├── Accuracy
│   └── Awareness
│
├── Physical Genes
│   ├── Body Size
│   ├── Leg Length
│   ├── Wing Size
│   ├── Beak Type
│   └── Comb Type
│
├── Color Genes
│   ├── Primary Feather Color
│   ├── Secondary Color
│   ├── Pattern
│   └── Eye Color
│
├── Special Genes
│   ├── Albino
│   ├── Luminescent
│   ├── Extra-Toed
│   └── Other Mutations
│
└── Hidden Genes
    ├── Recessive Genes
    ├── Mutation Carriers
    └── Dormant Traits
```

Not every gene needs to be visible to the player immediately.

---

# 4. GENETIC ALLELES

For important traits, each chicken should have two alleles:

```text
Mother allele
+
Father allele
=
Offspring genetic pair
```

Example:

```text
Strength

Allele A = 80
Allele B = 65
```

The chicken's effective strength might be calculated from both.

For example:

```text
Base Strength = average(80, 65)
             = 72.5
```

However, the game does not need to expose raw genetic values to the player.

Instead, players can see:

```text
Strength: 73
```

while advanced players may unlock:

```text
Genetic Analysis
Strength Gene:
Allele 1: 80
Allele 2: 65
```

This creates a progression system around genetic knowledge.

---

# 5. DOMINANT VS RECESSIVE GENES

Genes can be:

```text
DOMINANT
RECESSIVE
CODOMINANT
MUTATION
```

## Dominant

A dominant gene can express when only one parent contributes it.

Example:

```text
D = Dominant red feathers
d = Normal
```

Possible offspring:

```text
DD → Red
Dd → Red
dd → Normal
```

---

# 6. RECESSIVE GENES

Recessive genes are where the breeding system becomes interesting.

A recessive mutation can remain hidden.

Example:

```text
Albino Gene

Parent A:
Normal appearance
Carrier: Albino

Parent B:
Normal appearance
Carrier: Albino
```

Breed them.

Possible offspring:

```text
25% Albino
50% Carrier
25% Normal
```

The player may suddenly hatch:

> 🥚 **RARE MUTATION DISCOVERED**
>
> ALBINO CHICKEN

This creates the "what is hiding in this bloodline?" feeling.

---

# 7. CARRIER SYSTEM

A chicken can carry a gene without expressing it.

Example:

```text
🐔 Chicken #1042

Appearance:
Normal

Genetic Analysis:
Albino: CARRIER
Two-Headed: NOT DETECTED
Luminescent: CARRIER
```

This chicken may become extremely valuable despite looking ordinary.

Players may therefore trade chickens based on genetics rather than appearance.

---

# 8. MUTATION SYSTEM

Mutations are extremely rare genetic events.

A mutation can occur when breeding.

Mutation categories:

### Physical Mutations

* Two-Headed
* Four-Winged
* Extra-Toed
* Giant
* Dwarf
* Long-Legged
* Wingless
* Extra-Eyed

### Color Mutations

* Albino
* Melanistic
* Iridescent
* Metallic
* Ghost White
* Blood Red

### Fantasy Mutations

* Luminescent Feathers
* Flame Feathers
* Electric Feathers
* Shadow Feathers
* Crystal Feathers

### Extreme Mutations

Extremely rare:

* Two-Headed
* Three-Headed
* Six-Winged
* Multiple Eyes
* Giant Mutation
* Ancient Mutation

---

# 9. MUTATION RARITY

Mutations should have rarity tiers.

```text
COMMON
UNCOMMON
RARE
EPIC
LEGENDARY
MYTHIC
ANOMALOUS
```

Example:

```text
Extra-Toed
1 / 250

Albino
1 / 1,000

Luminescent
1 / 10,000

Four-Winged
1 / 50,000

Two-Headed
1 / 1,000,000
```

These numbers are examples only and should be configurable.

---

# 10. MUTATIONS SHOULD NOT ALWAYS BE STRONGER

This is extremely important.

A mutation should NOT automatically mean:

```text
Mutation = +100% power
```

Otherwise competitive players will only care about mutation chickens.

Instead, mutations can have:

### Cosmetic mutation

```text
Two-Headed

Combat:
No bonus

Value:
Extremely High

Collection:
Extremely High
```

Or:

### Mixed mutation

```text
Two-Headed

Awareness: +5%
Agility: -10%
```

Or:

### Specialized mutation

```text
Four-Winged

Speed: +8%
Defense: -5%
```

This keeps mutations interesting without destroying game balance.

---

# 11. MUTATION TRAITS

A mutation should be composed of:

```text
Mutation ID
Name
Rarity
Visual Effect
Stat Modifiers
Inheritance Type
Mutation Chance
Can Be Carried
Can Be Recessive
Can Stack
```

Example:

```text
Mutation:
TWO_HEADED

Rarity:
ANOMALOUS

Visual:
Two heads

Stats:
Awareness +5%
Agility -10%

Inheritance:
Recessive

Mutation Discovery:
Extremely Rare

Can Carry:
Yes

Can Breed:
Yes
```

---

# 12. SPONTANEOUS VS INHERITED MUTATIONS

There should be two ways a mutation can appear.

## A. Spontaneous Mutation

The mutation randomly occurs during breeding.

```text
Normal + Normal
       ↓
Mutation Roll
       ↓
Two-Headed Mutation
```

This is extremely rare.

---

## B. Inherited Mutation

A parent already possesses the gene.

```text
Two-Headed Parent
       +
Normal Carrier
       ↓
Offspring
       ↓
Mutation inherited
```

The inheritance probability depends on the gene.

---

# 13. MUTATION BLOODLINES

Once players discover a mutation, they can attempt to establish a bloodline.

Example:

```text
GENERATION 1

Two-Headed Rooster
        +
Normal Hen
        ↓
Generation 2
```

Then:

```text
Generation 2
Two-Headed Carrier
        +
Strong Hen
        ↓
Generation 3
```

Over time the player creates:

> **THE TWO-HEAD BLOODLINE**

This creates long-term progression.

---

# 14. GENERATIONAL BREEDING

Chickens should have a lineage.

Example:

```text
Generation 0
Wild Chicken

Generation 1
Player-bred chicken

Generation 2
Child

Generation 3
Grandchild

Generation 4
Great-grandchild
```

Every chicken stores:

```text
mother_id
father_id
generation
bloodline_id
```

This allows the game to display ancestry.

---

# 15. PEDIGREE SYSTEM

Every chicken should have a pedigree screen.

Example:

```text
                 ROOSTER #001
                      │
              ┌───────┴───────┐
              │               │
          HEN #044         ROOSTER #052
              │               │
              └───────┬───────┘
                      │
                 CHICKEN #221
```

Players can inspect:

```text
Mother
Father
Grandparents
Great-grandparents
Bloodline
Generations
Mutations
Inherited traits
```

This becomes especially important for high-value chickens.

---

# 16. INBREEDING SYSTEM

The game can allow related chickens to breed.

However, close breeding should introduce **inbreeding effects**.

Example:

```text
Unrelated
→ Normal

Distant Relative
→ Small risk

Sibling
→ Increased genetic instability

Parent/Child
→ High genetic instability
```

Potential effects:

```text
Lower fertility
Reduced hatch rate
Negative stat mutations
Genetic defects
Positive mutation chance
Negative mutation chance
```

The system should NOT simply make incest impossible.

Instead, make it a risky genetic strategy.

---

# 17. GENETIC INSTABILITY

Every bloodline can have an internal genetic stability value.

Example:

```text
Genetic Stability: 82%
```

Repeated close breeding can reduce stability.

```text
100%
 ↓
95%
 ↓
88%
 ↓
73%
 ↓
51%
```

Low stability increases the probability of genetic anomalies.

This creates an interesting risk/reward system:

```text
Stable bloodline
→ predictable offspring

Unstable bloodline
→ unpredictable offspring
```

---

# 18. POSITIVE AND NEGATIVE MUTATIONS

Not all mutations should be desirable.

Possible negative mutations:

```text
Weak Legs
Poor Vision
Fragile Bones
Slow Growth
Low Fertility
Poor Stamina
Malformed Wing
Low Hatch Rate
```

Rare positive mutations:

```text
Enhanced Muscles
Exceptional Vision
Rapid Growth
High Fertility
Superior Stamina
```

Extremely rare anomalies:

```text
Two-Headed
Four-Winged
Luminescent
Ancient
```

This makes mutation discovery unpredictable.

---

# 19. GENETIC TRAITS VS ACTUAL STATS

Separate:

```text
GENETICS
```

from:

```text
FINAL STATS
```

For example:

```text
Genetics:
Strength = 82
Speed = 61

Age:
Adult

Training:
+10 Strength

Equipment:
+5 Strength

Final:
Strength = 97
```

This prevents breeding from becoming the only progression system.

---

# 20. CHICKEN GROWTH

Egg:

```text
EGG
```

↓

```text
CHICK
```

↓

```text
JUVENILE
```

↓

```text
ADULT
```

Optional:

```text
ELDER
```

Growth should affect when chickens can breed.

Example:

```text
Egg
Cannot breed

Chick
Cannot breed

Juvenile
Cannot breed

Adult
Can breed
```

---

# 21. BREEDING COOLDOWN

Adult chickens should have breeding cooldowns.

Example:

```text
Rooster:
Can breed every X hours

Hen:
Can breed every X hours
```

This prevents unlimited breeding spam.

However, cooldowns should be configurable and potentially modified by:

```text
Food
Traits
Facilities
Items
Genetics
Events
```

---

# 22. EGG SYSTEM

Breeding produces an egg.

The egg should contain the offspring genome before hatching.

Example:

```text
EGG #8821

Parents:
Rooster #100
Hen #220

Genetic Quality:
87%

Mutation Probability:
0.002%

Potential Traits:
Unknown
```

Players should NOT necessarily know everything before hatching.

This creates anticipation.

---

# 23. INCUBATION

Eggs require incubation.

Possible incubation mechanics:

```text
Egg
 ↓
Incubator
 ↓
Timer
 ↓
Hatch
```

Incubation time can vary by rarity.

Example:

```text
Common:
5 minutes

Rare:
30 minutes

Epic:
2 hours

Legendary:
8 hours
```

These values should be configurable.

---

# 24. HATCHING EVENT

When an egg hatches:

```text
🥚 EGG HATCHING...

GENETIC ANALYSIS...

...

MUTATION DETECTED

🧬 TWO-HEADED CHICKEN
```

This should be one of the most exciting moments in the game.

Rare discoveries should have special presentation.

---

# 25. MUTATION ENCYCLOPEDIA

Players have a collection book.

```text
MUTATION ENCYCLOPEDIA

01. Albino
✓ Discovered

02. Extra-Toed
✓ Discovered

03. Four-Winged
?
Undiscovered

04. Luminescent
✓ Discovered

05. Two-Headed
?
Undiscovered
```

The encyclopedia should track:

```text
Mutation name
Rarity
First discovery
Discovery date
Player who discovered it
Known inheritance behavior
```

---

# 26. FIRST DISCOVERY SYSTEM

The first player to discover a mutation can receive recognition.

Example:

```text
🏆 FIRST DISCOVERY

Two-Headed Chicken

First discovered by:
PLAYER_NAME

Date:
September 4, 2026
```

Possible rewards:

```text
Title
Badge
Currency
Cosmetic
Breeding item
Leaderboard position
```

This creates a race to discover rare genetics.

---

# 27. GENETIC RESEARCH

Players should not initially understand every gene.

Unlock systems progressively.

### Beginner

Player sees:

```text
Strength: 72
Speed: 65
```

### Intermediate

Player unlocks:

```text
Genetic Traits
```

### Advanced

Player unlocks:

```text
Carrier Detection
```

### Endgame

Player unlocks:

```text
Full Genetic Analysis
```

This creates progression around understanding the breeding system.

---

# 28. GENETIC ANALYZER

A facility can analyze chickens.

Example:

```text
GENETIC ANALYZER

Chicken #442

Strength:
78

Speed:
63

Albino:
Carrier

Two-Headed:
Unknown

Luminescent:
Carrier

Genetic Stability:
91%

Breeding Potential:
★★★★☆
```

Better analyzer levels reveal more information.

---

# 29. BREEDING UI

The breeding screen should show:

```text
        BREEDING PEN

      🐓 ROOSTER
          +
        🐔 HEN

       [ BREED ]

Potential:

Strength      ███████░░░
Speed         ██████░░░░
Health        ████████░░

Known Traits:
✓ Strong
✓ Fast

Possible Hidden Genes:
?

Mutation Chance:
0.014%
```

Do not reveal exact offspring outcomes.

---

# 30. BREEDING PREDICTION

Advanced players can estimate offspring results.

Example:

```text
PREDICTED OFFSPRING

Strength:
65–82

Speed:
55–74

Health:
70–89

Albino:
18%

Luminescent:
4%

Two-Headed:
0.001%
```

This gives advanced players a reason to understand genetics.

---

# 31. GENETIC QUALITY

Each chicken can have a hidden or visible genetic quality score.

Example:

```text
Genetic Quality:
92/100
```

This represents how desirable its genetics are.

However:

**Genetic Quality should NOT directly equal combat power.**

A chicken can be:

```text
Low Combat
+
Extremely Rare Mutation
=
Extremely Valuable
```

---

# 32. SPECIALIZED BLOODLINES

Players can specialize.

Examples:

### SPEED BLOODLINE

```text
High Speed
High Agility
Low Health
```

### TANK BLOODLINE

```text
High Health
High Defense
Low Speed
```

### CRITICAL BLOODLINE

```text
High Critical Chance
High Damage
Low Defense
```

### MUTATION BLOODLINE

```text
High Genetic Instability
High Mutation Discovery Potential
```

### COLLECTION BLOODLINE

```text
Rare Colors
Rare Visual Traits
Rare Mutations
```

---

# 33. BREEDING SHOULD NOT CREATE INFINITE POWER

Implement stat ceilings.

Example:

```text
Base Genetic Range:
1–100
```

Training can temporarily push beyond that.

But genetics cannot infinitely increase.

Otherwise players eventually produce chickens with absurd stats.

---

# 34. STAT INHERITANCE MODEL

Simple initial implementation:

```text
Parent A allele
+
Parent B allele
=
Random inherited allele
```

For each stat:

```text
Offspring = random(parentA_genetic_value,
                   parentB_genetic_value)
```

Then apply a small variance:

```text
Offspring genetic value
=
Inherited value
+
Mutation variance
```

Example:

```text
Father Strength = 80
Mother Strength = 65

Offspring:
72
```

Possible offspring:

```text
68
71
72
77
80
```

depending on inheritance.

---

# 35. MUTATION STAT VARIANCE

Rare mutations can alter genetic values.

Example:

```text
Two-Headed

Awareness:
+5%

Agility:
-10%
```

The mutation modifier should be applied after normal genetic inheritance.

```text
Base genetics
      ↓
Inheritance
      ↓
Mutation
      ↓
Training
      ↓
Equipment
      ↓
Final stats
```

---

# 36. GENETIC IDENTITY

Every chicken needs a unique ID.

Example:

```text
CHKN-000001
CHKN-000002
CHKN-000003
```

Every breeding event should also have a unique ID.

```text
BREED-000001
BREED-000002
```

This makes the system traceable.

---

# 37. BREEDING RECORD

Every breeding event should record:

```text
Breeding ID
Father ID
Mother ID
Egg ID
Offspring ID
Timestamp
Mutation roll
Genes inherited
Generation
Bloodline
```

This is important for debugging and future features.

---

# 38. ANTI-EXPLOIT DESIGN

The genetics system must be server-authoritative.

The client should NEVER decide:

```text
Mutation result
Offspring stats
Inherited genes
Egg result
```

The server generates the offspring.

Example:

```text
Client:
"Breed Chicken A + Chicken B"

Server:
Validate ownership
Validate breeding eligibility
Generate RNG
Generate genome
Generate egg
Save result
Return egg
```

Never trust client-generated genetics.

---

# 39. RANDOM NUMBER GENERATION

Mutation RNG should happen server-side.

For valuable mutations, use secure server-side randomness.

Example:

```text
Normal mutation:
1 / 1,000

Rare:
1 / 10,000

Ultra Rare:
1 / 100,000

Anomalous:
1 / 1,000,000
```

All values should be configuration-driven.

---

# 40. RNG PITY SYSTEM

Optional system.

If players breed many times without discovering a mutation, their mutation probability can slowly increase.

Example:

```text
Base:
0.001%

After 500 failed breeds:
0.002%

After 1,000:
0.005%
```

The pity system should be invisible or carefully communicated.

This prevents players from feeling like they can breed forever without progress.

---

# 41. MUTATION STACKING

Mutations may be allowed to stack.

Example:

```text
Chicken:

Albino
+
Extra-Toed
+
Luminescent
```

Extremely rare combinations become collector-tier chickens.

However, stacking probabilities should become extremely low.

---

# 42. MUTATION CONFLICTS

Some mutations can be mutually exclusive.

Example:

```text
Albino
cannot combine with
Melanistic
```

Or:

```text
Four-Winged
+
Wingless
=
Conflict
```

The system should define:

```text
compatible_mutations
incompatible_mutations
```

---

# 43. GENETIC DEFECTS

Negative mutations add risk.

Example:

```text
Genetic Defect:
FRAGILE WING

Effect:
-8% Defense

Inheritance:
Recessive
```

Players may attempt to eliminate defects from a bloodline.

This creates another breeding objective.

---

# 44. BLOODLINE PURIFICATION

Players can selectively breed chickens to remove undesirable genes.

Example:

```text
Generation 1:
Strong but carries Fragile Wing

Generation 2:
Strong + clean carrier

Generation 3:
Strong + no Fragile Wing

Generation 4:
Pure Strong Bloodline
```

This creates long-term breeding projects.

---

# 45. BLOODLINE DOCUMENTATION

Each bloodline can have:

```text
Bloodline Name
Founder
Generation
Dominant Traits
Recessive Traits
Known Mutations
Genetic Stability
Combat Rating
```

Example:

```text
THE RED STORM BLOODLINE

Founder:
CHKN-001

Generation:
17

Traits:
High Strength
High Critical

Mutation:
None

Genetic Stability:
94%

Founder:
PLAYER_NAME
```

---

# 46. PLAYER-NAMED CHICKENS

Players should be able to name chickens.

Example:

> 🐔 **MAYON 12**

Underneath:

```text
CHKN-001291

Generation 12

Bloodline:
Mayon

Mutation:
Two-Headed

Genetic Quality:
96%
```

Rare chickens become personal collectibles rather than disposable units.

---

# 47. CHICKEN VALUE

Chicken value can be determined by multiple factors:

```text
Combat Power
+
Rarity
+
Mutation
+
Genetic Quality
+
Bloodline
+
Generation
+
Pedigree
+
Collection Value
```

Do NOT make value based solely on combat power.

---

# 48. TRADING

If trading exists, genetic chickens become valuable assets.

Example:

Player A:

```text
Strong combat rooster
```

Player B:

```text
Two-Headed carrier
```

Player A may value combat.

Player B may value genetics.

This creates a player-driven economy.

---

# 49. FREE STARTER CHICKENS

New players should receive basic chickens.

Example:

```text
Starter Rooster
+
Starter Hen
```

These chickens should be intentionally ordinary.

Their purpose is to teach:

```text
Breeding
Eggs
Hatching
Genetics
```

Players then discover that even basic chickens can occasionally produce interesting genetics.

---

# 50. THE "ONE MORE BREED" LOOP

The system should encourage:

> "I'll just breed them once."

Then:

> "Wait, that one carries Albino."

Then:

> "I need another carrier."

Then:

> "What happens if I breed these two?"

Then:

> "HOLY SHIT, TWO-HEADED."

This should be one of the game's primary engagement loops.

---

# 51. PLAYER EXPERIENCE

The emotional progression should be:

```text
Breed
 ↓
Curiosity
 ↓
Egg
 ↓
Anticipation
 ↓
Hatch
 ↓
Discovery
 ↓
"OH SHIT"
 ↓
Analysis
 ↓
Planning
 ↓
Breed Again
```

Rare mutations should feel like discoveries rather than routine rewards.

---

# 52. TECHNICAL DATA MODEL

Suggested simplified database structure.

## Chicken

```typescript
interface Chicken {
    id: string;

    sex: "MALE" | "FEMALE";

    species: string;

    generation: number;

    fatherId?: string;
    motherId?: string;

    bloodlineId?: string;

    genome: Genome;

    mutations: MutationInstance[];

    geneticStability: number;

    age: number;

    level: number;

    finalStats: ChickenStats;

    breedingCooldown: number;

    status: ChickenStatus;

    createdAt: Date;
}
```

---

# 53. GENOME MODEL

```typescript
interface Genome {
    strength: GenePair;
    health: GenePair;
    speed: GenePair;
    defense: GenePair;
    stamina: GenePair;
    accuracy: GenePair;
    awareness: GenePair;

    colorGenes: ColorGenes;

    physicalGenes: PhysicalGenes;

    specialGenes: SpecialGene[];
}
```

---

# 54. GENE PAIR

```typescript
interface GenePair {
    alleleA: number;
    alleleB: number;
}
```

Example:

```json
{
    "alleleA": 82,
    "alleleB": 71
}
```

---

# 55. MUTATION MODEL

```typescript
interface MutationDefinition {
    id: string;

    name: string;

    rarity: MutationRarity;

    inheritance:
        | "DOMINANT"
        | "RECESSIVE"
        | "RANDOM"
        | "CODOMINANT";

    spontaneousChance: number;

    statModifiers: Record<string, number>;

    visualEffects: string[];

    compatibleMutations: string[];

    incompatibleMutations: string[];

    canBeCarrier: boolean;

    canStack: boolean;
}
```

---

# 56. BREEDING FUNCTION

Conceptually:

```typescript
breed(parentA, parentB) {

    validateParents(parentA, parentB);

    const genome =
        inheritGenome(parentA, parentB);

    const mutations =
        calculateInheritedMutations(
            parentA,
            parentB
        );

    const spontaneousMutations =
        rollSpontaneousMutations(
            genome
        );

    const finalMutations =
        resolveMutationConflicts(
            mutations,
            spontaneousMutations
        );

    const offspring =
        createOffspring(
            genome,
            finalMutations
        );

    return offspring;
}
```

---

# 57. BREEDING PIPELINE

The actual server pipeline should be:

```text
1. Validate parents
2. Validate sex
3. Validate maturity
4. Validate cooldown
5. Validate ownership
6. Read genomes
7. Inherit alleles
8. Resolve dominant/recessive genes
9. Roll mutation events
10. Apply mutation effects
11. Calculate genetic stability
12. Calculate offspring generation
13. Create egg
14. Save transaction
15. Return egg
```

---

# 58. DATABASE RELATIONSHIPS

Suggested:

```text
Chicken
   │
   ├── father_id → Chicken
   ├── mother_id → Chicken
   ├── bloodline_id → Bloodline
   │
   └── genome

Breeding
   │
   ├── father_id
   ├── mother_id
   └── offspring_id

Mutation
   │
   └── ChickenMutation
```

---

# 59. IMPORTANT: DO NOT SIMULATE EVERY CHICKEN

For scalability, chickens should be data-driven.

Do not simulate:

```text
DNA molecules
cells
physical genetics
```

The genetics system is a deterministic mathematical simulation.

The visual chicken is simply the representation of the resulting genome.

```text
GENOME
 ↓
TRAIT RESOLVER
 ↓
CHICKEN MODEL
 ↓
ANIMATION
```

---

# 60. VISUAL GENERATION

The chicken's genome can determine appearance.

Example:

```text
Body Gene
→ Body Size

Wing Gene
→ Wing Shape

Color Gene
→ Feather Color

Head Gene
→ Number of Heads

Eye Gene
→ Eye Type

Leg Gene
→ Leg Structure
```

Therefore a Two-Headed chicken isn't a completely separate creature.

It is:

```text
Normal Chicken Model
+
Two-Head Mutation
=
Modified Chicken Model
```

This makes content production much easier.

---

# 61. ANIMATION SYSTEM

Animations should be modular.

Normal chicken:

```text
Idle
Walk
Run
Attack
Hit
Death
```

Two-headed chicken:

```text
Same base animations
+
Head-specific animation
```

Four-winged chicken:

```text
Same base animations
+
Additional wing animation
```

This allows rare mutations without requiring an entirely new animation set for every mutation.

---

# 62. CONTENT CREATION STRATEGY

Do NOT start with 100 mutations.

Start with approximately:

```text
10–20 mutations
```

Example:

```text
Albino
Extra-Toed
Giant
Dwarf
Long-Legged
Odd-Eyed
Melanistic
Luminescent
Four-Winged
Two-Headed
```

Build the system so new mutations can be added through data/configuration.

---

# 63. EVENT MUTATIONS

Limited-time mutations can be introduced.

Example:

```text
HALLOWEEN

Shadow Chicken

Available:
October event
```

Christmas:

```text
Frost Feather
```

Anniversary:

```text
Golden Chicken
```

This creates seasonal collection goals.

---

# 64. DISCOVERY RARITY

Not every mutation should be equally difficult.

Example:

```text
Common:
1 / 100

Rare:
1 / 1,000

Epic:
1 / 10,000

Legendary:
1 / 100,000

Anomalous:
1 / 1,000,000
```

The numbers should be tuned after playtesting.

---

# 65. CORE DESIGN RULES

The genetics system must follow these rules:

### Rule 1

**Rare does not automatically mean powerful.**

### Rule 2

**Visible appearance does not reveal the entire genome.**

### Rule 3

**Recessive genes should create surprises.**

### Rule 4

**Breeding should create long-term goals.**

### Rule 5

**Mutations should be collectible.**

### Rule 6

**Combat power and genetic rarity should be separate.**

### Rule 7

**All RNG happens server-side.**

### Rule 8

**Genetics should be deterministic once the breeding event is committed.**

### Rule 9

**Every chicken should have ancestry.**

### Rule 10

**The system should be expandable through data rather than hardcoded logic.**

---

# 66. MVP VERSION

Do NOT build the entire genetics system immediately.

The first implementation should contain:

```text
✓ Male/Female chickens
✓ Two parents
✓ Eggs
✓ Hatching
✓ Basic stat inheritance
✓ Generation tracking
✓ Parent IDs
✓ 3–5 mutations
✓ Dominant/recessive genes
✓ Basic mutation RNG
✓ Basic breeding cooldown
```

Example mutations:

```text
Albino
Extra-Toed
Giant
Luminescent
Two-Headed
```

---

# 67. POST-MVP

After the basic system works:

```text
→ Genetic Analyzer
→ Hidden carrier genes
→ Pedigree UI
→ Bloodlines
→ Genetic Stability
→ Inbreeding
→ Mutation stacking
→ Mutation encyclopedia
→ First-discovery system
→ Advanced genetic prediction
→ Trading
→ Seasonal mutations
```

---

# 68. ENDGAME BREEDING

At high levels, players should be pursuing things like:

```text
"Create the strongest speed bloodline."

"Discover every mutation."

"Create a pure albino bloodline."

"Find a Two-Headed carrier."

"Create a Two-Headed + Luminescent chicken."

"Remove every negative gene from my bloodline."

"Create a chicken with 5 generations of optimized genetics."

"Become the first player to discover the Anomalous mutation."
```

This means there is always another breeding project.

---

# 69. THE ULTIMATE DESIGN PHILOSOPHY

The player should never know exactly what their next chicken will be.

They should understand the **rules**, but not the **outcome**.

Good:

```text
"I know these two chickens carry Albino,
so I have a chance to produce one."
```

Bad:

```text
"Put Chicken A + Chicken B into machine
= guaranteed Chicken C."
```

The breeding system should create **controlled uncertainty**.

Players make intelligent decisions, then RNG creates the final result.

---

# 70. FINAL SYSTEM VISION

The complete game loop becomes:

```text
             🐔 CHICKENS
                  │
                  ↓
            🧬 GENETICS
                  │
                  ↓
             ❤️ BREEDING
                  │
                  ↓
               🥚 EGGS
                  │
                  ↓
             🐣 HATCHING
                  │
                  ↓
            🧬 OFFSPRING
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
      BATTLE    BREED     TRADE
        │         │         │
        └─────────┼─────────┘
                  ↓
             BLOODLINES
                  │
                  ↓
             MUTATIONS
                  │
                  ↓
             DISCOVERY
                  │
                  ↓
          "BREED ONE MORE"
```

The ideal experience is:

> **ARK's "selective breeding" depth**
>
> *
>
> **Dragon City's "what am I going to hatch?" excitement**
>
> *
>
> **A collectible mutation system**
>
> *
>
> **Your game's chicken combat system.**

The breeding system should therefore be treated as a **core progression pillar**, not a side feature.
