import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildAssistantContext } from "@/lib/assistant-context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You are the membership analyst for PRETAG Ashanti (the Pre-Tertiary
Teachers Association of Ghana, Ashanti Region). You answer questions from Regional
Executives about the union's membership using ONLY the data snapshot provided below.

Rules:
- Use only the figures in the snapshot. Do not invent numbers or trends.
- If the snapshot does not contain what is needed to answer, say so plainly and
  say what data would be needed (e.g. "that needs at least three imported months").
- Be concise and direct. Lead with the answer, then the supporting figures.
- "Missing from the R20" means a member stopped appearing - it is not a verified
  resignation. Say "no longer in the R20" rather than "left the union".
- Ghanaian English, plain numbers, no markdown headings.`;

export async function POST(req: NextRequest) {
  await requireStaff();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "not_configured", message: "The AI assistant needs an ANTHROPIC_API_KEY set on the server." },
      { status: 503 },
    );
  }

  const { question } = (await req.json()) as { question?: string };
  if (!question || question.trim().length < 3) {
    return NextResponse.json({ error: "empty", message: "Ask a question." }, { status: 400 });
  }

  const context = await buildAssistantContext();
  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: `DATA SNAPSHOT:\n\n${context}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: question.trim() }],
    });

    const answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    await logAudit({ action: "assistant.query", details: { question: question.trim().slice(0, 300) } });
    return NextResponse.json({ answer });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "api", message: e.message }, { status: e.status ?? 500 });
    }
    return NextResponse.json({ error: "unknown", message: String(e) }, { status: 500 });
  }
}
