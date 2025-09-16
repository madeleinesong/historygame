"use client";
import { useEffect, useMemo, useState } from "react";
import type { World, EventNode } from "@/types/event";

export default function Home(){
  const [world,setWorld] = useState<World|null>(null);
  const [selected,setSelected] = useState<string|null>(null);
  const [draft,setDraft] = useState<string>("");

  useEffect(()=>{
    fetch("/data/wwi.json").then(r=>r.json()).then(setWorld);
  },[]);

  const nodes: EventNode[] = useMemo(()=>{
    if(!world) return [];
    return Object.values(world.nodes).sort((a,b)=> a.date.localeCompare(b.date));
  },[world]);

  async function onEditCommit(){
    if(!selected || !world) return;
    const res = await fetch("/api/intervene", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ id: selected, edited: draft })
    });
    const updated = await res.json();
    setWorld(updated);
  }

  return (
    <main className="container py-6 grid gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">War Games — WWI Sandbox</h1>
        <div className="text-sm opacity-70">Edit a headline; click Propagate.</div>
      </header>

      <section className="card overflow-x-auto whitespace-nowrap">
        {nodes.map(n => (
          <button
            key={n.id}
            onClick={()=>{ setSelected(n.id); setDraft(n.title); }}
            className={"inline-block mr-3 px-3 py-2 rounded-xl border hover:bg-gray-100 dark:hover:bg-white/10 " + (selected===n.id ? "bg-gray-200 dark:bg-white/20" : "")}
            title={n.summary || n.title}
          >
            <div className="text-[11px] opacity-70">{n.date}</div>
            <div className="font-medium text-left max-w-[22rem] truncate">{n.title}</div>
            <div className="mt-1 flex gap-1 flex-wrap">
              {(n.actors||[]).slice(0,3).map(a=>(<span key={a} className="badge">{a}</span>))}
            </div>
          </button>
        ))}
      </section>

      {selected && world && (
        <section className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="font-semibold mb-2">Edit headline</div>
            <textarea className="w-full h-40 border rounded-xl p-3"
              value={draft} onChange={e=>setDraft(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <button onClick={onEditCommit} className="btn btn-primary">Propagate</button>
              <button onClick={()=>setSelected(null)} className="btn">Cancel</button>
            </div>
          </div>

          <div className="card">
            <div className="font-semibold mb-2">Downstream preview</div>
            <p className="text-sm opacity-75">After propagation, affected nodes will show updated states.
            For MVP, headlines update lightly (trend tag).</p>
            <ul className="mt-2 space-y-1 max-h-64 overflow-auto pr-2">
              {world.edges.filter(e=>e.src===selected).map(e=>{
                const n = world.nodes[e.dst];
                return <li key={e.src+"-"+e.dst} className="text-sm">
                  → <span className="font-medium">{n.date}</span> · {n.title}
                  <span className="ml-2 badge">{e.mechanism}</span>
                </li>;
              })}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}