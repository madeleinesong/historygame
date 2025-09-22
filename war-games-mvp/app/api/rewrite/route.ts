import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { context, oldHeadline } = await req.json();

    if (!context || !oldHeadline) {
      return NextResponse.json(
        { error: "Missing context or oldHeadline" },
        { status: 400 }
      );
    }

    const prompt = `
Context: ${context}
Original headline: ${oldHeadline}

Rewrite the headline so it is historically consistent with the context.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const newHeadline = completion.choices[0].message?.content?.trim() || oldHeadline;
    return NextResponse.json({ newHeadline });
  } catch (err: any) {
    console.error("rewrite api error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
