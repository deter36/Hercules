import type {RngEventRecord} from '../../engine/state/types.js';
/** Display-only comparison with the latest committed raw roll; no inverse Mood logic. */
export function lastRolledFaces(ledger:readonly RngEventRecord[]):Record<string,number> {
 const result:Record<string,number>={};
 for(const event of ledger){const id=event.purpose.match(/:(H\d+)$/)?.[1];
  if(id&&event.status==='committed'&&typeof event.result==='number'&&Number.isInteger(event.result)&&event.result>=1&&event.result<=6)result[id]=event.result;
 }
 return result;
}
