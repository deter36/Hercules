Hercules & the 12 Labors
Verified Gameplay Reference v12
Purpose: Runtime reference for gameplay chats in this project. Use with the official rulebook. Owner-verified component details below are authoritative for the listed card/track content.
Status: All 12 Labor content sets are verified, including Labor XI directed topology, unless explicitly marked provisional. The Ceryneian Hind loss condition remains a provisional owner-approved testing rule.
# Runtime authority rules
• Reward variants use letter identifiers only: A, B, C, D in physical left-to-right order. Do not use Left/Right/Middle as Reward identifiers in canonical state, runtime display, tests, or implementation.
• Randomness is valid only when an actual computation tool executes HERC-RNG-v3. A seed declaration without computation is decorative metadata and must be rejected.
• Do not infer or reconstruct card details from memory if this document supplies them.
• For physical card facts and track topology, owner-verified component readings in this document override ambiguous descriptive wording.
• Labor-die value and track position are separate state dimensions.
• Branching tracks create player-choice checkpoints.
• Never invent a defeat condition. Exception: the provisional Hind rule below is owner-approved for testing.
• Effects such as “counts as 2 dice” do not create a second physical die.
# Global setup and core component data
• Hercules dice are **blue/teal** physical dice (the rulebook calls them green; physical component data controls appearance).
• Labor dice are gold.
• Difficulty: Human 5 Hercules dice; Hero 4; God 3 and remove Battered from the normal Mood deck.
• Current testing baseline: **Human**.
• Spirit track: `X → 16 → 15 → ... → 1 → Skull/failure`.
• Divinity starts at X and must reach the top/flame by game end.
• Bow of Hercules (blue ability): place one die to change it +1 or -1, with wraparound 1<->6, costing 1 Spirit; once per roll.
# Normal Mood deck (9 physical cards)
• **Melancholic:** During each initial roll, decrease every die by 1 to a minimum of 1. Rerolled dice are not decreased.
• **Resolute:** Gain 1 Hercules die for this Labor only.
• **Battered:** Lose 1 Hercules die for this Labor only.
• **Ferocious:** Adds a blue `ANY` manipulation space for the Labor; a die placed there may be changed to any value.
• **Enraged:** During each initial roll, increase every die by 1 to a maximum of 6. Rerolled dice are not increased.
• **Haunted A:** Lose 2 Spirit.
• **Haunted B:** Lose 1 Spirit.
• **Haunted C:** Lose 3 Spirit.
• **Haunted D:** Lose 2 Spirit.
# Special Mood cards
• **Weight of Atlas:** Lose 2 Hercules dice for the current Labor.
• **Ghost of Abderus:** Player choice during Mood resolution: lose 1 Hercules die for the current Labor **OR** lose 5 Spirit.
• **Ghost of Hippolyta:** Each time a 1 is rolled, immediately set that die aside; it cannot be used for the current roll. Applies to rerolls too.
• **Ghost of Pholus:** Player choice during Mood resolution: choose one owned Reward to cover/disable for this Labor. Remove Pholus from that Reward and reshuffle it into the Mood deck at Labor end.
# Labor I — Nemean Lion
• Labor dice: 1 die, Start 6.
• Attack: one **5 or 6** deals 1 damage.
• Track: `Start → Lose 1 Spirit → Lose 1 Spirit → Heal 1 → Lose 2 Spirit → Skull`.
• Reward — **Impenetrable Hide**: immediate +2 Spirit; blue `6 <-> 3`; gold `ANY → Block 1 Spirit loss`; restart cost 0.
# Labor II — Lernean Hydra
• Labor dice: 1 die, Start 6.
• Attack: one **6** deals 1 damage.
• Linear track: `Start → (-1 Spirit + Heal 1) → (-1 Spirit + Heal 1) → (-1 Spirit + Heal 1) → Heal 2 → (-1 Spirit + Heal 1) → (-1 Spirit + Heal 1) → (-1 Spirit + Heal 1) → Skull`.
• Reward — **Venomous Blood**: immediate +1 Hercules die; two separate blue spaces, each `reroll one die and place it here`; restart cost 0.
# Labor III — Ceryneian Hind
• Labor dice: 1 die, Start 6.
• Attack: any **2 matching dice**.
• Fixed circular track: `Heal 1 → Break 1 Hercules die → Heal 1 → Lose 2 Spirit → repeat`.
• No skull is printed.
• **Provisional testing defeat rule:** if the Hind is still undefeated and Hercules has fewer than 2 usable Hercules dice remaining, immediately lose the Labor. This is an owner-approved deterministic soft-lock ruling pending designer confirmation.
• Reward — **Blessing of Artemis**: immediate +3 Spirit; gold `4 + 4 → Gain 1 Divinity`; restart cost 0.
# Labor IV — Erymanthian Boar
• Two Labor dice, each Start 3. Tracks remain separate and meet at the same skull endpoint.
• Left die attack: `A + B = C`, using 3 separate dice.
• Left track: `Start → Lose 1 Spirit → Lose 1 Spirit → Break 1 Hercules die → Lose 2 Spirit → Heal 1 → Skull`.
• Right die attack: Hercules dice totaling exactly **12**.
• Right track: `Start → Lose 2 Spirit → Heal 1 → Cannot Block → Lose 2 Spirit → Lose 2 Spirit → Skull`.
• Reward choices — **Regret** (both): immediate +2 Spirit and +1 Hercules die; add **Ghost of Pholus**; remove **Melancholic**.
• Regret A: gold `matching pair → Gain 2 Spirit`; restart cost -1.
• Regret B: blue `one die counts as 2 dice of its value`, costing 2 Spirit; restart cost -1.
# Labor V — Augean Stables
• Two Labor dice, each Start 5.
• Attack scope: same attack applies to both dice: exact **1**.
• Track A: `Start → Lose 1 Spirit → Lose 1 Spirit → Lose 1 Spirit + Heal 1 → Lose 1 Divinity → Cannot Block → Lose 2 Spirit → Skull`.
• Track B: `Start → Lose 1 Spirit → Heal 1 → Lose 2 Spirit → Break 1 Hercules die → Lose 2 Spirit → Lose 2 Spirit → Skull`.
• Reward choices — **100 Immortal Cows** (both): immediate +3 Spirit; remove one prior Reward.
• 100 Immortal Cows A: blue `sacrifice/place one die (lost for this roll) → set one other die to ANY value`; restart cost -1. The target die may already have used another blue ability during the same roll; the Cows die is the die being assigned/spent.
• 100 Immortal Cows B: blue `place one die → reroll any dice`; restart cost -3.
# Labor VI — Stymphalian Birds
• Four independent Labor dice/tracks with per-die attack requirements.
• Card/Track 14: Start 3; attack **6 or 3**; track `Lose 1 Spirit → Lose 1 Spirit → Skull`.
• Card/Track 15: Start 4; attack exact **6**; track `Cannot Block → Lose 2 Spirit → Lose 2 Spirit → Skull`.
• Card/Track 16: Start 4; attack exact **3**; track `Lose 1 Spirit → Advance all other Labor dice 1 space → Lose 2 Spirit → Skull`.
• Card/Track 17: Start 3; attack **6 or 3**; track `Lose 1 Spirit → Lose 1 Spirit → Skull`.
• Reward choices — **Athena’s Rattle** (all four): immediate +3 Spirit, +1 Divinity, +1 Hercules die.
• Athena’s Rattle A: blue `odd <-> even`; restart cost -2.
• Athena’s Rattle B: blue `change placed die to ANY value`; restart cost -2.
• Athena’s Rattle C: gold `ANY → Gain 1 Spirit`; restart cost -1.
• Athena’s Rattle D: gold `5 → Block 2 Spirit loss`; restart cost -1.
# Labor VII — Cretan Bull
• Starting health **12** is one logical Cretan Bull Labor-health entity/target on one track. The physical game represents that single 12-health value with **two stacked gold Labor dice showing 6 + 6 at Start**. The two physical dice are not separate targets, do not have independent health, do not advance separately, and do not create separate defeat checks.
• Labor-wide attack: `3 + X ≤ Y` using three Hercules dice. Each valid attack instance deals 1 damage to the single Bull health entity.
• Start is a free player-choice branch.
• **Start RIGHT:** `Lose 1 Spirit → [card 20] Heal 1 → Lose 3 Spirit`, then free branch:
◦ Right branch: `Heal 1 → Lose 2 Spirit → Lose 1 Divinity → Lose 2 Spirit → Lose 2 Spirit → Skull`.
◦ Left branch: `Break 1 Hercules die → Heal 1 → MERGE`.
• **Start LEFT:** `Lose 1 Spirit → Lose 1 Spirit + Heal 1 → Lose 1 Spirit + Heal 1 → Heal 2 → Break 1 Hercules die → MERGE`.
• **MERGE:** `Lose 1 Spirit → [card 20] Heal 2 → Lose 2 Spirit → Skull`.
• Reward choices — **Wrath of Hera** (both): immediate +1 Hercules die; remove one prior Reward; restart cost -1.
• Wrath of Hera A: blue `change die +1 or -1`; pip manipulation wraps `6<->1` unless an effect explicitly states a minimum/maximum.
• Wrath of Hera B: two separate blue `+1` abilities; each wraps `6→1` unless an effect explicitly states a maximum.
# Labor VIII — Mares of Diomedes
• Two Labor dice, each Start 6.
• Attack scope: **labor-wide** fixed `1-2-3` straight; applies to both Labor dice.
• Track A: `Start → Lose 3 Spirit → Lose 1 Spirit → Heal 1 → Break 1 Hercules die → Cannot Block → Lose 2 Spirit → Skull`.
• Track B: `Start → Heal 1 → Lose 1 Spirit → Heal 1 → Break 1 Hercules die → Lose 1 Spirit + Heal 1 → Lose 2 Spirit → Lose 1 Spirit → Lose 1 Divinity → Skull`.
• Reward choices — **Zeus’ Disregard** (both): immediate +2 Spirit; add **Ghost of Abderus**; remove **Enraged**.
• Zeus’ Disregard A: blue `flip die to opposite side`; restart cost -1.
• Zeus’ Disregard B: `May redraw the Mood card`; restart cost -3. After revealing a Mood but before resolving it, stop for the player's redraw decision. If used, set the revealed Mood aside, draw the next card from the existing ordered Mood deck without shuffling or consuming RNG, then place the rejected Mood on the bottom of the deck.
# Labor IX — Belt of Hippolyta
• Three Labor dice: Start 3, Start 3, Start 6.
• Attack scope: **labor-wide** multiplication relation `A × B = total of one or more other dice`; applies to all three Labor dice.
• Left Start-3 track: `Lose 1 Spirit → Lose 2 Spirit → Lose 1 Spirit → Lose 1 Spirit + Heal 1 → Break 1 Hercules die → Lose 1 Divinity → Skull`.
• Right Start-3 track: `Lose 1 Spirit → Lose 2 Spirit → Lose 1 Spirit → Lose 1 Spirit + Heal 1 → Lose 3 Spirit → Lose 1 Divinity → Skull`.
• Start-6 track: `Cannot Block → Cannot Block → Cannot Block → Cannot Block → Skull`.
• Reward choices — **Blood of the Amazons** (both): immediate +2 Spirit; add **Ghost of Hippolyta**; remove **Ferocious**.
• Blood of the Amazons A: blue `one die counts as 2 dice of its value` with no Spirit cost; designer clarification: create one temporary derived die/contribution with the same value as the source, and the source + derived contribution may be allocated independently during that roll; restart cost -2.
• Blood of the Amazons B: gold `6 + 3 → Gain 2 Divinity`; restart cost -1.
# Labor X — Cattle of Geryon
• Four Labor dice: Start values `5, 2, 2, 5` from left to right.
• Attack scope is by Labor-die group:
◦ Left pair: variable 3-die straight `X, X+1, X+2`.
◦ Right pair: any **3 matching dice**.
• Left outer Start-5 track: `Lose 1 Spirit → Lose 1 Spirit → Lose 1 Spirit → Lose 1 Spirit → Lose 2 Spirit → Break 1 Hercules die → Lose 1 Spirit + Heal 1 → Skull`.
• Left inner Start-2 track: `Cannot Block → Lose 1 Divinity → Cannot Block → Cannot Block → Skull`.
• Right inner Start-2 track: `Cannot Block → Break 1 Hercules die → Cannot Block → Cannot Block → Skull`.
• Right outer Start-5 track: `Lose 1 Spirit → Lose 1 Spirit → Lose 1 Spirit → Lose 1 Spirit → Lose 2 Spirit → Lose 3 Spirit → Lose 1 Spirit + Heal 1 → Skull`.
• Reward choices — **Helios’ Golden Cup** (all): immediate +3 Spirit; remove one prior Reward.
• Helios’ Golden Cup A: two separate blue `+1/-1` abilities; restart cost -2.
• Helios’ Golden Cup B: gold `EVEN + ODD → Gain 1 Divinity`; restart cost -1.
• Helios’ Golden Cup C: two separate blue `flip die to opposite side` abilities; restart cost -2.
# Labor XI — Apples of the Hesperides
• Two Labor dice, each Start 6.
• Attack scope: labor-wide 4-die straight `X, X+1, X+2, X+3`.
• Both Labor dice enter one shared directed branching network. Every node with multiple outgoing edges is a player route-choice checkpoint.
• Node effects (owner-verified):
• Row A: A1 Lose 1 Spirit; A2 Heal 1; A3 Lose 1 Spirit.
• Row B: B1 Heal 1; B2 Lose 3 Spirit; B3 Lose 1 Spirit + Heal 1; B4 Lose 2 Spirit.
• Row C: C1 Lose 1 Spirit + Heal 1; C2 Heal 2; C3 Lose 3 Spirit; C4 Lose 1 Spirit + Heal 1.
• Row D: D1 Lose 1 Spirit; D2 Heal 1; D3 Lose 2 Spirit; D4 Lose 1 Spirit.
• Row E: E1 Lose 1 Divinity; E2 Break 1 Hercules die; E3 Lose 1 Divinity; E4 Lose 3 Spirit.
• Row F: F1 Lose 1 Spirit + Heal 1; F2 Heal 2; F3 Lose 2 Spirit; F4 Lose 1 Spirit; terminal Skull.
• Directed entrances: Left Start 6 → A1; Right Start 6 → A3.
• Directed edges — Row A: A1 → A2/B1/B2; A2 → B2/B3; A3 → A2/B3/B4.
• Directed edges — Row B: B1 → B2; B2 → C1; B3 → B2/B4/C2/C3; B4 → C3/C4.
• Directed edges — Row C: C1 → C2/D2; C2 → D2/D3; C3 → C2/C4/D3; C4 → D4.
• Directed edges — Row D: D1 → E1; D2 → D1/E2; D3 → D4/E2; D4 → E3/E4.
• Directed edges — Row E: E1 → E2/F1; E2 → F2/F3; E3 → E2/F4; E4 → E3/F4.
• Directed edges — Row F: F1 → F2; F2 → Skull; F3 → F2/Skull; F4 → F3.
• Runtime display: show the current node effect and only its legal next-node choices during play; the engine stores the full adjacency graph.
• Reward choices — Golden Apples (all): immediate +3 Spirit and +1 Hercules die; add Weight of Atlas; remove Resolute.
• Golden Apples A: gold `6 → Gain 2 Spirit`; restart cost -2.
• Golden Apples B: gold `5 → Gain 1 Divinity`; restart cost -1.
• Golden Apples C: gold `ANY → Block 2 Spirit loss`; restart cost -2.
# Labor XII — Cerberus
• Three Labor dice, each Start 6.
• Attack scope: **labor-wide**; Hercules dice totaling exactly **18**.
• Three separate linear tracks.
• Track A (10 nodes): `Lose 1 Spirit → Cannot Block → Lose 2 Spirit → Lose 1 Divinity → Lose 2 Spirit → Lose 2 Spirit → Heal 1 → Break 1 Hercules die → Lose 1 Spirit → Heal 2 → Skull`.
• Track B (8 nodes): `Lose 1 Spirit → Lose 2 Spirit → Lose 1 Spirit + Heal 1 → Lose 1 Spirit + Heal 1 → Lose 1 Divinity → Lose 3 Spirit → Heal 1 → Heal 1 → Skull`.
• Track C (10 nodes): `Lose 1 Spirit → Lose 1 Spirit → Lose 2 Spirit → Lose 1 Spirit + Heal 1 → Cannot Block → Break 1 Hercules die → Advance all other Labor dice 1 space → Lose 3 Spirit → Heal 1 → Lose 1 Spirit → Skull`.
• The backs combine into the **Hercules’ Ascension** success image; no separate Reward mechanics.
• Game victory still requires all 12 Labors complete **and** Divinity at the top.
# Important generic execution notes
• Blue abilities are used before gold abilities.
• A blue square is usable once per roll; a die used on a blue square cannot use another blue square unless an explicit rule says otherwise.
• Gold ability dice are locked for that roll and cannot also attack.
• If multiple Labor dice exist, the player chooses damage allocation among legal targets.
• Healing never exceeds that Labor die’s starting value and does not move its track position backward.
• `Cannot Block` is snapshotted from active Labor-die positions at the start of the round; entering a Cannot Block node during end-of-round advancement does not retroactively disable blocking for the round just resolved.
• `Advance all other Labor dice 1 space` advances every other active Labor die one node; resolve the impacts they land on. If a player choice is created (e.g., branch, which die breaks), stop for that choice.
• Branch choices are always player decisions.
• If all required Labor dice reach 0, defeat the Labor immediately; do not advance tracks or resolve the next impact.
• Broken Hercules dice are unavailable for the remainder of the current Labor and return at the beginning of the next Labor.
• Labor dice at 0 health become defeated/inactive immediately. Retain their ID, final health, and final node for audit, but exclude them from further advancement, healing, impacts, skull resolution, and 'advance all other Labor dice' effects unless a rule explicitly overrides this.
• Using a blue ability does not by itself spend a Hercules die. Track `blue_used` separately from `spent`, `locked`, `allocated`, and `broken`; a blue-used die may still be used for a later gold ability or attack when legal.
• 100 Immortal Cows B confirms this lifecycle rule: the source die used to activate its reroll becomes `blue_used` but remains eligible for later gold/attack placement if otherwise legal.
• Simultaneous Spirit gains and losses net together before applying the Spirit-track bounds. Do not cap an intermediate gain before a simultaneous loss.
• When a rule removes one prior Reward, Bow of Hercules is eligible unless the specific effect says otherwise.
• Track displays must render current positions and legal next routes from canonical node IDs/edges, never from remembered prose.
• Individual gold/attack placement actions do not end the placement phase. The player explicitly chooses `Resolve Assignments`. At that point, warn only if an unused die can still participate in a legal placement that can change a rules-relevant outcome during the current assignment/resolution cycle. Legal but effectless placements proceed without warning; the player may explicitly resolve anyway when a meaningful opportunity remains.
# Owner-approved runtime rulings
• Simultaneous Divinity gains and losses net before track bounds, using the same resolution model as simultaneous Spirit.
• General pip `+1/-1` manipulation wraps `6<->1` unless an effect explicitly states a minimum or maximum. This includes Wrath of Hera.
• 100 Immortal Cows A: its target die may already have used another blue ability during the same roll; the Cows A die is the die assigned/spent to activate the ability.
• Zeus’ Disregard: if redraw is used, draw the next card from the existing ordered Mood deck with no shuffle and no RNG; place the rejected Mood on the bottom of the deck after drawing the replacement.
# Deterministic RNG — HERC-RNG-v3 / SHA256_COUNTER_V1
• If RNG canonical state is missing or contradictory, STOP before generating any new random outcome and reconcile. Do not label the run deterministic.
• A runtime/tool reset must not affect future results. Resume from algorithm + seed + next_event + hidden source order.
• After every random checkpoint, canonical state must retain next_event. Debug display should show algorithm, seed, and next_event.
• A committed result is immutable. If a later rules/display error is corrected, reuse the existing committed random result.
• Commit the full ordered Mood deck after each required shuffle; never reconstruct hidden deck order from memory.
• Roll physical dice in stable die-ID order H1, H2, ... . Rerolls consume new logical events.
• Each accepted logical random result consumes one event index; rejection attempts do not consume additional event indices.
• Counter-based rule: result = SHA-256 of fixed length-prefixed encoding of version, seed, event_index, purpose, and rejection-sampling attempt. There is no mutable PRNG state to lose.
• Canonical RNG state: algorithm ID, game seed, next_event, ordered hidden sources, and committed event ledger.
• Never generate random outcomes in prose. Every shuffle, die roll, reroll, or other mechanic that actually requires randomness must be computed with an actual computation tool using SHA256_COUNTER_V1. Zeus’ Disregard redraw is deterministic and consumes no RNG.
• Mandatory setup: SETUP → RNG_INITIALIZE → MOOD_SHUFFLE → MOOD_DRAW. No random operation is legal before RNG initialization.
# Golden Run validation
• HERC-GOLDEN-RUN-0001: Human difficulty, seed `HERC-GOLDEN-RUN-0001`, defeat at Stymphalian Birds.
• Automated replay reproduced all five completed-Labor checkpoints and the terminal state with final Spirit 8, Divinity 3/10, and `next_event = 174`.
• RNG replay had zero SHA256 counter mismatches; events 18–25 remain permanently `orphaned_execution_error` and were never reused.
• Historical implicit assignment completion was normalized by inserting 12 non-tactical `Resolve Assignments` actions; no player choice or random outcome changed.
# Gameplay chat display requirements
• Always show Mood **name + mechanical effect**.
• Always show Labor health, attack requirement/scope, full known track(s), current node(s), next impact(s), Spirit/Divinity, stable die IDs, broken dice, and active Reward/Bow effects.
• Circular tracks must be displayed as loops; branching tracks must show branches and stop at actual route choices.