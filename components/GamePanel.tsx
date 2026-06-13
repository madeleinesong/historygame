'use client';

import { useEffect, useRef } from 'react';
import { JournalEntry, PlayerState, CharacterType } from '@/lib/types';

interface Props {
  isLoading: boolean;
  error: string | null;
  gameStatus: 'playing' | 'won' | 'lost' | 'not_started';
  gameOverReason: string | null;
  journal: JournalEntry[];
  player: PlayerState;
}

const INTROS: Record<CharacterType, string> = {
  journalist: `Berlin, Monday, January 30, 1933. Nine o'clock in the morning.

You sit at your usual corner table at Café Josty, on Potsdamer Platz, the fog-grey light coming through the tall windows. Your coffee is getting cold. You are Karl Brandt, reporter for the Berliner Tageblatt, and you have just read the morning editions.

Paul von Hindenburg appointed Adolf Hitler Reich Chancellor this morning. It is done.

Around you, the café is a low murmur of shock and speculation. A man at the next table says Papen has it all in hand. A woman in a fur coat is crying quietly. Outside, through the glass, you can see Potsdamer Platz going about its business — tramcars, automobiles, women with shopping bags — as if nothing has changed.

But you know what the history books say. You know where this goes if nothing interrupts it. The Reichstag will burn on February 27. Elections on March 5. The Enabling Act on March 23. Each step locks the next.

You have fifty-two days. You are one journalist. You have a notebook, a press badge, and twelve Reichsmarks.

What do you do?`,

  centre_party_deputy: `Berlin, Monday, January 30, 1933. Half past ten in the morning.

The Centre Party offices on Linkstrasse feel smaller than usual today. You are Heinrich Möller, Catholic lawyer, Reichstag deputy for the Rhineland since 1928. The news came through at nine: Hindenburg has signed the appointment. Adolf Hitler is Reich Chancellor.

Your telephone has not stopped ringing. Colleagues are frightened. Chairman Kaas is already seeking a meeting with Hitler — seeking guarantees, he says. Promises about the Church, about the Concordat, about Catholic schools.

You know how this ends. You have read history. The Enabling Act will come before the Reichstag in late March. Without the Centre Party's seventy-four votes, it cannot reach the two-thirds majority it needs. Without the Centre Party, history turns differently.

The Nazis are already saying they will protect Catholic institutions. They are lying. Kaas wants to believe them. Some of your colleagues are already wavering.

You are not chairman. You cannot issue a party whip. But you are here. You have your vote. And you know people.

The question is: can you hold the line?`,

  chamberlain: `London, Monday, January 30, 1933. Ten o'clock in the morning.

The Foreign Office telegram arrived at nine. You are Neville Chamberlain, Chancellor of the Exchequer, reading it at your desk in 11 Downing Street. The text is terse: Hitler appointed German Chancellor. The political situation remains uncertain.

You set it down. You have followed German politics closely — more closely than most of your Cabinet colleagues, who still treat the whole affair as a German internal matter, the usual continental turbulence.

You are not so sure. You have read Mein Kampf, or enough of it. You know what this man wants.

The problem is that Britain is exhausted from the last war. The public does not want to hear about another German threat. MacDonald is focused on the World Disarmament Conference. Simon thinks any pressure on Germany is counterproductive. The economy is still broken.

But you are Chancellor of the Exchequer. Germany owes money to British banks. Trade runs between the two countries. France is alarmed and looking for allies. Ambassador Rumbold in Berlin sees what is happening and is not reassured.

You have time — perhaps until late March when some Enabling Act vote is expected. Time to build pressure. Time to be heard. Time to act differently than history says you will.

Where do you begin?`,
};

export default function GamePanel({ isLoading, error, gameStatus, gameOverReason, journal, player }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [journal, isLoading]);

  const intro = INTROS[player.characterType] ?? INTROS.journalist;

  return (
    <div className="flex flex-col h-full bg-stone-900 overflow-y-auto px-6 py-6">
      {/* Intro */}
      {journal.length === 0 && (
        <div className="prose prose-invert prose-sm max-w-none font-mono leading-relaxed">
          {intro.split('\n\n').map((para, i) => (
            <p key={i} className="text-stone-300 mb-4 leading-relaxed">{para}</p>
          ))}
        </div>
      )}

      {/* Journal entries as narrative */}
      {journal.map((entry) => (
        <div key={entry.id} className="mb-6">
          <p className="text-xs text-stone-600 font-mono mb-2">[{entry.timestamp}] <span className="text-amber-700">{entry.action}</span></p>
          {entry.consequence.split('\n\n').map((para, i) => (
            <p key={i} className="text-stone-300 font-mono text-sm leading-relaxed mb-3">{para}</p>
          ))}
        </div>
      ))}

      {/* Loading */}
      {isLoading && (
        <div className="text-stone-600 font-mono text-sm animate-pulse">
          The world processes your action…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded px-4 py-3 text-red-300 font-mono text-sm">
          {error}
        </div>
      )}

      {/* Game Over */}
      {gameStatus === 'won' && (
        <div className="mt-6 bg-emerald-950 border border-emerald-700 rounded px-4 py-4">
          <p className="text-emerald-300 font-mono text-sm font-bold mb-2">HISTORY CHANGED</p>
          <p className="text-emerald-200 font-mono text-sm leading-relaxed">{gameOverReason}</p>
        </div>
      )}
      {gameStatus === 'lost' && (
        <div className="mt-6 bg-stone-950 border border-stone-700 rounded px-4 py-4">
          <p className="text-stone-400 font-mono text-sm font-bold mb-2">HISTORY HOLDS</p>
          <p className="text-stone-500 font-mono text-sm leading-relaxed">{gameOverReason}</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
