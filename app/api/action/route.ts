import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GameState, ActionResponse } from '@/lib/types';
import { buildSystemPrompt } from '@/lib/systemPrompt';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { action, gameState }: { action: string; gameState: GameState } = await req.json();

    if (!action?.trim()) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(gameState);

    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `My action: ${action.trim()}`,
        },
      ],
    });

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
