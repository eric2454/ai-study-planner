import "server-only";
export async function askAI(instructions: string, input: unknown) {
  if (!process.env.OPENAI_API_KEY) throw new Error("aiUnavailable");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input: JSON.stringify(input),
      max_output_tokens: 1400,
      store: false,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("aiUnavailable");
  const data = (await response.json()) as {
    output?: { content?: { type: string; text?: string }[] }[];
  };
  const text = data.output
    ?.flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("\n");
  if (!text) throw new Error("aiUnavailable");
  return text;
}
