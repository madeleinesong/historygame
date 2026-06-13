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
}

export interface PlayerState {
  name: string;
  occupation: string;
  affiliation: string;
  physicalStatus: string;
  money: number;
  inventory: string[];
  relationships: Relationship[];
  knownFacts: string[];
}

export interface WorldState {
  naziConsolidationLevel: number;
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
