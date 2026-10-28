import test from 'node:test';
import assert from 'node:assert/strict';
import {lastRolledFaces} from '../../src/playtest/dice/last-rolled-faces.js';
import type {RngEventRecord} from '../../src/engine/state/types.js';

test('pip value-change badges follow latest committed physical-die rolls, ignoring orphaned draws',()=>{
 const ledger:RngEventRecord[]=[
  {eventIndex:'0',purpose:'roll:1:H1',attempt:0,status:'committed',result:4},
  {eventIndex:'1',purpose:'roll:1:H2',attempt:0,status:'committed',result:6},
  {eventIndex:'2',purpose:'reroll:1:H1',attempt:0,status:'orphaned_execution_error',result:2},
  {eventIndex:'3',purpose:'reroll:1:H2',attempt:0,status:'committed',result:1},
  {eventIndex:'4',purpose:'mood:shuffle',attempt:0,status:'committed',result:3},
 ];
 const snapshot=JSON.stringify(ledger);
 assert.deepEqual(lastRolledFaces(ledger),{H1:4,H2:1});assert.equal(JSON.stringify(ledger),snapshot);
 assert.deepEqual(lastRolledFaces([...ledger,{eventIndex:'5',purpose:'cows:1:H1',attempt:0,status:'committed',result:5}]),{H1:5,H2:1});
});
