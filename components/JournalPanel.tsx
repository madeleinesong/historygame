'use client';

import { JournalEntry } from '@/lib/types';

interface Props {
  journal: JournalEntry[];
  currentDateTime: string;
  turnCount: number;
}

export default function JournalPanel({ journal, currentDateTime, turnCount }: Props) {
  return (
    <div className="flex flex-col h-full bg-stone-950 border-r border-stone-700">
      <div className="px-4 py-3 border-b border-stone-700">
        <h2 className="text-xs font-mono text-stone-400 uppercase tracking-widest">Field Journal</h2>
        <p className="text-xs text-stone-500 mt-1 font-mono">{currentDateTime}</p>
        <p className="text-xs text-stone-600 font-mono">Turn {turnCount}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {journal.length === 0 && (
          <p className="text-xs text-stone-600 italic font-mono leading-relaxed">
            January 30, 1933. Hitler has been appointed Chancellor. The pages are blank. What will you do?
          </p>
        )}
        {[...journal].reverse().map((entry) => (
          <div key={entry.id} className="border-l-2 border-stone-700 pl-3 py-1">
            <p className="text-xs text-stone-500 font-mono">{entry.timestamp}</p>
            <p className="text-xs text-amber-200/80 font-mono mt-0.5 leading-snug">→ {entry.action}</p>
            <p className="text-xs text-stone-400 font-mono mt-1 leading-snug">{entry.consequence.slice(0, 120)}{entry.consequence.length > 120 ? '…' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
