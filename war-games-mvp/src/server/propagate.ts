import fs from "node:fs/promises";
import path from "node:path";
import type { World, State, Edge } from "@/types/event";

type Deltas = Partial<State>;

const LAMBDA = 0.25;

function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }
function clampState(s: Partial<State>): Partial<State>{
  const out: Partial<State> = { ...s };
  const keys: (keyof State)[] = ["war_escalation","mobilization_level","political_stability","intel_leak_risk","logistics_capacity","alliances_cohesion","public_support"];
  for(const k of keys){
    if (out[k] !== undefined) out[k] = clamp01(out[k] as number);
  }
  if (typeof out.casualties_expected === "number"){
    out.casualties_expected = Math.max(0, Math.round(out.casualties_expected));
  }
  return out;
}

function addStates(a: Partial<State>, b: Partial<State>): Partial<State>{
  const out: Partial<State> = { ...a };
  for (const k of Object.keys(b) as (keyof State)[]) {
    const va = (out[k] as number|undefined) ?? 0;
    const vb = (b[k] as number|undefined) ?? 0;
    out[k] = (k === "casualties_expected") ? Math.round((va as number) + (vb as number)) : (va as number) + (vb as number);
  }
  return out;
}

function timeDecay(years:number){ return Math.exp(-LAMBDA * years); }

function mechanismFilter(mech: Edge["mechanism"], delta: Deltas): Deltas {
  const scale: Record<string, Partial<Record<keyof State, number>>> = {
    informational: { public_support:1.0, war_escalation:0.4, political_stability:0.3 },
    diplomatic:    { alliances_cohesion:1.0, political_stability:0.6, war_escalation:0.2 },
    military:      { mobilization_level:1.0, casualties_expected:1.0, war_escalation:0.7, logistics_capacity:0.3 },
    economic:      { logistics_capacity:1.0, public_support:0.3, political_stability:0.2 },
    technological: { logistics_capacity:0.8 }
  };
  const out: Deltas = {};
  for(const [k,v] of Object.entries(delta) as [keyof State, number][]) {
    const s = (scale[mech] as any)?.[k] ?? 0.2;
    out[k] = v * s;
  }
  return out;
}

function yearsBetween(a:string, b:string){
  const da = new Date(a), db = new Date(b);
  return Math.max(0, (db.getTime() - da.getTime()) / (1000*60*60*24*365));
}

function topologicalOrder(world: World): string[] {
  // Sort by date ascending; edges violating time are ignored in propagation anyway
  return Object.values(world.nodes).sort((a,b)=> a.date.localeCompare(b.date)).map(n=>n.id);
}

export async function loadWorld(): Promise<World>{
  const p = path.join(process.cwd(), "data", "wwi.json");
  const raw = await fs.readFile(p, "utf-8");
  const world = JSON.parse(raw) as World;
  return world;
}

function applyDelta(nodeState: Partial<State>, delta: Deltas): Partial<State>{
  const merged = addStates(nodeState, delta);
  return clampState(merged);
}

// very small heuristic: map headline word-changes to deltas
export function mapTextToDeltas(original: string, edited: string): Deltas {
  const text = edited.toLowerCase();
  const d: Deltas = { casualties_expected: 0 };
  function inc(key: keyof State, amt:number){ (d as any)[key] = ((d as any)[key] ?? 0) + amt; }
  // heuristic keywords
  const lowers = [
    ["assassinated","assassin","kill","massacre","slaughter","offensive","invasion","attack","u-boat","gas","mobilize","declare war"],
    ["ceasefire","armistice","truce","peace","survives","foiled","fails","withdraw","retreat","neutral","talks","negotiat"]
  ];
  for(const k of ["assassinated","assassin","kill","massacre","offensive","invasion","attack","u-boat","gas","mobilize","declare war"]){
    if (text.includes(k)){
      inc("war_escalation", 0.25);
      inc("mobilization_level", 0.2);
      (d.casualties_expected as number) += 10000;
    }
  }
  for(const k of ["ceasefire","armistice","truce","peace","survives","foiled","fails","withdraw","retreat","neutral","talks","negotiat"]){
    if (text.includes(k)){
      inc("war_escalation", -0.35);
      inc("political_stability", 0.2);
      (d.casualties_expected as number) -= 8000;
    }
  }
  if (text.includes("telegram") || text.includes("intercept") || text.includes("propaganda")){
    inc("intel_leak_risk", 0.3);
    inc("public_support", 0.15);
  }
  if (text.includes("blockade") || text.includes("supply")){
    inc("logistics_capacity", -0.2);
  }
  if (text.includes("alliance") || text.includes("joins")){
    inc("alliances_cohesion", 0.2);
  }
  // clamp casualties effect
  d.casualties_expected = Math.max(-50000, Math.min(50000, d.casualties_expected || 0));
  return d;
}

export function propagate(world: World, sourceId: string, deltas: Deltas): World {
  const out: World = JSON.parse(JSON.stringify(world)); // deep clone
  const acc: Record<string, Deltas> = { [sourceId]: deltas };

  const order = topologicalOrder(out);
  const idx: Record<string, number> = {};
  order.forEach((id,i)=>{ idx[id]=i; });

  // Ensure edges respect time direction in effect
  const edges = out.edges.filter(e => idx[e.src] <= idx[e.dst]);

  for (const id of order) {
    const localDelta = acc[id];
    if (localDelta){
      // apply to node
      out.nodes[id].state = applyDelta(out.nodes[id].state || {}, localDelta);
      // push to neighbors
      const outs = edges.filter(e => e.src === id);
      for (const e of outs){
        const years = yearsBetween(out.nodes[e.src].date, out.nodes[e.dst].date);
        const base = mechanismFilter(e.mechanism, localDelta);
        for (const [k,v] of Object.entries(base) as [keyof State, number][]){
          const d = v * e.weight * timeDecay(years);
          (acc[e.dst] as any) = acc[e.dst] || {};
          (acc[e.dst] as any)[k] = ((acc[e.dst] as any)[k] ?? 0) + d;
        }
      }
    }
  }
  return out;
}

export async function runIntervention(world: World, id: string, edited: string): Promise<World> {
  const original = world.nodes[id]?.title || "";
  const deltas = mapTextToDeltas(original, edited);
  const updated = propagate(world, id, deltas);

  // very light headline rewrite: append trend hint if large shift at the source node
  const src = updated.nodes[id];
  const w = (src.state.war_escalation ?? 0) - (world.nodes[id].state.war_escalation ?? 0);
  if (Math.abs(w) > 0.2){
    const tag = w < 0 ? " (tensions ease)" : " (tensions rise)";
    updated.nodes[id].title = edited.endsWith(tag) ? edited : (edited + tag);
  } else {
    updated.nodes[id].title = edited;
  }
  return updated;
}