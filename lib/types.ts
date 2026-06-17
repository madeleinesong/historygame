export interface JournalEntry {
  id: string;
  timestamp: string;
  action: string;
  consequence: string;
  turnNumber: number;
}

export interface Relationship {
  person: string;
  status: 'stranger' | 'acquaintance' | 'trusted' | 'suspicious' | 'hostile';
  lastContact: string | null;
  notes: string;
}

export interface ActorState {
  name: string;
  disposition: string;
  location: string;
  status: 'active' | 'arrested' | 'fled' | 'dead' | 'compromised';
  notes: string;
}

export interface WorldEvent {
  id: string;
  description: string;
  triggerCondition: string;
  scheduledDate: string;
  triggered: boolean;
  // enriched at game-start via Wikipedia + LLM
  naziConsolidationEffect?: number;  // positive = consolidation rises when triggered
  preventable?: boolean;
  keyActors?: string[];
  historicalNote?: string;           // one sentence of sourced context
}

export type CharacterType = 'journalist' | 'centre_party_deputy' | 'chamberlain';

export interface PlayerState {
  name: string;
  occupation: string;
  affiliation: string;
  physicalStatus: string;
  money: number;
  inventory: string[];
  relationships: Relationship[];
  knownFacts: string[];
  characterType: CharacterType;
}

export type GamePhase =
  | 'nazi_consolidation'   // Jan 30 – Mar 23 1933: stop the Enabling Act
  | 'weimar_collapse'      // Mar 1933 – Aug 1934: internal resistance; Night of Long Knives
  | 'third_reich'          // Aug 1934 – Sep 1939: international pressure, rearmament, Munich
  | 'wartime';             // Sep 1939 – May 1945: resistance networks, shorten the war

export interface WorldState {
  naziConsolidationLevel: number;
  gamePhase: GamePhase;
  keyActorStates: Record<string, ActorState>;
  pendingEvents: WorldEvent[];
  triggeredEvents: string[];
  causalChain: string[];
  reichstagFireStatus: 'not_happened' | 'imminent' | 'happened';
  enablingActStatus: 'not_introduced' | 'in_progress' | 'passed';
  extraDetails: Record<string, unknown>;
}

export interface GameState {
  version: number;
  gameStatus: 'playing' | 'won' | 'lost' | 'not_started';
  currentDateTime: string;
  currentDateISO: string;
  turnCount: number;
  currentLocation: string;
  player: PlayerState;
  world: WorldState;
  journal: JournalEntry[];
}

export interface RelationshipChange {
  person: string;
  newStatus: Relationship['status'];
  notes: string;
}

export interface ActionResponse {
  narrative: string;
  actionRefused: boolean;
  refusalReason: string | null;
  timeAdvancedMinutes: number;
  newDateTime: string;
  newDateISO: string;
  locationChange: string | null;
  newKnownFacts: string[];
  inventoryAdd: string[];
  inventoryRemove: string[];
  moneyChange: number;
  relationshipChanges: RelationshipChange[];
  physicalStatusChange: string | null;
  worldStateUpdates: Partial<WorldState>;
  gameOver: boolean;
  gameOverType: 'won' | 'lost' | null;
  gameOverReason: string | null;
  suggestedActions: string[];
}

export interface CharacterDefinition {
  id: CharacterType;
  name: string;
  title: string;
  tagline: string;
  description: string;
  difficulty: 'Accessible' | 'Challenging' | 'Expert';
}

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'journalist',
    name: 'Karl Brandt',
    title: 'Journalist, Berliner Tageblatt',
    tagline: 'The pen is your only weapon.',
    description: 'You can expose, investigate, and inform — but only if someone listens. Build sources, publish before the press goes dark.',
    difficulty: 'Accessible',
  },
  {
    id: 'centre_party_deputy',
    name: 'Heinrich Möller',
    title: 'Centre Party Reichstag Deputy',
    tagline: 'You hold the decisive votes.',
    description: 'The Centre Party\'s yes-votes will give Hitler his 2/3 majority. As a Centre Party deputy, you can try to keep your colleagues from capitulating — but the Church, the Concordat promise, and Nazi intimidation all work against you.',
    difficulty: 'Challenging',
  },
  {
    id: 'chamberlain',
    name: 'Neville Chamberlain',
    title: 'Chancellor of the Exchequer, United Kingdom',
    tagline: 'International pressure is your lever.',
    description: 'From London, you must convince the British government to take Hitler seriously — in 1933, before it is too late. Coordinate with France, brief the press, threaten economic isolation. You have more time, but far less direct influence.',
    difficulty: 'Expert',
  },
];
