// EditableNode.tsx
"use client";
import React, { useState } from "react";
import { Handle, NodeProps } from "reactflow";

export default function EditableNode({ data }: NodeProps) {
  const { raw, onEdit } = data;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(raw.text);

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #2a2a2a",
        background: "#0e0e10",
        color: "#fff",
        padding: 10,
        width: 320,
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.6 }}>{raw.year}</div>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
            onEdit(text);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#1a1a1d",
              color: "#fff",
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: 6,
              padding: "4px 8px",
              borderRadius: 6,
              border: "none",
              background: "#2a6ef2",
              color: "#fff",
              fontSize: 12,
            }}
          >
            Save
          </button>
        </form>
      ) : (
        <div onClick={() => setEditing(true)} style={{ fontSize: 16 }}>
          {text}
        </div>
      )}
      {/* optional connection handles */}
      <Handle type="target" position="top" />
      <Handle type="source" position="bottom" />
    </div>
  );
}
