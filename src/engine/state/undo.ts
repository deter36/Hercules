import type { DeterministicUndoCheckpoint, GameState } from "./types.js";

function snapshot(state: GameState): Omit<GameState, "undoStack"> {
  const { undoStack: _undoStack, ...rest } = structuredClone(state);
  return rest;
}

/** Stores only checkpoints inside the current committed-RNG interval. */
export function checkpointDeterministicAction(state: GameState): GameState {
  const next = structuredClone(state);
  const checkpoint: DeterministicUndoCheckpoint = { rngNextEvent: state.rng.nextEvent, state: snapshot(state) };
  next.undoStack.push(checkpoint);
  return next;
}

/** A committed random operation starts a new undo interval. */
export function beginRngUndoInterval(state: GameState): GameState {
  const next = structuredClone(state);
  next.undoStack = [];
  return next;
}

export function undoDeterministicAction(state: GameState): GameState {
  const checkpoint = state.undoStack.at(-1);
  if (!checkpoint) throw new Error("No deterministic action is available to undo.");
  if (checkpoint.rngNextEvent !== state.rng.nextEvent) throw new Error("Undo cannot cross a committed RNG boundary.");
  const restored = structuredClone(checkpoint.state) as GameState;
  restored.undoStack = structuredClone(state.undoStack.slice(0, -1));
  return restored;
}
