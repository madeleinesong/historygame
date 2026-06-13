import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GameState, ActionResponse } from '@/lib/types';
import { buildSystemPrompt } from '@/lib/systemPrompt';

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

export async function POST(req: NextRequest) {
  try {
    const { action, gameState }: { action: string; gameState: GameState } = await req.json();

    if (!action?.trim()) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(gameState);

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
      parsed = JSON.parse(jsonMatch[0]);
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
