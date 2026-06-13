'use client';

import { PlayerState } from '@/lib/types';

interface Props {
  player: PlayerState;
  currentLocation: string;
}

export default function StatusPanel({ player, currentLocation }: Props) {
  const statusColor: Record<string, string> = {
    stranger: 'text-stone-500',
    acquaintance: 'text-blue-400',
    trusted: 'text-emerald-400',
    suspicious: 'text-amber-400',
    hostile: 'text-red-400',
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 border-l border-stone-700 overflow-y-auto">
      <div className="px-4 py-3 border-b border-stone-700">
        <h2 className="text-xs font-mono text-stone-400 uppercase tracking-widest">Status</h2>
      </div>

      {/* Identity */}
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Identity</p>
        <p className="text-sm text-stone-200 font-mono">{player.name}</p>
        <p className="text-xs text-stone-400 font-mono">{player.occupation}</p>
        <p className="text-xs text-stone-500 font-mono">{player.affiliation}</p>
      </div>

      {/* Location */}
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Location</p>
        <p className="text-xs text-stone-300 font-mono leading-snug">{currentLocation}</p>
      </div>

      {/* Physical / Money */}
      <div className="px-4 py-3 border-b border-stone-800 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Condition</p>
          <p className="text-xs text-stone-300 font-mono">{player.physicalStatus}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Funds</p>
          <p className="text-xs text-stone-300 font-mono">{player.money} Reichsmark</p>
        </div>
      </div>

      {/* Inventory */}
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Carrying</p>
        <ul className="space-y-0.5">
          {player.inventory.map((item, i) => (
            <li key={i} className="text-xs text-stone-400 font-mono">· {item}</li>
          ))}
          {player.inventory.length === 0 && (
            <li className="text-xs text-stone-600 font-mono italic">Nothing</li>
          )}
        </ul>
      </div>

      {/* Relationships */}
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-2">Contacts</p>
        <ul className="space-y-2">
          {player.relationships.map((rel, i) => (
            <li key={i}>
              <p className="text-xs text-stone-300 font-mono leading-snug">{rel.person.split('(')[0].trim()}</p>
              <p className={`text-xs font-mono ${statusColor[rel.status] ?? 'text-stone-500'}`}>{rel.status}</p>
            </li>
          ))}
          {player.relationships.length === 0 && (
            <li className="text-xs text-stone-600 font-mono italic">No contacts yet</li>
          )}
        </ul>
      </div>

      {/* Known Facts */}
      <div className="px-4 py-3">
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Intelligence</p>
        <ul className="space-y-1">
          {player.knownFacts.slice(-6).map((fact, i) => (
            <li key={i} className="text-xs text-stone-500 font-mono leading-snug">· {fact}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
