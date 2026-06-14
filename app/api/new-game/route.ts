import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createInitialState } from '@/lib/initialState';
import { generateHistoricalTimeline } from '@/lib/historyFetcher';
import { CharacterType } from '@/lib/types';

function makeClient() {
  if (process.env.ANTHROPIC_API_KEY) return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (process.env.ANTHROPIC_AUTH_TOKEN) return new Anthropic({ authToken: process.env.ANTHROPIC_AUTH_TOKEN });
  return new Anthropic();
}

const MODEL = process.env.GAME_MODEL ?? 'claude-opus-4-8';

export async function POST(req: NextRequest) {
  let characterType: CharacterType = 'journalist';
  try {
    const body = await req.json();
    if (body?.characterType) characterType = body.characterType as CharacterType;
  } catch {
    // no body is fine
  }

  const state = createInitialState(characterType);

  // Enrich pendingEvents with Wikipedia-sourced timeline.
  // Fall back to static events on any error so the game always starts.
  try {
    const client = makeClient();
    const enrichedEvents = await generateHistoricalTimeline(client, MODEL);
    if (enrichedEvents.length > 0) {
      state.world.pendingEvents = enrichedEvents;
    }
  } catch (err) {
    console.warn('Historical timeline generation failed, using static events:', err);
  }

  return NextResponse.json(state);
}
