"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

type EventNode = {
  id: string;
  year: number;
  text: string;
  influences: string[]; // downstream ids
};

const elk = new ELK();

// ---- layout helper (ELK layered -> nice DAG) ----
async function dagLayout(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.edgeNode": "40",
      "elk.spacing.nodeNode": "40",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: Math.max(260, (n.data?.label as string)?.length * 4 || 260),
      height: 80,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source!],
      targets: [e.target!],
    })),
  };

  const res = await elk.layout(graph);
  const positions =
    (res.children || []).reduce<Record<string, { x: number; y: number }>>(
      (acc, c: any) => {
        acc[c.id] = { x: c.x ?? 0, y: c.y ?? 0 };
        return acc;
      },
      {}
    );

  const laidOutNodes = nodes.map((n) => ({
    ...n,
    position: positions[n.id] ?? n.position,
    // lock initial auto-positions; users can still drag if they want
    draggable: true,
  }));

  return { nodes: laidOutNodes, edges };
}

export default function Page() {
  const [timeline, setTimeline] = useState<EventNode[]>([]);
  const [loading, setLoading] = useState(true);

  // load your array from public/data/wwi.json
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/wwi.json");
        const data = await res.json();
        // ensure it’s an array
        setTimeline(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("failed to load /data/wwi.json", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // build nodes/edges from timeline
  const baseNodes = useMemo<Node[]>(
    () =>
      timeline.map((n) => ({
        id: n.id,
        data: {
          // label shown on the node
          label: `${n.year} — ${n.text}`,
          raw: n,
        },
        position: { x: 0, y: 0 }, // will be replaced by ELK
        style: {
          borderRadius: 12,
          padding: 10,
          border: "1px solid #ccc",
          background: "#0b0b0b",
          color: "white",
          width: 300,
        },
      })),
    [timeline]
  );

  const baseEdges = useMemo<Edge[]>(
    () =>
      timeline.flatMap((n) =>
        (n.influences || []).map((dst) => ({
          id: `${n.id}->${dst}`,
          source: n.id,
          target: dst,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: false,
        }))
      ),
    [timeline]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  // run ELK whenever the graph changes
  useEffect(() => {
    (async () => {
      const { nodes: laidOut, edges: e } = await dagLayout(baseNodes, baseEdges);
      setNodes(laidOut);
      setEdges(e);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseNodes, baseEdges]);

  // ---- edit + propagate (uses your LLM endpoint) ----
  const callLLM = useCallback(async (context: string, oldHeadline: string) => {
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, oldHeadline }),
    });
    const { newHeadline } = await res.json();
    return newHeadline as string;
  }, []);

  // depth-first propagate down influences
  const propagateChange = useCallback(
    async (changedId: string, data: EventNode[]) => {
      const changed = data.find((d) => d.id === changedId);
      if (!changed) return;

      for (const childId of changed.influences || []) {
        const child = data.find((d) => d.id === childId);
        if (!child) continue;

        const newHeadline = await callLLM(changed.text, child.text);
        child.text = newHeadline;

        await propagateChange(childId, data);
      }
    },
    [callLLM]
  );

  // double-click a node to edit its headline
  const onNodeDoubleClick = useCallback(
    async (_: any, node: Node) => {
      const original = node.data?.raw as EventNode;
      const currentText = original?.text ?? "";
      const newText = window.prompt("Edit headline", currentText);
      if (newText == null || newText === currentText) return;

      // update timeline + propagate
      const updated: EventNode[] = timeline.map((n) =>
        n.id === original.id ? { ...n, text: newText } : n
      );
      await propagateChange(original.id, updated);
      setTimeline([...updated]);
    },
    [timeline, propagateChange]
  );

  const relayout = useCallback(async () => {
    const { nodes: laidOut, edges: e } = await dagLayout(
      nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } })), // reset before layout
      edges
    );
    setNodes(laidOut);
    setEdges(e);
  }, [nodes, edges, setNodes, setEdges]);

  if (loading) return <div style={{ padding: 16 }}>loading…</div>;

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <div style={{ position: "absolute", zIndex: 10, left: 12, top: 12, display: "flex", gap: 8 }}>
        <button
          onClick={relayout}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff" }}
        >
          Relayout
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
