import { NextRequest, NextResponse } from 'next/server';
import { createInitialState } from '@/lib/initialState';
import { CharacterType } from '@/lib/types';

export async function POST(req: NextRequest) {
  let characterType: CharacterType = 'journalist';
  try {
    const body = await req.json();
    if (body?.characterType) characterType = body.characterType as CharacterType;
  } catch {
    // no body is fine
  }
  const state = createInitialState(characterType);
  return NextResponse.json(state);
}
