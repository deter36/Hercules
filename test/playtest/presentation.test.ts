import assert from "node:assert/strict";
import test from "node:test";
import { presentationEventsFromTransitions } from "../../src/playtest/presentation.js";

test("presentation queue preserves a reward bonus before the following Mood", () => {
  const events = presentationEventsFromTransitions([{
    index: 7,
    type: "DECISION_RESOLVED",
    source: { kind: "command", id: "CHOOSE_OPTION" },
    beforeHash: "before",
    afterHash: "after",
    payload: {
      lifecycle: [
        { type: "REWARD_GAINED", rewardId: "reward.L05.A", rewardName: "Venomous Blood" },
        { type: "REWARD_SPIRIT_EFFECT", rewardId: "reward.L05.A", delta: 3 },
        { type: "MOOD_REVEALED", moodId: "mood.haunted_a", moodName: "Haunted A", effect: { type: "spirit_delta", value: -2 } },
        { type: "MOOD_SPIRIT_EFFECT", moodId: "mood.haunted_a", delta: -2 }
      ]
    }
  }]);
  assert.deepEqual(events.map(event => [event.kind, event.title, event.detail]), [
    ["reward", "Venomous Blood", "Blue: sacrifice one die to set another die. Immediate: +3 Spirit."],
    ["mood", "Haunted A", "-2 Spirit."]
  ]);
});

test("presentation queue includes dice and Divinity reward bonuses", () => {
  const events = presentationEventsFromTransitions([{
    index: 8,
    type: "DECISION_RESOLVED",
    source: { kind: "command", id: "CHOOSE_OPTION" },
    beforeHash: "before",
    afterHash: "after",
    payload: { lifecycle: [
      { type: "REWARD_GAINED", rewardId: "reward.test", rewardName: "Test Reward" },
      { type: "REWARD_HERCULES_DICE_EFFECT", rewardId: "reward.test", delta: 1 },
      { type: "REWARD_DIVINITY_EFFECT", rewardId: "reward.test", delta: 2 }
    ] }
  }]);
  assert.equal(events[0].detail, "No active ability. Immediate: +1 Hercules die · +2 Divinity.");
});
