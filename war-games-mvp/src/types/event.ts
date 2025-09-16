export type Mechanism =
  | "diplomatic"
  | "military"
  | "economic"
  | "informational"
  | "technological";

export interface State {
  war_escalation: number;       // 0..1
  mobilization_level: number;   // 0..1
  political_stability: number;  // 0..1
  intel_leak_risk: number;      // 0..1
  logistics_capacity: number;   // 0..1
  alliances_cohesion: number;   // 0..1
  public_support: number;       // 0..1
  casualties_expected: number;  // integer
  frontline_position?: string;  // coarse region tag
}

export interface EventNode {
  id: string;
  title: string;
  date: string; // ISO
  location?: string;
  actors: string[];
  summary?: string;
  state: Partial<State>;
  sources?: string[];
}

export interface Edge {
  src: string;
  dst: string;
  weight: number;    // 0..1
  mechanism: Mechanism;
}

export interface World {
  nodes: Record<string, EventNode>;
  edges: Edge[];
  goals: Goal[];
}

export type GoalMetric =
  | { key: keyof State; target: number; weight: number; direction: "min"|"max"|"close" }
  | { key: "end_by_date"; target: string; weight: number };

export interface Goal {
  id: string;
  name: string;
  description: string;
  metrics: GoalMetric[];
}