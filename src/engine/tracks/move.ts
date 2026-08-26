export interface TrackNode{ id:string; next?:string[]; effect:unknown; }
export type MoveResult={kind:"moved";nodeId:string}|{kind:"choose_branch";options:string[]}|{kind:"terminal"};
export function advance(node:TrackNode):MoveResult{const next=node.next??[];if(next.length===1)return{kind:"moved",nodeId:next[0]};if(next.length>1)return{kind:"choose_branch",options:[...next]};if(isFailure(node.effect))return{kind:"terminal"};throw new Error(`Track node ${node.id} has no verified outgoing edge or terminal effect.`);}
function isFailure(effect:unknown):boolean{return typeof effect==="object"&&effect!==null&&"failure" in effect;}
