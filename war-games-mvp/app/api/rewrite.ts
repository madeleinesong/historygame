import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { context, oldHeadline } = req.body;

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
  res.json({ newHeadline });
}
