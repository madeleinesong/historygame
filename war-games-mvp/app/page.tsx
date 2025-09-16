"use client";

import React, { useState, useEffect } from "react";

export default function Timeline() {

  const [timeline, setTimeline] = useState<any[]>([]);

    // load actual data
  useEffect(() => {
    fetch("/data/wwi.json")
      .then((res) => res.json())
      .then((data) => setTimeline(data))
      .catch((err) => console.error("failed to load wwi.json", err));
  }, []);

  async function handleEdit(nodeId: string, newText: string) {
    // update node text
    const updated = timeline.map((n) =>
      n.id === nodeId ? { ...n, text: newText } : n
    );

    // propagate downstream
    const changedNode = updated.find((n) => n.id === nodeId);
    if (changedNode) {
      await propagateChange(changedNode, updated);
    }
  }

  async function propagateChange(node: any, data: any[]) {
    for (const downstreamId of node.influences) {
      const downstreamNode = data.find((n) => n.id === downstreamId);
      if (downstreamNode) {
        const newHeadline = await callLLM(node.text, downstreamNode.text);

        downstreamNode.text = newHeadline;

        // recurse if deeper
        await propagateChange(downstreamNode, data);
      }
    }
    // trigger re-render
    setTimeline([...data]);
  }

  async function callLLM(context: string, oldHeadline: string): Promise<string> {
    // example: using your own api route `/api/rewrite`
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, oldHeadline }),
    });
    const { newHeadline } = await res.json();
    return newHeadline;
  }

  return (
    <div>
      {timeline.map((node) => (
        <div key={node.id}>
          <strong>{node.year}</strong> –{" "}
          <EditableText node={node} onSave={handleEdit} />
        </div>
      ))}
    </div>
  );
}

function EditableText({ node, onSave }: any) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.text);

  return editing ? (
    <span>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button
        onClick={() => {
          onSave(node.id, value);
          setEditing(false);
        }}
      >
        save
      </button>
    </span>
  ) : (
    <span onClick={() => setEditing(true)}>{node.text}</span>
  );
}
