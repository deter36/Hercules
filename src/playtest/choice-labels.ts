import type {EngineCommand} from '../engine/commands/types.js';

/** Project result values from command semantics, never command-object identity or display text. */
export function resultingFace(command:EngineCommand,dice:Record<string,{face:number|null}>):number|null {
 if(command.type==='USE_COWS_A')return command.face;
 if(command.type!=='USE_BLUE_ABILITY'||command.target===undefined)return null;
 const source=dice[command.sourceDieId]?.face;if(source==null)return null;
 if(['ability.bow.blue','ability.reward.L07.A.blue','ability.reward.L10.A.blueA','ability.reward.L10.A.blueB'].includes(command.abilityId))return ((source-1+command.target+6)%6)+1;
 if(['ability.reward.L06.B.blue','ability.mood.ferocious.blue'].includes(command.abilityId))return command.target;
 return null;
}
