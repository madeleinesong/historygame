import { NextResponse } from 'next/server';
import { createInitialState } from '@/lib/initialState';

export async function POST() {
  const state = createInitialState();
  return NextResponse.json(state);
}
