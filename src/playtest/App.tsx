import { useMemo, useState } from "react";
import { HerculesEngine } from "../engine/api.js";
import type { PlayControl } from "../engine/api.js";
import type { EngineCommand } from "../engine/commands/types.js";
import type { Difficulty, GameState } from "../engine/state/types.js";

const initial = HerculesEngine.createGame({ difficulty: "human", seed: "playtest-seed" }).state;
const download = (name: string, value: unknown) => { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };

export function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>("human");
  const [seed, setSeed] = useState("playtest-seed");
  const [state, setState] = useState<GameState>(initial);
  const [message, setMessage] = useState("Ready to begin a deterministic playtest.");
  const [debug, setDebug] = useState(false);
  const [activeAbilityId, setActiveAbilityId] = useState<string | null>(null);
  const [abilitySteps, setAbilitySteps] = useState<PlayControl[][]>([]);
  const view = useMemo(() => HerculesEngine.getPlayView(state), [state]);
  const submit = (command: EngineCommand) => { try { const result = HerculesEngine.submit(state, command); setState(result.state); setActiveAbilityId(null); setAbilitySteps([]); setMessage(`${result.transitions.at(-1)?.type ?? "Action complete"}.`); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const start = () => { try { const result = HerculesEngine.createGame({ difficulty, seed }); setState(result.state); setActiveAbilityId(null); setAbilitySteps([]); setMessage("New game created."); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const grouped = (group: string) => view.actions.filter(action => action.group === group);
  const activeAbility = view.blueAbilities.find(ability => ability.id === activeAbilityId) ?? null;
  const currentAbilityChoices = abilitySteps.at(-1) ?? activeAbility?.choices ?? [];
  const chooseAbility = (id: string) => { setActiveAbilityId(id); setAbilitySteps([]); };
  const chooseAbilityControl = (control: PlayControl) => { if (control.command) submit(control.command); else if (control.choices) setAbilitySteps(steps => [...steps, control.choices!]); };
  return <main>
    <header><div><p className="eyebrow">ENGINE PLAYTEST</p><h1>Hercules &amp; the 12 Labors</h1></div><div className="status"><span>{view.game.phase}</span><strong>{view.game.result?.toUpperCase() ?? "IN PROGRESS"}</strong></div></header>
    <section className="setup card"><label>Difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>{(["human", "hero", "god"] as Difficulty[]).map(value => <option key={value}>{value}</option>)}</select></label><label>Seed<input value={seed} onChange={event => setSeed(event.target.value)} /></label><button onClick={start}>New game</button><button className="quiet" onClick={() => setDebug(value => !value)}>{debug ? "Hide" : "Show"} debug</button><button className="quiet" onClick={() => download("hercules-diagnostics.json", HerculesEngine.exportDiagnostics(state))}>Export diagnostics</button></section>
    <p className="message" role="status">{message}</p>
    <section className="dashboard">
      <article className="card"><h2>Hercules</h2><div className="resources"><span>Spirit <b>{view.player.spirit}</b></span><span>Divinity <b>{view.player.divinity}</b></span></div><div className="dice">{Object.values(view.dice).map(die => <div className={`die ${die.broken ? "broken" : ""} ${die.allocated || die.locked || die.spent ? "used" : ""}`} key={die.id}><b>{die.id}</b><strong>{die.face ?? "—"}</strong><small>{die.broken ? "broken" : die.allocated ? "attack" : die.locked ? "gold" : die.spent ? "spent" : die.blueUsed ? "blue used" : die.rollable ? "ready" : "unavailable"}</small></div>)}</div><h3>Rewards</h3><p>{view.rewards.length ? view.rewards.map(reward => reward.name).join(" · ") : "None yet"}</p></article>
      <article className="card"><h2>Labor</h2>{view.labor ? <><h3>{view.labor.name}</h3><p>Mood: {view.mood.name ?? "—"}</p>{view.labor.dice.map(die => <div className="labor-die" key={die.id}><b>{die.id}</b><span>Health {die.health}/{die.startingHealth}</span><span>{die.trackId} · {die.nodeId}</span><small>{die.status}{die.nodeEffect ? ` · ${JSON.stringify(die.nodeEffect)}` : ""}</small></div>)}</> : <p>Preparing the first Labor…</p>}</article>
      <article className="card controls"><h2>Actions</h2>{view.pendingDecision && <><h3>{view.pendingDecision.prompt}</h3><p>{view.pendingDecision.type}</p></>}{view.blueAbilities.length > 0 && <div className="ability-panel"><h3>Blue abilities</h3><div className="ability-list">{view.blueAbilities.map(ability => <button className={ability.id === activeAbilityId ? "selected" : "quiet"} key={ability.id} onClick={() => chooseAbility(ability.id)}>{ability.label}</button>)}</div>{activeAbility && <div className="ability-choices"><p>{abilitySteps.length ? "Choose the remaining option" : "Choose a die"}</p>{abilitySteps.length > 0 && <button className="quiet back" onClick={() => setAbilitySteps(steps => steps.slice(0, -1))}>Back</button>}{currentAbilityChoices.map(control => <button key={control.id} onClick={() => chooseAbilityControl(control)}>{control.label}</button>)}</div>}</div>}{(["round", "placement", "decision", "utility"] as const).map(group => grouped(group).length ? <div className="action-group" key={group}><h3>{group}</h3>{grouped(group).map(action => <button key={action.id} onClick={() => submit(action.command)}>{action.label}</button>)}</div> : null)}{view.actions.length === 0 && <p>No engine-provided action is available.</p>}</article>
    </section>
    <section className="card history"><h2>Transition history</h2><ol>{view.transitions.slice(-12).reverse().map(transition => <li key={transition.index}><b>{transition.index}</b> {transition.type} <small>{transition.source.id}</small></li>)}</ol></section>
    {debug && <section className="debug"><article className="card"><h2>Canonical state</h2><pre>{HerculesEngine.exportDiagnostics(state).canonicalState}</pre></article><article className="card"><h2>Diagnostics</h2><pre>{JSON.stringify(HerculesEngine.exportDiagnostics(state), null, 2)}</pre></article></section>}
  </main>;
}
