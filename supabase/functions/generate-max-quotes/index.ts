// supabase/functions/generate-max-quotes/index.ts
// ---------------------------------------------------------------------------
// Sinh quote động lực cho mascot Max bằng Lovable AI Gateway.
// Input:  { category, language, count, vibe? }
// Output: { quotes: string[] }
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORY_HINT: Record<string, string> = {
  motivation: "truyền cảm hứng, động viên chung chung",
  study:      "khuyến khích luyện tập IELTS đều đặn mỗi ngày",
  exam:       "trấn an, giảm áp lực trước và trong khi làm bài thi",
  celebration:"chúc mừng học viên vừa hoàn thành bài tập / đạt thành tích",
  empty:      "động viên khi chưa có dữ liệu, mời học viên bắt đầu hành trình",
  loading:    "câu ngắn dí dỏm hiển thị khi đang tải dữ liệu",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { category = "motivation", language = "vi", count = 5, vibe = "" } = await req.json();
    const n = Math.min(Math.max(Number(count) || 5, 1), 20);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const lang = language === "en" ? "English" : "tiếng Việt";
    const hint = CATEGORY_HINT[category] ?? CATEGORY_HINT.motivation;
    const system =
      `Bạn là Max — mascot AI thân thiện của một nền tảng luyện thi IELTS dành cho học viên Việt Nam. ` +
      `Phong cách: ấm áp, gần gũi, trẻ trung, không sến, không sáo rỗng. ` +
      `Mỗi câu ngắn (tối đa 18 từ), không emoji, không số thứ tự, không markdown.`;
    const user =
      `Sinh ${n} câu (${lang}) thuộc nhóm "${category}" — ${hint}.` +
      (vibe ? ` Yêu cầu thêm: ${vibe}.` : "") +
      ` Trả về qua tool call.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "return_quotes",
            description: "Return generated motivational quotes",
            parameters: {
              type: "object",
              properties: {
                quotes: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                },
              },
              required: ["quotes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_quotes" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gateway ${resp.status}`);
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { quotes: [] };
    const quotes: string[] = (parsed.quotes ?? [])
      .map((q: unknown) => String(q ?? "").trim())
      .filter((q: string) => q.length > 0)
      .slice(0, n);

    return new Response(JSON.stringify({ quotes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-max-quotes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});