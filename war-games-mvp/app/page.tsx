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
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import ELK from "elkjs";

type EventNode = { id: string; year: number; text: string; influences: string[] };
type Objective = { id: string; title: string; initialFocusId?: string };

const elk = new ELK();

async function dagLayout(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.edgeNode": "50",
      "elk.spacing.nodeNode": "50",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: Math.max(280, (n.data?.label as string)?.length * 4 || 280),
      height: 84,
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source!], targets: [e.target!] })),
  };

  const res = await elk.layout(graph);
  const pos = Object.fromEntries((res.children || []).map((c: any) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  return {
    nodes: nodes.map((n) => ({ ...n, position: pos[n.id] ?? n.position, draggable: true })),
    edges,
  };
}

export default function Page() {
  const [timeline, setTimeline] = useState<EventNode[]>([]);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [loading, setLoading] = useState(true);

  // load WW2 data at /public/data/ww2.json (object: { objective, nodes })
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/wwii.json");
        const data = await res.json();
        if (Array.isArray(data)) {
          setTimeline(data);
          setObjective(null);
        } else {
          setTimeline(Array.isArray(data.nodes) ? data.nodes : []);
          setObjective(data.objective ?? null);
        }
      } catch (e) {
        console.error("failed to load /data/ww2.json", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>loading…</div>;

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0a0a0b" }}>
      {/* objective banner */}
      <ObjectiveBar objective={objective} />
      {/* provider fixes the zustand error */}
      <ReactFlowProvider>
        <GraphCanvas timeline={timeline} objective={objective || undefined} />
      </ReactFlowProvider>
    </div>
  );
}

function ObjectiveBar({ objective }: { objective?: Objective | null }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 20,
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(16,16,18,0.9)",
        border: "1px solid #2a2a2a",
        color: "#fff",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, opacity: 0.85 }}>Objective</div>
        <div style={{ fontSize: 16 }}>{objective?.title || "—"}</div>
      </div>
    </div>
  );
}

function GraphCanvas({ timeline, objective }: { timeline: EventNode[]; objective?: Objective }) {
  const baseNodes = useMemo<Node[]>(
    () =>
      timeline.map((n) => ({
        id: n.id,
        data: { label: `${n.year} — ${n.text}`, raw: n },
        position: { x: 0, y: 0 },
        style: {
          borderRadius: 12,
          padding: 10,
          border: "1px solid #2a2a2a",
          background: "#0e0e10",
          color: "#fff",
          width: 320,
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
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
          style: { stroke: "#7b7b7b" },
        }))
      ),
    [timeline]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);
  const rf = useReactFlow();

  // layout and focus on objective.initialFocusId (e.g., Hiroshima)
  useEffect(() => {
    (async () => {
      const { nodes: laidOut, edges: e } = await dagLayout(baseNodes, baseEdges);
      setNodes(laidOut);
      setEdges(e);
      const focusId =
        objective?.initialFocusId ||
        timeline.find((n) => n.year === Math.min(...timeline.map((x) => x.year)))?.id;
      if (!focusId) return;
      requestAnimationFrame(() => {
        const n = rf.getNodes().find((x) => x.id === focusId);
        if (!n) return;
        const w = n.width ?? 320;
        const h = n.height ?? 84;
        rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1.2, duration: 800 });
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseNodes, baseEdges, objective?.initialFocusId]);

  const callLLM = useCallback(async (context: string, oldHeadline: string) => {
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, oldHeadline }),
    });
    const { newHeadline } = await res.json();
    return newHeadline as string;
  }, []);

  const propagateChange = useCallback(
    async (changedId: string, data: EventNode[]) => {
      const changed = data.find((d) => d.id === changedId);
      if (!changed) return;
      for (const childId of changed.influences || []) {
        const child = data.find((d) => d.id === childId);
        if (!child) continue;
        child.text = await callLLM(changed.text, child.text);
        await propagateChange(childId, data);
      }
    },
    [callLLM]
  );

  const onNodeDoubleClick = useCallback(
    async (_: any, node: Node) => {
      const original = node.data?.raw as EventNode;
      const currentText = original?.text ?? "";
      const newText = window.prompt("Edit headline", currentText);
      if (newText == null || newText === currentText) return;
      const updated: EventNode[] = timeline.map((n) =>
        n.id === original.id ? { ...n, text: newText } : n
      );
      await propagateChange(original.id, updated);
      // push text change into visible label
      setNodes((nds) =>
        nds.map((n) =>
          n.id === original.id ? { ...n, data: { ...n.data, label: `${original.year} — ${newText}`, raw: { ...original, text: newText } } } : n
        )
      );
    },
    [timeline, propagateChange, setNodes]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDoubleClick={onNodeDoubleClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
    >
      <MiniMap
        pannable
        zoomable
        style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, width: 220, height: 140 }}
        nodeColor={() => "#6e6e6e"}
        maskColor="rgba(0,0,0,0.2)"
      />
      <Controls />
      <Background />
    </ReactFlow>
  );
}
