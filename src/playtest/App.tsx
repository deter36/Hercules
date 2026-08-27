import { useEffect, useMemo, useState } from "react";
import { HerculesEngine } from "../engine/api.js";
import type { EngineCommand } from "../engine/commands/types.js";
import type { Difficulty, GameState } from "../engine/state/types.js";
import "./tracks.css";
import "./qol.css";
import "./hind-arrow.css";

const SAVE_KEY = "hercules-12-labors.playtest.save.v1";
const freshGame = () => HerculesEngine.createGame({ difficulty: "human", seed: "playtest-seed" }).state;
const persistGame = (state: GameState): boolean => {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(HerculesEngine.serialize(state))); return true; }
  catch { return false; }
};
const loadGame = (): { state: GameState; restored: boolean } => {
  if (typeof window === "undefined") return { state: freshGame(), restored: false };
  try {
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (!saved) return { state: freshGame(), restored: false };
    return { state: HerculesEngine.deserialize(JSON.parse(saved)), restored: true };
  } catch {
    // A changed content revision or malformed local data must never prevent play.
    window.localStorage.removeItem(SAVE_KEY);
    return { state: freshGame(), restored: false };
  }
};
const download = (name: string, value: unknown) => { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };
type LaborView = NonNullable<ReturnType<typeof HerculesEngine.getPlayView>["labor"]>;
const effectMark = (effect: unknown): string => { if (!effect || typeof effect !== "object") return "Start"; const value = effect as Record<string, unknown>; if (value.failure) return "☠"; if (value.break_hercules_die) return "⚡"; if (value.divinity_delta) return "✦−"; if (value.cannot_block) return "🛡̸"; if (value.heal && value.spirit_delta) return "♥−🔥"; if (value.heal) return `🔥${Number(value.heal) > 1 ? value.heal : ""}`; if (value.spirit_delta) return `♥−${Math.abs(Number(value.spirit_delta)) > 1 ? Math.abs(Number(value.spirit_delta)) : ""}`; return "•"; };
const historyText = (transition: { type: string; payload: Record<string, unknown> }): string => { const payload = transition.payload; const spirit = payload.spirit as { before: number | string; after: number | string } | undefined; const divinity = payload.divinity as { before: number | string; after: number | string } | undefined; const parts = [transition.type.replaceAll("_", " ").toLowerCase()]; if (spirit && spirit.before !== spirit.after) parts.push(`Spirit ${spirit.before} → ${spirit.after}`); if (divinity && divinity.before !== divinity.after) parts.push(`Divinity ${divinity.before} → ${divinity.after}`); const attack = payload.attack as { targetId: string; dieIds: string[] } | undefined; if (attack) parts.push(`attack ${attack.targetId} with ${attack.dieIds.join(", ")}`); if (typeof payload.goldAbilityId === "string") parts.push(`gold: ${payload.goldAbilityId}`); const lifecycle = payload.lifecycle as Array<{ type: string; laborId?: string; rewardName?: string; moodName?: string; delta?: number }> | undefined; for (const event of lifecycle ?? []) { if (event.type === "LABOR_DEFEATED") parts.push(`Labor defeated: ${event.laborId}`); if (event.type === "REWARD_GAINED") parts.push(`Reward: ${event.rewardName ?? event.type}`); if (event.type === "REWARD_SPIRIT_EFFECT") parts.push(`Reward Spirit ${event.delta! >= 0 ? "+" : ""}${event.delta}`); if (event.type === "LABOR_STARTED") parts.push(`Labor begins: ${event.laborId}`); if (event.type === "MOOD_REVEALED") parts.push(`Mood: ${event.moodName ?? event.type}`); if (event.type === "MOOD_SPIRIT_EFFECT") parts.push(`Mood Spirit ${event.delta! >= 0 ? "+" : ""}${event.delta}`); } return parts.join(" · "); };
function LaborTracks({ labor }: { labor: LaborView }) { return <div className={`labor-tracks ${labor.tracks.length > 1 ? "multi" : ""}`}>{labor.tracks.map(track => <section className={`labor-track ${track.type}`} key={track.id}><h4>{labor.tracks.length > 1 ? track.id.replace("track.", "") : "Track"}</h4><div className="track-grid">{track.nodes.map(node => { const occupants = labor.dice.filter(die => die.trackId === track.id && die.nodeId === node.id && die.status === "active"); return <div className={`track-node ${occupants.length ? "occupied" : ""} ${node.id === track.startId ? "start-node" : ""}`} key={node.id}><b>{node.id}</b><span>{effectMark(node.effect)}</span>{occupants.map(die => <i key={die.id} title={`${die.id}: ${die.health}/${die.startingHealth}`}>{die.id.replace(/^labor\.L\d+\./, "")}</i>)}{node.next.length > 0 && <small>→ {node.next.join(" · ")}</small>}</div>; })}</div></section>)}</div>; }

export function App() {
  const [loadedGame] = useState(loadGame);
  const [difficulty, setDifficulty] = useState<Difficulty>(loadedGame.state.game.difficulty);
  const [seed, setSeed] = useState(loadedGame.state.rng.seed);
  const [state, setState] = useState<GameState>(loadedGame.state);
  const [message, setMessage] = useState(loadedGame.restored ? "Resumed your saved game." : "Ready to begin a deterministic playtest.");
  const [debug, setDebug] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [selectedDieIds, setSelectedDieIds] = useState<string[]>([]);
  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(null);
  const [saveAvailable, setSaveAvailable] = useState(true);
  const view = useMemo(() => HerculesEngine.getPlayView(state), [state]);
  const availableDice = Object.values(view.dice).filter(die => die.availableForLabor);
  const submit = (command: EngineCommand) => { try { const result = HerculesEngine.submit(state, command); setSaveAvailable(persistGame(result.state)); setState(result.state); setSelectedDieIds([]); setSelectedActionKey(null); setMessage(`${result.transitions.at(-1)?.type ?? "Action complete"}.`); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const start = () => { try { const result = HerculesEngine.createGame({ difficulty, seed }); setSaveAvailable(persistGame(result.state)); setState(result.state); setSelectedDieIds([]); setSelectedActionKey(null); setMessage("New game created."); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const copyDiagnostics = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(HerculesEngine.exportDiagnostics(state))); setMessage("Diagnostics copied. Paste them into this chat message."); }
    catch { setMessage("Could not copy diagnostics. Your browser may block clipboard access."); }
  };
  const grouped = (group: string) => view.actions.filter(action => action.group === group);
  const actionDice = (command: EngineCommand): string[] => {
    if (command.type === "USE_BLUE_ABILITY") return [command.sourceDieId];
    if (command.type === "REROLL_DIE") return [command.dieId];
    if (command.type === "USE_COWS_A") return [command.sourceDieId, command.targetDieId];
    if (command.type === "USE_COWS_B") return [command.sourceDieId, ...command.rerollDieIds];
    if (command.type === "PLACE_GOLD" || command.type === "ALLOCATE_ATTACK") return command.dieIds;
    return [];
  };
  const sameDice = (left: string[], right: string[]) => left.length === right.length && [...left].sort().every((id, index) => id === [...right].sort()[index]);
  const phaseAllowsSelection = view.game.phase === "BLUE_ABILITY_WINDOW" || view.game.phase === "GOLD_AND_ATTACK_PLACEMENT";
  const selectable = (die: typeof availableDice[number]) => phaseAllowsSelection && die.face !== null && !die.broken && !die.spent && !die.locked && !die.allocated;
  const selectedActions = selectedDieIds.length === 0 ? [] : view.actions.filter(action => (action.group === "blue" || action.group === "placement") && sameDice(actionDice(action.command), selectedDieIds));
  const actionGroup = (action: ReturnType<typeof grouped>[number]) => {
    if (action.command.type === "ALLOCATE_ATTACK") return { key: `attack:${action.command.targetId}`, label: `Attack ${action.command.targetId.replace(/^labor\.L\d+\./, "")}` };
    if (action.command.type === "PLACE_GOLD") return { key: `gold:${action.command.abilityId}`, label: action.label.split(":")[0] };
    if (action.command.type === "USE_BLUE_ABILITY") return { key: `blue:${action.command.abilityId}`, label: action.label.split(":")[0] };
    if (action.command.type === "REROLL_DIE") return { key: `blue:${action.command.abilityId}`, label: action.label.split(":")[0] };
    if (action.command.type === "USE_COWS_A") return { key: "blue:cows-a", label: action.label.split(":")[0] };
    if (action.command.type === "USE_COWS_B") return { key: "blue:cows-b", label: action.label.split(":")[0] };
    return { key: action.id, label: action.label };
  };
  const actionGroups = [...selectedActions.reduce((groups, action) => { const group = actionGroup(action); const existing = groups.get(group.key) ?? { ...group, actions: [] as typeof selectedActions }; existing.actions.push(action); groups.set(group.key, existing); return groups; }, new Map<string, { key: string; label: string; actions: typeof selectedActions }>()).values()];
  const chosenActionGroup = actionGroups.find(group => group.key === selectedActionKey) ?? null;
  const actionDetail = (action: ReturnType<typeof grouped>[number]) => {
    if (action.command.type === "ALLOCATE_ATTACK") return "Assign selected dice to this attack";
    if (action.command.type === "PLACE_GOLD") return "Use this gold ability";
    return action.label.replace(/^[^:]+:\s*/, "");
  };
  useEffect(() => {
    setSaveAvailable(persistGame(state));
  }, [state]);
  const toggleDie = (dieId: string) => { setSelectedActionKey(null); setSelectedDieIds(ids => ids.includes(dieId) ? ids.filter(id => id !== dieId) : [...ids, dieId]); };
  return <main>
    <header><div><p className="eyebrow">ENGINE PLAYTEST</p><h1>Hercules &amp; the 12 Labors</h1></div><div className="status"><span>{view.game.phase}</span><strong>{view.game.result?.toUpperCase() ?? "IN PROGRESS"}</strong></div></header>
    <section className="game-toolbar"><button className="new-game" onClick={start}>New game</button><section className="game-menu card"><button className="menu-toggle quiet" aria-expanded={gameMenuOpen} onClick={() => setGameMenuOpen(open => !open)}>Game menu <span>{gameMenuOpen ? "−" : "+"}</span></button>{gameMenuOpen && <div className="setup"><label>Difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>{(["human", "hero", "god"] as Difficulty[]).map(value => <option key={value}>{value}</option>)}</select></label><label>Seed<input value={seed} onChange={event => setSeed(event.target.value)} /></label><button className="quiet" onClick={() => setDebug(value => !value)}>{debug ? "Hide" : "Show"} debug</button><button className="quiet" onClick={copyDiagnostics}>Copy diagnostics</button><button className="quiet" onClick={() => download("hercules-diagnostics.json", HerculesEngine.exportDiagnostics(state))}>Export diagnostics</button></div>}</section></section>
    <p className="message" role="status">{message}{!saveAvailable && " This browser is not allowing local game saves."}</p>
    <section className="dashboard">
      <article className="card"><h2>Hercules</h2><div className="resources"><span>Spirit <b>{view.player.spirit}</b></span><span>Divinity <b>{view.player.divinity}</b></span></div>{phaseAllowsSelection && <p className="selection-help">Select dice, then choose an engine-legal action.</p>}<div className="dice">{availableDice.map(die => <button className={`die ${selectedDieIds.includes(die.id) ? "selected" : ""} ${selectable(die) ? "targetable" : ""} ${die.allocated || die.locked || die.spent ? "used" : ""}`} disabled={!selectable(die)} onClick={() => toggleDie(die.id)} key={die.id}><b>{die.id}</b><strong>{die.face ?? "—"}</strong><small>{selectedDieIds.includes(die.id) ? "selected" : die.allocated ? "attack" : die.locked ? "gold" : die.spent ? "spent" : die.blueUsed ? "blue used" : die.rollable ? "ready" : "unavailable"}</small></button>)}</div><h3>Rewards</h3><p>{view.rewards.length ? view.rewards.map(reward => reward.name).join(" · ") : "None yet"}</p></article>
      <div className="labor-stack"><article className="card"><h2>Labor</h2>{view.labor ? <><h3>{view.labor.name}</h3><p>Attack: <b>{[...new Set(view.labor.dice.map(die => die.attack))].join(" · ")}</b></p><div className="labor-health">{view.labor.dice.map(die => <span key={die.id}><b>{die.id.replace(/^labor\.L\d+\./, "")}</b> {die.health}/{die.startingHealth}</span>)}</div><LaborTracks labor={view.labor} /></> : <p>Preparing the first Labor…</p>}</article><article className="card mood-card"><h2>Current Mood</h2><h3>{view.mood.name ?? "—"}</h3>{view.mood.effect && <p className="mood-effect">{view.mood.effect}</p>}</article></div>
      <article className="card controls"><h2>Actions</h2>{view.pendingDecision && <><h3>{view.pendingDecision.prompt}</h3><p>{view.pendingDecision.type}</p></>}{phaseAllowsSelection && <div className="action-group"><h3>Selected dice</h3><p>{selectedDieIds.length ? selectedDieIds.join(", ") : "Select one or more dice in the tray."}</p>{selectedDieIds.length > 0 && <button className="quiet" onClick={() => { setSelectedDieIds([]); setSelectedActionKey(null); }}>Clear selection</button>}{selectedDieIds.length > 0 && (chosenActionGroup ? <><button className="quiet" onClick={() => setSelectedActionKey(null)}>Back to actions</button><h3>{chosenActionGroup.label}</h3>{chosenActionGroup.actions.map(action => <button key={action.id} onClick={() => submit(action.command)}>{actionDetail(action)}</button>)}</> : actionGroups.length ? actionGroups.map(group => <button key={group.key} onClick={() => setSelectedActionKey(group.key)}>{group.label}</button>) : <p>No engine-legal action uses exactly this selection.</p>)}</div>}{(["round", "decision", "utility"] as const).map(group => grouped(group).length ? <div className="action-group" key={group}><h3>{group}</h3>{grouped(group).map(action => <button key={action.id} onClick={() => submit(action.command)}>{action.label}</button>)}</div> : null)}{view.actions.length === 0 && <p>No engine-provided action is available.</p>}</article>
    </section>
    <section className="card history"><h2>Event history</h2><ol>{view.transitions.slice(-12).reverse().map(transition => <li key={transition.index}><b>{transition.index}</b> {historyText(transition)}</li>)}</ol></section>
    {debug && <section className="debug"><article className="card"><h2>Canonical state</h2><pre>{HerculesEngine.exportDiagnostics(state).canonicalState}</pre></article><article className="card"><h2>Diagnostics</h2><pre>{JSON.stringify(HerculesEngine.exportDiagnostics(state), null, 2)}</pre></article></section>}
  </main>;
}
