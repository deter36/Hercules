export type TrackValue = number | "X" | "SKULL" | "TOP";
export function applySimultaneous(value: TrackValue, deltas: readonly number[], maximum: number, terminal: "SKULL" | "TOP"): TrackValue { if (typeof value !== "number") return value; const next=value+deltas.reduce((a,b)=>a+b,0); if(next<=0)return terminal==="SKULL"?"SKULL":0; return Math.min(maximum,next); }
