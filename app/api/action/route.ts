import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GameState, ActionResponse, Relationship } from '@/lib/types';
import { buildSystemPrompt } from '@/lib/systemPrompt';
import { searchPassages } from '@/lib/localHistory';

function makeClient() {
  if (process.env.ANTHROPIC_API_KEY) {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  if (process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Anthropic({ authToken: process.env.ANTHROPIC_AUTH_TOKEN });
  }
  return new Anthropic();
}

const client = makeClient();

const MODEL = process.env.GAME_MODEL ?? 'claude-opus-4-8';
// Only Opus 4.6+ and Claude 4.x family support adaptive thinking
const SUPPORTS_THINKING = !MODEL.includes('haiku') && !MODEL.includes('sonnet-3') && !MODEL.includes('opus-3');

const VALID_STATUSES = new Set<Relationship['status']>(['stranger', 'acquaintance', 'trusted', 'suspicious', 'hostile']);

function normalizeRelationshipStatus(raw: unknown): Relationship['status'] {
  if (typeof raw !== 'string') return 'acquaintance';
  const lower = raw.toLowerCase();
  // Try direct match first
  if (VALID_STATUSES.has(lower as Relationship['status'])) return lower as Relationship['status'];
  // Fuzzy map common LLM variants
  if (lower.includes('trust') || lower.includes('ally') || lower.includes('friend')) return 'trusted';
  if (lower.includes('hostile') || lower.includes('enemy') || lower.includes('danger')) return 'hostile';
  if (lower.includes('suspect') || lower.includes('warn') || lower.includes('wary')) return 'suspicious';
  if (lower.includes('stranger') || lower.includes('unknown')) return 'stranger';
  return 'acquaintance';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeResponse(raw: any): ActionResponse {
  const relChanges = (raw.relationshipChanges ?? []).map((c: Record<string, unknown>) => ({
    person: String(c.person ?? ''),
    // Handle both "newStatus" and "statusChange" (common LLM mistake)
    newStatus: normalizeRelationshipStatus(c.newStatus ?? c.status ?? c.statusChange),
    notes: String(c.notes ?? ''),
  }));

  return {
    narrative: String(raw.narrative ?? ''),
    actionRefused: Boolean(raw.actionRefused),
    refusalReason: raw.refusalReason ?? null,
    timeAdvancedMinutes: Number(raw.timeAdvancedMinutes ?? 30),
    newDateTime: String(raw.newDateTime ?? ''),
    newDateISO: String(raw.newDateISO ?? ''),
    locationChange: raw.locationChange ?? null,
    newKnownFacts: Array.isArray(raw.newKnownFacts) ? raw.newKnownFacts.map(String) : [],
    inventoryAdd: Array.isArray(raw.inventoryAdd) ? raw.inventoryAdd.map(String) : [],
    inventoryRemove: Array.isArray(raw.inventoryRemove) ? raw.inventoryRemove.map(String) : [],
    moneyChange: Number(raw.moneyChange ?? 0),
    relationshipChanges: relChanges,
    physicalStatusChange: raw.physicalStatusChange ?? null,
    worldStateUpdates: raw.worldStateUpdates ?? {},
    gameOver: Boolean(raw.gameOver),
    // Normalize gameOverType — LLM sometimes returns 'player_eliminated', 'death', etc.
    gameOverType: raw.gameOverType === 'won' ? 'won' : (raw.gameOver ? 'lost' : null),
    gameOverReason: raw.gameOverReason ?? null,
    suggestedActions: Array.isArray(raw.suggestedActions) ? raw.suggestedActions.map(String) : [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { action, gameState }: { action: string; gameState: GameState } = await req.json();

    if (!action?.trim()) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Retrieve locally-stored historical passages relevant to this action + current date
    const searchQuery = `${action} ${gameState.currentDateISO.slice(0, 7)} ${gameState.currentLocation}`;
    const relevantPassages = searchPassages(searchQuery, 5);

    const systemPrompt = buildSystemPrompt(gameState, relevantPassages);

    const requestParams: Parameters<typeof client.messages.stream>[0] = {
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `My action: ${action.trim()}`,
        },
      ],
    };

    if (SUPPORTS_THINKING) {
      requestParams.thinking = { type: 'adaptive' };
    }

    const stream = await client.messages.stream(requestParams);
    const message = await stream.finalMessage();

    // Extract text content from the response
    let rawText = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        rawText += block.text;
      }
    }

    // Parse JSON response
    let parsed: ActionResponse;
    try {
      // Strip any markdown code fences if present
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = normalizeResponse(JSON.parse(jsonMatch[0]));
    } catch {
      console.error('Failed to parse LLM response:', rawText);
      return NextResponse.json(
        { error: 'Failed to parse adjudicator response', raw: rawText },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Action route error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
