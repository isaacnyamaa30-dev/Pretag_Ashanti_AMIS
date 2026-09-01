"use client";

import { useState } from "react";

type Turn = { q: string; a: string | null; error?: string };

const SUGGESTIONS = [
  "Which zones are declining, and by how much?",
  "Summarise membership movement in the latest month.",
  "Which zone contributed most to the change?",
  "How is the region tracking overall?",
];

export function AssistantChat({ configured }: { configured: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setTurns((t) => [...t, { q: question, a: null }]);
    setQ("");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setTurns((t) =>
        t.map((turn, i) =>
          i === t.length - 1
            ? res.ok
              ? { ...turn, a: data.answer }
              : { ...turn, a: null, error: data.message ?? "Something went wrong." }
            : turn,
        ),
      );
    } catch {
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, a: null, error: "Network error." } : turn)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <p className="text-sm text-decline bg-decline-wash border border-decline/30 rounded px-3 py-2 font-mono">
          The AI assistant is not yet configured. Add <code>OPENAI_API_KEY</code> to the server
          environment (Vercel &rarr; Settings &rarr; Environment Variables) to enable it.
        </p>
      )}

      {turns.length === 0 && configured && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-sm text-left border border-border rounded px-3 py-2 hover:bg-surface-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="self-end max-w-[85%] bg-primary text-on-primary rounded-lg px-3 py-2 text-sm">{t.q}</div>
          <div className="self-start w-[92%] bg-surface border border-border rounded-lg px-4 py-3 text-sm">
            {t.a === null && !t.error && (
              <div className="flex flex-col gap-2 py-0.5">
                <div className="shimmer h-3.5 w-11/12" />
                <div className="shimmer h-3.5 w-4/5" />
                <div className="shimmer h-3.5 w-2/3" />
              </div>
            )}
            {t.error && <span className="text-decline">{t.error}</span>}
            {t.a && <p className="whitespace-pre-wrap leading-relaxed">{t.a}</p>}
          </div>
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2 sticky bottom-0 bg-ground py-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={!configured || busy}
          placeholder="Ask about the membership data…"
          className="grow border border-border-strong rounded bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          disabled={!configured || busy || !q.trim()}
          className="font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-4 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
      <p className="text-[11px] font-mono text-ink-3">
        Answers come only from the approved membership database. The assistant cannot see raw uploads
        or member personal details beyond zone/district counts.
      </p>
    </div>
  );
}
