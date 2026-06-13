'use client';

import { useState, KeyboardEvent } from 'react';

interface Props {
  onSubmit: (action: string) => void;
  disabled: boolean;
  suggestedActions: string[];
}

export default function ActionInput({ onSubmit, disabled, suggestedActions }: Props) {
  const [text, setText] = useState('');

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-stone-700 bg-stone-950 px-4 py-3">
      {suggestedActions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {suggestedActions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => !disabled && onSubmit(suggestion)}
              disabled={disabled}
              className="text-xs font-mono text-stone-500 border border-stone-700 rounded px-2 py-0.5 hover:text-stone-300 hover:border-stone-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={disabled ? 'Thinking…' : 'What do you do? (Enter to submit, Shift+Enter for newline)'}
          rows={2}
          className="flex-1 bg-stone-900 border border-stone-700 rounded text-sm font-mono text-stone-200 placeholder-stone-600 px-3 py-2 resize-none focus:outline-none focus:border-stone-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="px-4 py-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-amber-100 text-sm font-mono rounded transition-colors h-[52px]"
        >
          Act
        </button>
      </div>
      <p className="text-xs text-stone-700 font-mono mt-1">Be specific. Vague intentions will be refused.</p>
    </div>
  );
}
