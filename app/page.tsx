'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, ActionResponse, JournalEntry } from '@/lib/types';
import GamePanel from '@/components/GamePanel';
import JournalPanel from '@/components/JournalPanel';
import StatusPanel from '@/components/StatusPanel';
import ActionInput from '@/components/ActionInput';

const SAVE_KEY = 'inside-history-save';

function applyActionResponse(state: GameState, action: string, response: ActionResponse): GameState {
  const newEntry: JournalEntry = {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: state.currentDateTime,
    action,
    consequence: response.narrative,
    turnNumber: state.turnCount + 1,
  };

  const updatedRelationships = [...state.player.relationships];
  for (const change of response.relationshipChanges ?? []) {
    const existing = updatedRelationships.find((r) => r.person === change.person);
    if (existing) {
      existing.status = change.newStatus;
      existing.notes = change.notes || existing.notes;
      existing.lastContact = response.newDateISO;
    } else {
      updatedRelationships.push({
        person: change.person,
        status: change.newStatus,
        lastContact: response.newDateISO,
        notes: change.notes,
      });
    }
  }

  const newInventory = state.player.inventory
    .filter((item) => !(response.inventoryRemove ?? []).includes(item))
    .concat(response.inventoryAdd ?? []);

  const newWorld = {
    ...state.world,
    ...(response.worldStateUpdates ?? {}),
  };

  return {
    ...state,
    currentDateTime: response.newDateTime || state.currentDateTime,
    currentDateISO: response.newDateISO || state.currentDateISO,
    currentLocation: response.locationChange ?? state.currentLocation,
    turnCount: state.turnCount + 1,
    gameStatus: response.gameOver
      ? (response.gameOverType ?? 'lost')
      : state.gameStatus,
    player: {
      ...state.player,
      money: state.player.money + (response.moneyChange ?? 0),
      physicalStatus: response.physicalStatusChange ?? state.player.physicalStatus,
      inventory: newInventory,
      relationships: updatedRelationships,
      knownFacts: [...state.player.knownFacts, ...(response.newKnownFacts ?? [])],
    },
    world: newWorld,
    journal: [...state.journal, newEntry],
  };
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(!!localStorage.getItem(SAVE_KEY));
  }, []);

  const saveGame = useCallback((state: GameState) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, []);

  async function startNewGame() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/new-game', { method: 'POST' });
      const state: GameState = await res.json();
      setGameState(state);
      setSuggestedActions([]);
      setGameOverReason(null);
      saveGame(state);
      setHasSave(true);
    } catch (e) {
      setError('Failed to start game.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      const state: GameState = JSON.parse(raw);
      setGameState(state);
      setSuggestedActions([]);
      setGameOverReason(null);
    } catch {
      setError('Save file corrupted.');
    }
  }

  async function handleAction(action: string) {
    if (!gameState || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, gameState }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const response: ActionResponse = await res.json();
      const newState = applyActionResponse(gameState, action, response);

      setGameState(newState);
      setSuggestedActions(response.suggestedActions ?? []);

      if (response.gameOver) {
        setGameOverReason(response.gameOverReason ?? null);
      }

      saveGame(newState);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Action failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Welcome / menu screen
  if (!gameState) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="max-w-md w-full px-8 py-12 text-center">
          <h1 className="text-2xl font-mono text-stone-200 mb-2 tracking-tight">Inside History</h1>
          <p className="text-sm font-mono text-stone-500 mb-1">Berlin. January–March 1933.</p>
          <p className="text-xs font-mono text-stone-600 mb-8">Can one person change the course of history?</p>

          <div className="space-y-3">
            <button
              onClick={startNewGame}
              disabled={isLoading}
              className="w-full py-3 bg-amber-900 hover:bg-amber-800 text-amber-100 font-mono text-sm rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Starting…' : 'New Game'}
            </button>
            {hasSave && (
              <button
                onClick={loadGame}
                className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-sm rounded transition-colors"
              >
                Continue Game
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 text-red-400 font-mono text-xs">{error}</p>
          )}

          <p className="mt-8 text-xs text-stone-700 font-mono leading-relaxed">
            A historically grounded text game. Your actions must be concrete and plausible. The adjudicator is unforgiving.
          </p>
        </div>
      </div>
    );
  }

  const isGameOver = gameState.gameStatus === 'won' || gameState.gameStatus === 'lost';

  return (
    <div className="h-screen flex flex-col bg-stone-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800 bg-stone-950 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-mono text-stone-400 tracking-wider">INSIDE HISTORY</h1>
          <span className="text-xs font-mono text-stone-600">{gameState.currentDateTime}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => saveGame(gameState)}
            className="text-xs font-mono text-stone-600 hover:text-stone-400 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => { setGameState(null); setError(null); }}
            className="text-xs font-mono text-stone-600 hover:text-stone-400 transition-colors"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Main layout: three panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Journal */}
        <div className="w-56 flex-shrink-0 overflow-hidden">
          <JournalPanel
            journal={gameState.journal}
            currentDateTime={gameState.currentDateTime}
            turnCount={gameState.turnCount}
          />
        </div>

        {/* Center: Narrative + Input */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden">
            <GamePanel
              isLoading={isLoading}
              error={error}
              gameStatus={gameState.gameStatus}
              gameOverReason={gameOverReason}
              journal={gameState.journal}
            />
          </div>
          {!isGameOver && (
            <ActionInput
              onSubmit={handleAction}
              disabled={isLoading}
              suggestedActions={suggestedActions}
            />
          )}
          {isGameOver && (
            <div className="border-t border-stone-700 px-4 py-3 bg-stone-950 flex justify-center">
              <button
                onClick={startNewGame}
                className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-sm rounded"
              >
                Start Over
              </button>
            </div>
          )}
        </div>

        {/* Right: Status */}
        <div className="w-56 flex-shrink-0 overflow-hidden">
          <StatusPanel
            player={gameState.player}
            currentLocation={gameState.currentLocation}
          />
        </div>
      </div>
    </div>
  );
}
