import { sha256 } from "./sha256.js";
import type { GameState, RngEventRecord } from "../engine/state/types.js";
import { beginRngUndoInterval } from "../engine/state/undo.js";

const u32 = (n: number): Uint8Array => new Uint8Array([n >>> 24, n >>> 16, n >>> 8, n]);
const u64 = (n: bigint): Uint8Array => new Uint8Array(Array.from({ length: 8 }, (_, index) => Number((n >> BigInt((7 - index) * 8)) & 0xffn)));
const joinBytes = (...parts: Uint8Array[]): Uint8Array => { const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; };
const utf8 = new TextEncoder();
const space = 1n << 64n;
export interface RngDraw { raw: bigint; attempt: number; value: number; }
export interface RngRequest { purpose: string; bound: number; result: (value: number) => unknown; }
export interface StagedRngDraw { request: RngRequest; eventIndex: bigint; draw: RngDraw; }

/** HERC-RNG-v3 canonical preimage and first 64-bit SHA-256 output. */
export function raw64(seed: string, event: bigint, purpose: string, attempt: number): bigint {
  const seedBytes = utf8.encode(seed), purposeBytes = utf8.encode(purpose);
  const encoded = joinBytes(utf8.encode("HERC-RNG-V2\0"), u32(seedBytes.length), seedBytes, u64(event), u32(purposeBytes.length), purposeBytes, u32(attempt));
  const digest = sha256(encoded);
  let result = 0n;
  for (let i = 0; i < 8; i += 1) result = (result << 8n) | BigInt(digest[i]);
  return result;
}
export function draw(seed: string, event: bigint, purpose: string, n: number): RngDraw {
  if (!Number.isInteger(n) || n < 1) throw new Error("Bound must be positive.");
  const limit = space - (space % BigInt(n));
  for (let attempt = 0; ; attempt += 1) { const raw = raw64(seed, event, purpose, attempt); if (raw < limit) return { raw, attempt, value: Number(raw % BigInt(n)) }; }
}
/** Stage without changing state; callers validate their operation before commit. */
export function stageDraws(state: GameState, requests: readonly RngRequest[]): StagedRngDraw[] { let event = BigInt(state.rng.nextEvent); return requests.map((request) => { const staged = { request, eventIndex: event, draw: draw(state.rng.seed, event, request.purpose, request.bound) }; event += 1n; return staged; }); }
/** Atomically records staged events after validation. */
export function commitStagedDraws(state: GameState, staged: readonly StagedRngDraw[]): GameState { const next = structuredClone(state); for (const entry of staged) { if (entry.eventIndex.toString() !== next.rng.nextEvent) throw new Error("Staged RNG events are not contiguous with state.nextEvent."); const record: RngEventRecord = { eventIndex: entry.eventIndex.toString(), purpose: entry.request.purpose, attempt: entry.draw.attempt, raw64: entry.draw.raw.toString(), result: entry.request.result(entry.draw.value), status: "committed" }; next.rng.ledger.push(record); next.rng.nextEvent = (entry.eventIndex + 1n).toString(); } return next; }
/** Preserve committed random events if work after commit fails. */
export function orphanCommittedEvents(state: GameState, firstEvent: bigint, error: unknown): GameState { const next = structuredClone(state), message = error instanceof Error ? error.message : String(error); for (const record of next.rng.ledger) if (BigInt(record.eventIndex) >= firstEvent) { record.status = "orphaned_execution_error"; record.error = message; } return next; }
/** Stable Fisher-Yates shuffle: i descends, and every swap consumes exactly one event. */
export function shuffleMoodDeck(state: GameState, purposePrefix = "setup_mood_shuffle"): GameState { const requests: RngRequest[] = []; for (let i = state.mood.deck.length - 1; i >= 1; i -= 1) requests.push({ purpose: `${purposePrefix}:swap_i=${i}`, bound: i + 1, result: (j) => ({ i, j, bound: i + 1 }) }); const staged = stageDraws(state, requests); const next = commitStagedDraws(state, staged); const deck = [...next.mood.deck]; for (const entry of staged) { const { i, j } = entry.request.result(entry.draw.value) as { i: number; j: number }; [deck[i], deck[j]] = [deck[j], deck[i]]; } next.mood.deck = deck; return beginRngUndoInterval(next); }
export function verifyLedger(seed: string, ledger: readonly RngEventRecord[]): string[] { const errors: string[] = []; for (const record of ledger) if (record.raw64 && record.purpose && raw64(seed, BigInt(record.eventIndex), record.purpose, record.attempt).toString() !== record.raw64) errors.push(`event ${record.eventIndex}: raw64 mismatch`); return errors; }
