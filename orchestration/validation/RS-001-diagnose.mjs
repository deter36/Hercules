// Read-only historical-engine diagnosis. Does not establish a validation gate.
// Usage: node RS-001-diagnose.mjs <checkout> <output-json> <verified-commit>
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
const [repo, output, testedCommit] = process.argv.slice(2);
if (!repo || !output || !/^[0-9a-f]{40}$/.test(testedCommit ?? '')) throw new Error('checkout, output path and verified commit required');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hercules-rs001-'));
fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
function copy(dir) {
  for (const e of fs.readdirSync(path.join(repo, dir), {withFileTypes:true})) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) copy(rel);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      const dest = path.join(tmp, rel.replace(/\.ts$/, '.js'));
      fs.mkdirSync(path.dirname(dest), {recursive:true});
      fs.writeFileSync(dest, stripTypeScriptTypes(fs.readFileSync(path.join(repo, rel), 'utf8')));
    }
  }
}
copy('src');
const imp = rel => import(pathToFileURL(path.join(tmp, rel)).href);
const read = rel => JSON.parse(fs.readFileSync(path.join(repo, rel), 'utf8'));
const { createInitialState, initializeGame } = await imp('src/engine/state/create.js');
const { replayGoldenRunTrace, verifyGoldenRunLedger } = await imp('src/replay/golden-run.js');
const { startLabor } = await imp('src/engine/labor/setup.js');
const { allocateAttack } = await imp('src/engine/actions/placement.js');
const { resolveAssignments } = await imp('src/engine/commands/resolve-assignments.js');
const { resolveRoundDamage } = await imp('src/engine/round/resolve.js');
const { applyLaborDamage } = await imp('src/engine/labor/damage.js');
const { applyContentEffect, resolveQueuedResources } = await imp('src/engine/effects/content.js');
const { GAME_DATA, GAME_DATA_SOURCE_HASH, GAME_DATA_CONTENT_HASH } = await imp('src/data/generated/game-data.js');
const record = read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json');
const script = read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json');
const result = {
  purpose:'RS-001 preparation diagnosis, not independent validation or a gate decision',
  tested_commit:testedCommit,
  runtime:process.version,
  method:'Node built-in stripTypeScriptTypes copies tracked TypeScript into an OS temporary directory; no package installation or regeneration',
  generated_source_hash:GAME_DATA_SOURCE_HASH,
  generated_content_hash:GAME_DATA_CONTENT_HASH,
  generated_matches_raw_object:JSON.stringify(GAME_DATA) === JSON.stringify(read('src/data/raw/GAME_DATA_v4.json')),
  ledger:verifyGoldenRunLedger(record),
  golden_initial_state:createInitialState('human',script.seed),
  golden_ready_to_roll:initializeGame('human',script.seed)
};
try { result.golden = replayGoldenRunTrace(script); }
catch(e) { result.golden_error = e.stack; }
let l08 = startLabor(createInitialState('human','RS-001-L08-FIXED'), 'labor.L08');
l08.game.phase = 'GOLD_AND_ATTACK_PLACEMENT';
l08.player.spirit = 10;
l08.player.divinity = 0;
l08.mood.activeMoodId = 'mood.haunted_b';
l08.mood.deck = GAME_DATA.moods.filter(m=>m.class==='normal' && m.id!=='mood.haunted_b').map(m=>m.id);
l08.round.rollNumber = 1;
for (const [i, face] of [1,2,3,5,6].entries()) l08.herculesDice['H'+(i+1)].face = face;
result.l08 = { start:l08 };
try {
  result.l08.allocated = allocateAttack(l08,'labor.L08.A',['H1','H2','H3']);
  result.l08.assignments_resolved = resolveAssignments(result.l08.allocated);
  // Expose the damage boundary hidden inside resolveRoundDamage. This is the
  // identical allocation loop at that function's start, using pinned helpers.
  let damageOnly = structuredClone(result.l08.assignments_resolved);
  for (const allocation of damageOnly.round.attackAllocations) {
    if (allocation.targetId === '__all_active_targets__') {
      for (const target of Object.values(damageOnly.currentLabor.laborDice).filter(d => d.status === 'active'))
        damageOnly = applyLaborDamage(damageOnly,target.id,allocation.damage);
    } else if (damageOnly.currentLabor.laborDice[allocation.targetId]?.status === 'active')
      damageOnly = applyLaborDamage(damageOnly,allocation.targetId,allocation.damage);
  }
  result.l08.damage_only = damageOnly;
  result.l08.after_round = resolveRoundDamage(result.l08.assignments_resolved);
} catch(e) { result.l08.error=e.stack; }
// Bounded probe of a restriction explicitly used by the Golden scenario.
// Current nodes are already entered; the round began before A reached Cannot Block.
const restrictionStart=structuredClone(l08);
restrictionStart.game.phase='IMPACT_RESOLUTION';
restrictionStart.currentLabor.laborDice['labor.L08.A'].nodeId='L08A.n5';
restrictionStart.currentLabor.laborDice['labor.L08.B'].nodeId='L08B.n6';
restrictionStart.round.blockedSpirit=1;
const restrictionEntered=applyContentEffect(restrictionStart,{cannot_block:true},'L08A.n5','labor.L08.A',true);
const restrictionAfter=resolveQueuedResources(applyContentEffect(restrictionEntered,{spirit_delta:-2},'L08B.n6','labor.L08.B',true));
result.cannot_block_probe={purpose:'isolated effect-helper diagnosis, not a complete game/replay fixture',
  preconditions:{round_start_cannot_block:false,existing_block:1,spirit:10,entered_nodes:['L08A.n5','L08B.n6']},
  expected:{cannotBlockThisRound:false,spirit:9,remainingBlock:0},
  observed:{cannotBlockThisRound:restrictionAfter.currentLabor.cannotBlockThisRound,spirit:restrictionAfter.player.spirit,remainingBlock:restrictionAfter.round.blockedSpirit}};
fs.writeFileSync(output, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,ledger:result.ledger,golden_error:result.golden_error,
  golden:result.golden && {phase:result.golden.state.game.phase,spirit:result.golden.state.player.spirit,divinity:result.golden.state.player.divinity,next_event:result.golden.state.rng.nextEvent,checkpoints:result.golden.checkpoints.length},
  l08:result.l08.after_round && {allocations:result.l08.allocated.round.attackAllocations,spirit:result.l08.after_round.player.spirit,dice:result.l08.after_round.currentLabor.laborDice}},null,2));
