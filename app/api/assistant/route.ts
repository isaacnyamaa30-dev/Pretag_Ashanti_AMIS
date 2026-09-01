import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildAssistantContext } from "@/lib/assistant-context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_ASSISTANT_MODEL || "gpt-4o-mini";

const SYSTEM = `You are the membership analyst for PRETAG Ashanti (the Pre-Tertiary
Teachers Association of Ghana, Ashanti Region). You answer questions from Regional
Executives about the union's membership using ONLY the data snapshot provided.

Rules:
- Use only the figures in the snapshot. Do not invent numbers or trends.
- If the snapshot does not contain what is needed, say so plainly and say what
  data would be needed (e.g. "that needs at least three imported months").
- Be concise and direct. Lead with the answer, then the supporting figures.
- "Missing from the R20" means a member stopped appearing - it is not a verified
  resignation. Say "no longer in the R20" rather than "left the union".
- Ghanaian English, plain numbers, no markdown headings.`;

export async function POST(req: NextRequest) {
  await requireStaff();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "not_configured", message: "The AI assistant needs an OPENAI_API_KEY set on the server." },
      { status: 503 },
    );
  }

  const { question } = (await req.json()) as { question?: string };
  if (!question || question.trim().length < 3) {
    return NextResponse.json({ error: "empty", message: "Ask a question." }, { status: 400 });
  }

  const context = await buildAssistantContext();
  const client = new OpenAI();

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `DATA SNAPSHOT:\n\n${context}` },
        { role: "user", content: question.trim() },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";
    await logAudit({ action: "assistant.query", details: { question: question.trim().slice(0, 300), model: MODEL } });
    return NextResponse.json({ answer });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const message =
      (e as { message?: string }).message ?? "The assistant could not answer just now.";
    return NextResponse.json({ error: "api", message }, { status });
  }
}
