import { useEffect, useMemo, useState, type DragEvent } from "react";
import { HerculesEngine, type LegalTarget } from "../engine/api.js";
import type { EngineCommand } from "../engine/commands/types.js";
import type { Difficulty, GameState } from "../engine/state/types.js";
import "./playtest.css";

const SAVE_KEY = "hercules-12-labors.playtest.save.v1";
let fallbackSeedCounter = 0;
const randomSeed = (): string => { const values = new Uint32Array(2); if (globalThis.crypto?.getRandomValues) { globalThis.crypto.getRandomValues(values); return `playtest-${values[0].toString(36)}-${values[1].toString(36)}`; } fallbackSeedCounter += 1; return `playtest-${Date.now().toString(36)}-${fallbackSeedCounter.toString(36)}`; };
const freshGame = () => HerculesEngine.createGame({ difficulty: "human", seed: randomSeed() }).state;
const persistGame = (state: GameState): boolean => { try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(HerculesEngine.serialize(state))); return true; } catch { return false; } };
const loadGame = (): { state: GameState; restored: boolean } => { try { const saved = window.localStorage.getItem(SAVE_KEY); return saved ? { state: HerculesEngine.deserialize(JSON.parse(saved)), restored: true } : { state: freshGame(), restored: false }; } catch { window.localStorage.removeItem(SAVE_KEY); return { state: freshGame(), restored: false }; } };
const download = (name: string, value: unknown) => { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };
const dieLabel = (id: string) => id.replace(/^labor\.L\d+\./, "").replace(/-D\d+$/, " copy");
const titleCase = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());

function Die({ id, face, selected, disabled, state, onSelect, onDragStart }: { id: string; face: number | null; selected: boolean; disabled: boolean; state: string; onSelect: () => void; onDragStart: () => void }) {
  return <button className={`die-tile ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`} disabled={disabled} draggable={!disabled} onClick={onSelect} onDragStart={onDragStart} aria-label={`${dieLabel(id)}, ${face ?? "unrolled"}, ${state}`}><span>{dieLabel(id)}</span><strong>{face ?? "—"}</strong><small>{state}</small></button>;
}

function App() {
  const [loaded] = useState(loadGame);
  const [state, setState] = useState<GameState>(loaded.state);
  const [difficulty, setDifficulty] = useState<Difficulty>(loaded.state.game.difficulty);
  const [seed, setSeed] = useState(loaded.state.rng.seed);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [debug, setDebug] = useState(false);
  const [message, setMessage] = useState(loaded.restored ? "Resumed your saved game." : "Ready to begin your journey.");
  const model = useMemo(() => HerculesEngine.getGameplayScreenModel(state, selectedIds), [state, selectedIds]);
  const { view } = model;
  const phaseAllowsSelection = view.game.phase === "BLUE_ABILITY_WINDOW" || view.game.phase === "GOLD_AND_ATTACK_PLACEMENT";
  const physicalDice = Object.values(view.dice).filter(die => die.availableForLabor);
  const selectedTarget = model.legalTargets.find(target => target.id === targetId) ?? null;
  const targetById = (id: string) => model.legalTargets.find(target => target.id === id);
  const submit = (command: EngineCommand) => { try { const result = HerculesEngine.submit(state, command); setState(result.state); persistGame(result.state); setSelectedIds([]); setTargetId(null); setMessage(`${titleCase(result.transitions.at(-1)?.type ?? "Action complete")}.`); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const start = (nextSeed = randomSeed()) => { const next = HerculesEngine.createGame({ difficulty, seed: nextSeed }).state; setSeed(nextSeed); setState(next); persistGame(next); setSelectedIds([]); setTargetId(null); setMessage(`New game created with seed ${nextSeed}.`); };
  useEffect(() => { persistGame(state); }, [state]);
  const toggle = (id: string) => { if (!phaseAllowsSelection) return; setTargetId(null); setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); };
  const beginDrag = (id: string) => { if (!selectedIds.includes(id)) setSelectedIds([id]); setTargetId(null); };
  const drop = (event: DragEvent, target: LegalTarget | undefined) => { event.preventDefault(); if (!target) return; if (target.commands.length === 1) submit(target.commands[0]); else setTargetId(target.id); };
  const ctaAction = () => { if (model.phaseCta === "UNSELECT") { setSelectedIds([]); setTargetId(null); return; } const id = model.phaseCta === "ROLL" ? "roll" : model.phaseCta === "FINISH_BLUE" ? "finish-blue" : model.phaseCta === "RESOLVE_ASSIGNMENTS" ? "resolve" : null; const action = view.actions.find(entry => entry.id === id); if (action) submit(action.command); };
  const active = (id: string) => !!targetById(id);
  const tileDropProps = (id: string) => ({ onDragOver: (event: DragEvent) => { if (active(id)) event.preventDefault(); }, onDrop: (event: DragEvent) => drop(event, targetById(id)) });
  const moodStatus = view.mood.name ? `${view.mood.name}${view.mood.effect ? ` · ${view.mood.effect}` : ""}` : "No active Mood";
  const abilityTiles = (title: string, summary: string, tone: "blue" | "reward"): Array<{ id: string; title: string; subtitle: string; tone: "blue" | "reward"; target: LegalTarget | null }> => {
    const targets = model.legalTargets.filter(target => target.label === title);
    return targets.length ? targets.map(target => ({ id: target.id, title, subtitle: summary, tone, target })) : [{ id: `card:${title}`, title, subtitle: summary, tone, target: null }];
  };
  const actionTiles = [
    ...abilityTiles("Bow", "Blue ability", "blue"),
    ...view.rewards.flatMap(reward => abilityTiles(reward.name, reward.summary, "reward")),
    ...(view.mood.id === "mood.ferocious" ? abilityTiles("Ferocious", "Blue: set any die", "blue") : [])
  ];
  const decisionTitle = view.pendingDecision?.type === "CHOOSE_REWARD" ? "Choose a Reward" : view.pendingDecision?.prompt;

  return <main className="gameplay-shell">
    <header className="status-strip"><div className="brand"><span>HERCULES</span><b>12 Labors</b></div><div className="resources" aria-label="Resources"><span title="Spirit">♥ <b>{view.player.spirit}</b></span><span title="Divinity">✦ <b>{view.player.divinity}</b></span></div><div className="labor-status"><small>Labor {view.labor?.id.match(/\d+/)?.[0] ?? "—"}</small><b>{view.labor?.name ?? "Preparing"}</b></div><button className="mood-status" title={moodStatus} aria-label={moodStatus}>☾</button><button className="menu-button" aria-label="Open game menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>☰</button></header>
    <section className="forecast-strip" aria-live="polite">{model.forecast.neutral ? <span>Forecast updates as you commit placements.</span> : model.forecast.entries.map(entry => <span key={entry.id}>{entry.id === "attack" ? "⚔" : entry.id === "block" ? "🛡" : entry.id === "spirit" ? "♥" : "✦"} {entry.value > 0 && entry.id !== "attack" ? "+" : ""}{entry.value} {entry.label}</span>)}{state.currentLabor?.cannotBlockThisRound && <span className="cannot-block">🛡̸ Cannot Block</span>}</section>
    {menuOpen && <aside className="game-menu" aria-label="Game menu"><label>Difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>{(["human", "hero", "god"] as Difficulty[]).map(value => <option key={value}>{value}</option>)}</select></label><label>Seed<input value={seed} onChange={event => setSeed(event.target.value)} /></label><button onClick={() => start(seed)}>Start this seed</button><button onClick={() => start()}>New random game</button><button onClick={() => download("hercules-diagnostics.json", HerculesEngine.exportDiagnostics(state))}>Export diagnostics</button><button onClick={() => setDebug(value => !value)}>{debug ? "Hide" : "Show"} debug</button></aside>}
    <p className="game-message" role="status">{message}</p>
    <section className="action-grid" aria-label="Action grid">
      <article className={`labor-tile panes-${view.labor?.dice.length ?? 1}`}><div className="labor-tile-heading"><span>Labor</span><small>{view.game.phase === "BLUE_ABILITY_WINDOW" ? "Attack after Blue" : "Place attacks"}</small></div><div className="labor-panes">{view.labor?.dice.map(die => { const id = `attack:${die.id}`; const legal = active(id); const assigned = state.round.attackAllocations.filter(allocation => allocation.targetId === die.id || allocation.targetId === "__all_active_targets__"); return <button key={die.id} className={`labor-pane ${legal ? "is-legal" : ""} ${die.status !== "active" ? "is-defeated" : ""}`} disabled={!legal} {...tileDropProps(id)} onClick={() => legal && (targetById(id)!.commands.length === 1 ? submit(targetById(id)!.commands[0]) : setTargetId(id))}><span>{dieLabel(die.id)}</span><b>{die.health}/{die.startingHealth}</b><small>{die.attack}</small>{assigned.length > 0 && <em>{assigned.map(bundle => [...bundle.dieIds, ...bundle.contributionIds].map(dieLabel).join(" + ")).join(" · ")}</em>}</button>; }) ?? <p>Labor is preparing…</p>}</div></article>
      {actionTiles.map(tile => { const target = tile.target; const legal = !!target; return <button key={tile.id} className={`action-tile ${tile.tone} ${legal ? "is-legal" : ""}`} disabled={!legal} title={legal ? "Use selected dice here" : view.game.phase === "BLUE_ABILITY_WINDOW" ? "Select an eligible die first" : "Available during the Blue phase"} {...(target ? tileDropProps(target.id) : {})} onClick={() => target && (target.commands.length === 1 ? submit(target.commands[0]) : setTargetId(target.id))}><span className="ability-square">{tile.tone === "blue" ? "◆" : "✦"}</span><b>{tile.title}</b><small>{tile.subtitle}</small></button>; })}
    </section>
    <section className="bottom-rail"><button className="undo-button" disabled={!model.undoAvailable} onClick={() => submit({ type: "UNDO_DETERMINISTIC" })}>↶<span>Undo</span></button><div className="dice-tray" aria-label="Hercules dice">{physicalDice.map(die => <Die key={die.id} id={die.id} face={die.face} selected={selectedIds.includes(die.id)} disabled={!phaseAllowsSelection || die.face === null || die.broken || die.spent || die.locked || die.allocated} state={die.allocated ? "attack" : die.locked ? "gold" : die.spent ? "spent" : die.blueUsed ? "blue used" : die.rollable ? "ready" : "unavailable"} onSelect={() => toggle(die.id)} onDragStart={() => beginDrag(die.id)} />)}{view.derivedContributions.map(die => <Die key={die.id} id={die.id} face={die.face} selected={selectedIds.includes(die.id)} disabled={!phaseAllowsSelection || die.allocated} state={die.allocated ? "used" : `copy of ${die.sourceDieId}`} onSelect={() => toggle(die.id)} onDragStart={() => beginDrag(die.id)} />)}</div><button className="phase-cta" disabled={!model.phaseCta} onClick={ctaAction}>{model.phaseCta === "UNSELECT" ? "Unselect" : model.phaseCta === "FINISH_BLUE" ? "Finish Blue" : model.phaseCta === "RESOLVE_ASSIGNMENTS" ? "Resolve" : "Roll"}</button></section>
    {selectedIds.length > 0 && <p className="selection-note">Selected: {selectedIds.map(dieLabel).join(", ")}. {model.legalTargets.length ? "Highlighted targets are engine-legal." : "No engine-legal action uses this exact selection."}</p>}
    {selectedTarget && <section className="choice-sheet" role="dialog" aria-label={selectedTarget.label}><button className="choice-close" onClick={() => setTargetId(null)}>×</button><h2>{selectedTarget.label}</h2><p>Choose the certified action for this selection.</p>{selectedTarget.commands.map((command, index) => <button key={index} onClick={() => submit(command)}>{command.type === "USE_BLUE_ABILITY" && command.target !== undefined ? `Set to ${command.target}` : command.type === "USE_COWS_A" ? `Set ${dieLabel(command.targetDieId)} to ${command.face}` : command.type === "USE_COWS_B" ? `Reroll ${command.rerollDieIds.map(dieLabel).join(", ")}` : "Confirm placement"}</button>)}</section>}
    {view.pendingDecision && <section className="choice-sheet decision-sheet" role="dialog" aria-label={decisionTitle}><h2>{decisionTitle}</h2><p>{view.pendingDecision.prompt}</p>{view.actions.filter(action => action.group === "decision").map(action => <button key={action.id} onClick={() => submit(action.command)}>{action.label}</button>)}</section>}
    {view.game.result && <section className={`end-state ${view.game.result}`} role="dialog"><p>{view.game.result === "victory" ? "HERCULES' ASCENSION" : "YOUR JOURNEY IS OVER"}</p><h1>{view.game.result === "victory" ? "VICTORY" : "You have failed."}</h1><button onClick={() => start()}>New Game</button></section>}
    {debug && <section className="debug-panel"><h2>Canonical diagnostics</h2><pre>{JSON.stringify(HerculesEngine.exportDiagnostics(state), null, 2)}</pre></section>}
  </main>;
}

export { App };
