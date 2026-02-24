import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new OpenAI({ apiKey });
    const { clothes, mode } = await req.json();

    const prompt = `
あなたはスタイリストです。
以下の服データから ${mode === "work" ? "仕事用" : "普段用"} のコーデを1セット選んでください。

必ずJSONだけ返してください（説明文なし）。
形式:
{ "top": 0, "bottom": 0, "outer": 0 }

制約:
- top は 0 〜 ${Math.max(0, clothes.tops.length - 1)}
- bottom は 0 〜 ${Math.max(0, clothes.bottoms.length - 1)}
- outer は 0 〜 ${Math.max(0, clothes.outers.length - 1)}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    return new Response(content, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}