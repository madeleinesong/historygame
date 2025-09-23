// app/api/rewrite/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// strict schema we expect back from the model
type Update = {
  id: string;             // node id to change
  newText: string;        // rewritten headline
  confidence?: number;    // 0-1 (optional)
  reason?: string;        // short rationale
  severity?: "major" | "minor"; // whether this is a core rewrite or a small tweak
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { changedId, newText, timeline } = body;

    if (!changedId || !timeline) {
      return NextResponse.json({ error: "Missing changedId or timeline" }, { status: 400 });
    }

    // Build a strict prompt that requests ONLY JSON (no chatter).
    const system = `
You are a counterfactual historian assistant with an expert level knowledge of history, the infinite web of reverberating causes and consequences. The user will give you:
- a single node id that was changed in a historical timeline (changedId),
- the newText if provided, and
- the timeline as an array of events (each event has id, year, text, influences[]).

Task: produce a JSON array called "updates" describing the rewritten headlines for nodes that should be changed because of the input change. Provide only valid JSON. DO NOT include additional human text. Each update must be an object with fields:
- id (string)
- newText (string)
- confidence (number between 0 and 1, optional)
- reason (short string, optional)
- severity ("major" or "minor", optional)

Guidelines:
- Include the changed node itself as the first element with the newText.
- For descendants (nodes reachable via influences from changedId) decide whether they should be rewritten, postponed, or left unchanged.
- Use historical knowledge conservatively: if an outcome depends on many constraints (e.g., Hitler still in power), describe less radical rewrites; if the instruction clearly removes a causal prerequisite, make more radical rewrites.
- Keep reasons short (one sentence).
- Return only JSON, with property: {"updates": [...]}
`;

    // create the user message giving the full data
    const user = JSON.stringify({
      changedId,
      newText: newText || null,
      timeline, // the frontend should send either the full timeline or the subtree of interest
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Data:\n${user}\n\nRespond with JSON.` },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    // try to parse JSON robustly
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // attempt to extract JSON substring
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first !== -1 && last !== -1) {
        try {
          parsed = JSON.parse(raw.slice(first, last + 1));
        } catch (err2) {
          return NextResponse.json({ error: "Model returned non-JSON", raw }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Model returned non-JSON", raw }, { status: 500 });
      }
    }

    // validate shape minimally
    if (!parsed || !Array.isArray(parsed.updates)) {
      return NextResponse.json({ error: "Invalid JSON shape from model", raw: parsed }, { status: 500 });
    }

    // return the updates
    return NextResponse.json({ updates: parsed.updates, raw });
  } catch (err: any) {
    console.error("rewrite api error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
