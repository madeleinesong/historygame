import { NextRequest } from "next/server";
import { loadWorld, runIntervention } from "@/server/propagate";
import type { World } from "@/types/event";

export async function POST(req: NextRequest){
  const { id, edited } = await req.json();
  const world: World = await loadWorld();
  const updated = await runIntervention(world, id, edited);
  return new Response(JSON.stringify(updated), { headers: { "Content-Type": "application/json" } });
}