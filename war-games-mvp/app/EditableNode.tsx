// components/EditableNode.tsx
import { Handle, Position } from "reactflow";
import { useState } from "react";

type EditableNodeProps = {
  data: {
    raw: {
      id: string;
      text: string;
      reason?: string;
      confidence?: number;
    };
    onEdit: (newText: string) => Promise<void>;
  };
};

export default function EditableNode({ data }: EditableNodeProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.raw.text);

  return (
    <div
      style={{
        width: 300,
        background: "#fff",
        border: "1px solid #aaa",
        borderRadius: 6,
        padding: 8,
        fontSize: 14,
        position: "relative",
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false);
            data.onEdit(text);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditing(false);
              data.onEdit(text);
            }
          }}
          style={{
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: "4px 6px",
          }}
        />
      ) : (
        <div
          onDoubleClick={() => setEditing(true)}
          style={{ cursor: "pointer" }}
          title={
            data.raw.reason
              ? `${data.raw.reason}${
                  data.raw.confidence !== undefined
                    ? ` (conf: ${Math.round(data.raw.confidence * 100)}%)`
                    : ""
                }`
              : undefined
          }
        >
          {data.raw.text}
        </div>
      )}

      {/* React Flow handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
