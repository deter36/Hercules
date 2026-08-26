import { createHash } from "node:crypto";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  path: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  contentHash: string;
}

type JsonRecord = Record<string, unknown>;

const PROVENANCE_STATUSES = new Set([
  "verified",
  "owner_verified",
  "source_conflicted",
  "provisional_owner_approved",
  "unresolved",
]);

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const canonicalJson = (value: unknown): string => JSON.stringify(value);

export const contentHash = (data: unknown): string =>
  createHash("sha256").update(canonicalJson(data)).digest("hex");

export function validateGameData(data: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];
  const error = (code: string, path: string, message: string) =>
    issues.push({ severity: "error", code, path, message });

  if (!isRecord(data)) {
    error("ROOT_NOT_OBJECT", "$", "Game data must be an object.");
    return { valid: false, issues, contentHash: contentHash(data) };
  }

  for (const key of ["schema_version", "game_id", "source_manifest", "difficulty", "components", "moods", "labors"]) {
    if (!(key in data)) error("MISSING_ROOT_FIELD", `$.${key}`, "Required root field is missing.");
  }

  if (typeof data.schema_version !== "string" || !data.schema_version.trim()) {
    error("INVALID_SCHEMA_VERSION", "$.schema_version", "schema_version must be a non-empty string.");
  }
  if (!isRecord(data.source_manifest)) {
    error("INVALID_SOURCE_MANIFEST", "$.source_manifest", "source_manifest must be an object.");
  } else {
    for (const key of ["rules_authority", "gameplay_reference", "execution_spec", "rng_spec"]) {
      if (typeof data.source_manifest[key] !== "string" || !data.source_manifest[key]) {
        error("MISSING_SOURCE_REFERENCE", `$.source_manifest.${key}`, "A source authority reference is required.");
      }
    }
  }

  const moods = Array.isArray(data.moods) ? data.moods : [];
  if (!Array.isArray(data.moods)) error("INVALID_MOODS", "$.moods", "moods must be an array.");
  const moodIds = new Set<string>();
  for (const [index, mood] of moods.entries()) {
    const path = `$.moods[${index}]`;
    if (!isRecord(mood)) { error("INVALID_MOOD", path, "Mood must be an object."); continue; }
    validateSourceRecord(mood, path, error);
    addUniqueId(mood.id, moodIds, `${path}.id`, "MOOD", error);
    if (!isRecord(mood.effect)) error("INVALID_MOOD_EFFECT", `${path}.effect`, "Mood requires a structured effect.");
    else validateMoodEffect(mood.effect, `${path}.effect`, error);
  }

  const difficulty = isRecord(data.difficulty) ? data.difficulty : {};
  for (const id of ["human", "hero", "god"]) {
    const definition = difficulty[id];
    if (!isRecord(definition)) { error("MISSING_DIFFICULTY", `$.difficulty.${id}`, "Difficulty definition is required."); continue; }
    if (!Number.isInteger(definition.starting_hercules_dice) || (definition.starting_hercules_dice as number) < 1) {
      error("INVALID_STARTING_DICE", `$.difficulty.${id}.starting_hercules_dice`, "Starting Hercules dice must be a positive integer.");
    }
    const removed = definition.remove_moods;
    if (!Array.isArray(removed)) error("INVALID_REMOVED_MOODS", `$.difficulty.${id}.remove_moods`, "remove_moods must be an array.");
    else for (const moodId of removed) if (typeof moodId !== "string" || !moodIds.has(moodId)) error("UNKNOWN_MOOD_REFERENCE", `$.difficulty.${id}.remove_moods`, `Unknown mood '${String(moodId)}'.`);
  }

  const components = isRecord(data.components) ? data.components : {};
  const physicalDieIds = new Set<string>();
  const herculesDice = Array.isArray(components.hercules_dice) ? components.hercules_dice : [];
  for (const [index, die] of herculesDice.entries()) {
    if (!isRecord(die)) { error("INVALID_HERCULES_DIE", `$.components.hercules_dice[${index}]`, "Die must be an object."); continue; }
    addUniqueId(die.id, physicalDieIds, `$.components.hercules_dice[${index}].id`, "HERCULES_DIE", error);
  }

  const labors = Array.isArray(data.labors) ? data.labors : [];
  if (!Array.isArray(data.labors)) error("INVALID_LABORS", "$.labors", "labors must be an array.");
  if (labors.length !== 12) error("LABOR_COUNT", "$.labors", `Expected 12 Labors, found ${labors.length}.`);
  const laborIds = new Set<string>();
  const laborNumbers = new Set<number>();
  for (const [index, labor] of labors.entries()) {
    const path = `$.labors[${index}]`;
    if (!isRecord(labor)) { error("INVALID_LABOR", path, "Labor must be an object."); continue; }
    validateSourceRecord(labor, path, error, true);
    addUniqueId(labor.id, laborIds, `${path}.id`, "LABOR", error);
    if (!Number.isInteger(labor.number) || labor.number as number < 1 || laborNumbers.has(labor.number as number)) error("INVALID_LABOR_NUMBER", `${path}.number`, "Labor number must be unique and positive.");
    else laborNumbers.add(labor.number as number);
    validateLabor(labor, path, error);
  }
  for (let number = 1; number <= 12; number += 1) if (!laborNumbers.has(number)) error("MISSING_LABOR_NUMBER", "$.labors", `Labor ${number} is missing.`);

  return { valid: !issues.some((issue) => issue.severity === "error"), issues, contentHash: contentHash(data) };
}

function validateSourceRecord(record: JsonRecord, path: string, error: (code: string, path: string, message: string) => void, allowExtendedStatus = false): void {
  if (typeof record.provenance !== "string" || !record.provenance) error("MISSING_PROVENANCE", `${path}.provenance`, "Source provenance is required.");
  if (typeof record.status !== "string" || (!PROVENANCE_STATUSES.has(record.status) && !(allowExtendedStatus && record.status.startsWith("owner_verified_except_")))) {
    error("INVALID_VERIFICATION_STATUS", `${path}.status`, `Unsupported verification status '${String(record.status)}'.`);
  }
  if (record.status === "unresolved") error("UNRESOLVED_CONTENT", `${path}.status`, "Unresolved content cannot enter a certified build.");
}

function addUniqueId(value: unknown, ids: Set<string>, path: string, family: string, error: (code: string, path: string, message: string) => void): void {
  if (typeof value !== "string" || !value) { error("INVALID_ID", path, `${family} ID must be a non-empty string.`); return; }
  if (ids.has(value)) error("DUPLICATE_ID", path, `Duplicate ${family} ID '${value}'.`);
  ids.add(value);
}

function validateLabor(labor: JsonRecord, path: string, error: (code: string, path: string, message: string) => void): void {
  if (!isRecord(labor.tracks)) { error("INVALID_TRACKS", `${path}.tracks`, "Labor tracks must be an object."); return; }
  const tracks = labor.tracks;
  const trackIds = new Set(Object.keys(tracks));
  const nodeIds = new Set<string>();
  for (const [trackId, track] of Object.entries(tracks)) {
    const trackPath = `${path}.tracks.${trackId}`;
    if (!isRecord(track)) { error("INVALID_TRACK", trackPath, "Track must be an object."); continue; }
    const entries = trackNodes(track.nodes);
    if (!entries || entries.length === 0) { error("INVALID_TRACK", trackPath, "Track requires a non-empty node array or ID-keyed node map."); continue; }
    const localNodeIds = new Set<string>();
    for (const [nodeId, node, nodePath] of entries) {
      if (!node) { error("INVALID_NODE", nodePath, "Track node must be an object."); continue; }
      addUniqueId(nodeId, localNodeIds, `${nodePath}.id`, "NODE", error);
      if (nodeIds.has(nodeId)) error("DUPLICATE_NODE_ID", `${nodePath}.id`, `Node ID '${nodeId}' occurs more than once in this Labor.`);
      nodeIds.add(nodeId);
      if (isRecord(track.nodes) && node.id !== undefined && node.id !== nodeId) {
        error("NODE_KEY_ID_MISMATCH", `${nodePath}.id`, `Node map key '${nodeId}' does not match embedded node ID '${String(node.id)}'.`);
      }
    }
    for (const [, node, nodePath] of entries) {
      if (!node || node.next === undefined) continue;
      if (!Array.isArray(node.next)) { error("INVALID_EDGE_LIST", `${nodePath}.next`, "next must be an array."); continue; }
      for (const destination of node.next) if (typeof destination !== "string" || !localNodeIds.has(destination)) error("UNKNOWN_TRACK_EDGE", `${nodePath}.next`, `Edge references unknown node '${String(destination)}'.`);
    }
  }
  for (const [dieIndex, die] of (Array.isArray(labor.labor_dice) ? labor.labor_dice : []).entries()) {
    const diePath = `${path}.labor_dice[${dieIndex}]`;
    if (!isRecord(die)) { error("INVALID_LABOR_DIE", diePath, "Labor die must be an object."); continue; }
    if (!Number.isInteger(die.start_health) || (die.start_health as number) <= 0) error("INVALID_START_HEALTH", `${diePath}.start_health`, "Starting health must be positive.");
    if (die.track_id !== undefined && (typeof die.track_id !== "string" || !trackIds.has(die.track_id))) error("UNKNOWN_TRACK_REFERENCE", `${diePath}.track_id`, `Unknown track '${String(die.track_id)}'.`);
  }
  if (labor.id === "labor.L03") validateHindRule(labor.failure_rule, `${path}.failure_rule`, error);
}

function trackNodes(value: unknown): Array<[string, JsonRecord | null, string]> | null {
  if (Array.isArray(value)) return value.map((node, index) => [isRecord(node) && typeof node.id === "string" ? node.id : "", isRecord(node) ? node : null, `nodes[${index}]`]);
  if (isRecord(value)) return Object.entries(value).map(([id, node]) => [id, isRecord(node) ? node : null, `nodes.${id}`]);
  return null;
}

function validateHindRule(rule: unknown, path: string, error: (code: string, path: string, message: string) => void): void {
  if (!isRecord(rule)) { error("MISSING_HIND_FAILURE_RULE", path, "Hind requires an explicit provisional failure rule."); return; }
  if (rule.type !== "usable_hercules_dice_below_threshold" || rule.threshold !== 2 || rule.condition !== "hind_undefeated" || rule.timing !== "immediate_after_any_state_change_that_reduces_usable_dice") {
    error("INVALID_HIND_FAILURE_RULE", path, "Hind failure rule must be the owner-approved below-two-usable-dice rule with immediate timing.");
  }
  if (rule.status !== "provisional_owner_approved") error("INVALID_HIND_RULE_STATUS", `${path}.status`, "Hind failure rule must remain explicitly provisional_owner_approved.");
}

function validateMoodEffect(effect: JsonRecord, path: string, error: (code: string, path: string, message: string) => void): void {
  if (effect.type === "temporary_dice_delta") {
    if (!Number.isInteger(effect.value) || effect.value === 0) error("INVALID_TEMPORARY_DICE_DELTA", `${path}.value`, "Temporary dice delta must be a non-zero integer.");
    const expected = (effect.value as number) > 0 ? "lowest_unused_ids_first" : "highest_available_ids_first";
    if (effect.physical_id_mapping !== expected) error("INVALID_TEMPORARY_DICE_MAPPING", `${path}.physical_id_mapping`, `Expected '${expected}' for this temporary dice delta.`);
    if (effect.player_selects_physical_die !== false) error("INVALID_TEMPORARY_DICE_SELECTION", `${path}.player_selects_physical_die`, "Count-only temporary dice effects must not create a physical-die choice.");
  }
  if (effect.type === "player_choice" && Array.isArray(effect.options) && effect.options.some((option) => isRecord(option) && typeof option.temporary_dice_delta === "number")) {
    if (effect.die_loss_option_physical_id_mapping !== "highest_available_ids_first") error("INVALID_PLAYER_CHOICE_DICE_MAPPING", `${path}.die_loss_option_physical_id_mapping`, "Count-only die-loss choice must remove the highest available IDs first.");
    if (effect.player_selects_physical_die_after_choosing_option !== false) error("INVALID_PLAYER_CHOICE_DICE_SELECTION", `${path}.player_selects_physical_die_after_choosing_option`, "The choice selects the cost, not a physical die ID.");
  }
}
