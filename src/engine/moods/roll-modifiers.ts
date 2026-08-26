export function modifyInitialRoll(face:number,effect:unknown):number{const e=effect as any;if(e?.type!=="initial_roll_delta")return face;const value=face+e.value;return Math.max(e.min??1,Math.min(e.max??6,value));}
export function setAsideForMood(face:number,effect:unknown,isReroll:boolean):boolean{const e=effect as any;return e?.type==="set_aside_roll_face"&&e.face===face&&(!isReroll||e.applies_to_rerolls===true);}
export function moodTemporaryDiceDelta(effect:unknown):number{const e=effect as any;return e?.type==="temporary_dice_delta"?e.value:0;}
