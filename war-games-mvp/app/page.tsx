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
import EditableNode from "./EditableNode";

type EventNode = { id: string; year: number; text: string; influences: string[] };
type Objective = { id: string; title: string; initialFocusId?: string };

const elk = new ELK();

async function dagLayout(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "UP",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.edgeNode": "50",
      "elk.spacing.nodeNode": "50",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: 320,
      height: 84,
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source!], targets: [e.target!] })),
  };

  const res = await elk.layout(graph);
  const pos = Object.fromEntries(
    (res.children || []).map((c: any) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }])
  );
  return {
    nodes: nodes.map((n) => ({
      ...n,
      position: pos[n.id] ?? n.position,
      draggable: true,
    })),
    edges,
  };
}

export default function Page() {
  const [timeline, setTimeline] = useState<EventNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/wwii.json");
        const data = await res.json();
        if (Array.isArray(data)) {
          setTimeline(data);
        } else {
          setTimeline(Array.isArray(data.nodes) ? data.nodes : []);
        }
      } catch (e) {
        console.error("failed to load /data/wwii.json", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const objective = {
    id: "prevent_atomic_bomb_use",
    title: "Prevent the nuclear bomb from dropping",
    initialFocusId: "1945_hiroshima_bombing",
  };

  if (loading) return <div style={{ padding: 16 }}>loading…</div>;

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100">
      <div className="fixed top-0 left-0 w-full bg-black shadow-md z-20 px-6 py-3" />
      <div style={{ width: "100%", height: "100vh", background: "#0a0a0b" }}>
        <ObjectiveBar objective={objective} />
        <ReactFlowProvider>
          <GraphCanvas timeline={timeline} objective={objective} />
        </ReactFlowProvider>
      </div>
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
        <div style={{ fontWeight: 700, fontSize: 14, opacity: 0.85 }}>Objective: {objective?.title || "—"}</div>
      </div>
    </div>
  );
}

function GraphCanvas({ timeline, objective }: { timeline: EventNode[]; objective?: Objective }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [currentTimeline, setTimeline] = useState<EventNode[]>(timeline);

  const rf = useReactFlow();
  const nodeTypes = useMemo(() => ({ editable: EditableNode }), []);

// inside GraphCanvas (or wherever callLLM lived)
  const callCounterfactual = useCallback(
    async ({
      changedId,
      changeInstruction,
      newText,
      timelineToSend,
    }: {
      changedId: string;
      changeInstruction: string; // "negate" | "replace" | free text like "delay until 1941"
      newText?: string | null;
      timelineToSend: EventNode[];
    }) => {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changedId, changeInstruction, newText, timeline: timelineToSend }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "rewrite api error");
      return body.updates as Array<{ id: string; newText: string }>;
    },
    []
  );

const propagateChange = useCallback(
  async (changedId: string, newText: string, data: EventNode[]): Promise<EventNode[]> => {
    // figure out instruction type
    const lower = newText.toLowerCase();
    const isNegate = /doesn'?t|does not|didn'?t|did not/.test(lower);
    const changeInstruction = isNegate ? "negate" : "replace";

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changedId,
          changeInstruction,
          newText,
          timeline: data,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "rewrite api error");

      const updates: Array<{ id: string; newText: string }> = body.updates;
      const updateMap = new Map(updates.map((u) => [u.id, u.newText]));

      // apply all updates immutably
      return data.map((ev) =>
        updateMap.has(ev.id) ? { ...ev, text: updateMap.get(ev.id)! } : ev
      );
    } catch (err) {
      console.error("propagateChange failed", err);
      return data;
    }
  },
  []
);

  // --- base graph elements ---
  const baseNodes = useMemo<Node[]>(
    () =>
      currentTimeline.map((n) => ({
        id: n.id,
        type: "editable",
        data: {
          raw: n,
          onEdit: async (newText: string) => {
            // update current node
            let updated = currentTimeline.map((ev) =>
              ev.id === n.id ? { ...ev, text: newText } : ev
            );
            // cascade changes
            updated = await propagateChange(n.id, newText, updated);
            setTimeline(updated);
          },
        },
        position: { x: 0, y: 0 },
      })),
    [currentTimeline, propagateChange]
  );

  const baseEdges = useMemo<Edge[]>(
    () =>
      currentTimeline.flatMap((n) =>
        (n.influences || []).map((dst) => ({
          id: `${n.id}->${dst}`,
          source: n.id,
          target: dst,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#7b7b7b" },
        }))
      ),
    [currentTimeline]
  );

  // --- layout + focus ---
  useEffect(() => {
    (async () => {
      const { nodes: laidOut, edges: e } = await dagLayout(baseNodes, baseEdges);
      setNodes(laidOut);
      setEdges(e);

      const focusId =
        objective?.initialFocusId ||
        currentTimeline.find((n) => n.year === Math.min(...currentTimeline.map((x) => x.year)))
          ?.id;
      if (!focusId) return;

      requestAnimationFrame(() => {
        const n = rf.getNodes().find((x) => x.id === focusId);
        if (!n) return;
        const w = n.width ?? 320;
        const h = n.height ?? 84;
        rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, {
          zoom: 1.2,
          duration: 800,
        });
      });
    })();
  }, [baseNodes, baseEdges, objective?.initialFocusId, rf, currentTimeline]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const step = 120;
      const { x, y, zoom } = rf.getViewport();
      if (e.key === "ArrowLeft") {
        rf.setViewport({ x: x + step, y, zoom }); // note: add to x (translation)
      } else if (e.key === "ArrowRight") {
        rf.setViewport({ x: x - step, y, zoom });
      } else if (e.key === "ArrowUp") {
        rf.setViewport({ x, y: y + step, zoom });
      } else if (e.key === "ArrowDown") {
        rf.setViewport({ x, y: y - step, zoom });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rf]);


  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
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
