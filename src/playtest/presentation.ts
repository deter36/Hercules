import type { TransitionHistoryRecord } from "../engine/state/types.js";
import { rewardSummary } from "../engine/view-model.js";

type RecordValue = Record<string, unknown>;

export type GameplayPresentation = {
  id: string;
  kind: "reward" | "mood";
  eyebrow: string;
  title: string;
  detail: string;
};

const record = (value: unknown): RecordValue | null => typeof value === "object" && value !== null ? value as RecordValue : null;
const signed = (value: number): string => `${value > 0 ? "+" : ""}${value}`;

const moodDetail = (effect: unknown): string => {
  const value = record(effect);
  if (!value) return "This Mood is now active for the Labor.";
  switch (value.type) {
    case "spirit_delta": return `${signed(Number(value.value))} Spirit.`;
    case "temporary_dice_delta": return `${signed(Number(value.value))} temporary Hercules ${Math.abs(Number(value.value)) === 1 ? "die" : "dice"} for this Labor.`;
    case "grant_blue_any": return "Once this roll, a Hercules die may use a Blue space to become any face.";
    case "player_choice": return "Choose its consequence to continue.";
    case "disable_owned_reward_choice": return "Choose a Reward or the Bow to disable for this Labor.";
    case "initial_roll_delta": return `Initial rolls are adjusted by ${signed(Number(value.value))}.`;
    case "set_aside_roll_face": return `Every rolled ${String(value.face)} is set aside this Labor.`;
    default: return "This Mood is now active for the Labor.";
  }
};

const rewardDetail = (rewardId: string, events: RecordValue[]): string => {
  const details = events.flatMap((event) => {
    const delta = Number(event.delta);
    if (!Number.isFinite(delta)) return [];
    if (event.type === "REWARD_SPIRIT_EFFECT") return [`${signed(delta)} Spirit`];
    if (event.type === "REWARD_DIVINITY_EFFECT") return [`${signed(delta)} Divinity`];
    if (event.type === "REWARD_HERCULES_DICE_EFFECT") return [`${signed(delta)} Hercules ${Math.abs(delta) === 1 ? "die" : "dice"}`];
    return [];
  });
  const ability = rewardSummary(rewardId);
  return details.length ? `${ability} Immediate: ${details.join(" · ")}.` : ability;
};

export const moodPresentation = (id: string, name: string, effect: unknown): GameplayPresentation => ({ id, kind: "mood", eyebrow: "MOOD REVEALED", title: name, detail: moodDetail(effect) });

/** Converts engine-authored lifecycle records into an ordered, UI-local presentation queue. */
export function presentationEventsFromTransitions(transitions: readonly TransitionHistoryRecord[]): GameplayPresentation[] {
  const presentations: GameplayPresentation[] = [];
  for (const transition of transitions) {
    const lifecycle = Array.isArray(transition.payload.lifecycle) ? transition.payload.lifecycle.map(record).filter((event): event is RecordValue => event !== null) : [];
    for (let index = 0; index < lifecycle.length; index += 1) {
      const event = lifecycle[index];
      if (event.type === "REWARD_GAINED") {
        const rewardId = String(event.rewardId);
        const effects = lifecycle.slice(index + 1).filter(candidate => candidate.rewardId === rewardId);
        presentations.push({ id: `${transition.index}:reward:${rewardId}`, kind: "reward", eyebrow: "REWARD GAINED", title: String(event.rewardName ?? rewardId), detail: rewardDetail(rewardId, effects) });
      }
      if (event.type === "MOOD_REVEALED") presentations.push(moodPresentation(`${transition.index}:mood:${String(event.moodId)}`, String(event.moodName ?? event.moodId), event.effect));
    }
  }
  return presentations;
}
