// supabase/functions/send-class-invitations/index.ts
// ---------------------------------------------------------------------------
// STUB: Gửi email mời GV vào lớp.
// FE gọi function này NGAY SAU `request_replacement_teacher` RPC. Khi
// stub trả {ok:true} không kèm `sent` count → FE chỉ log, không rollback.
// Logic gửi email thật (Lovable Email queue) sẽ implement ở bước sau.
// ---------------------------------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InvitePayload {
  class_id: string;
  teacher_ids: string[];
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── Auth: chỉ user đăng nhập (admin check vẫn ở RPC) ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsRes?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ─── Validate body ───
    const body = (await req.json().catch(() => null)) as InvitePayload | null;
    if (!body || !isUuid(body.class_id)) {
      return json({ error: "class_id (uuid) is required" }, 400);
    }
    if (!Array.isArray(body.teacher_ids) || body.teacher_ids.length === 0) {
      return json({ error: "teacher_ids must be a non-empty array" }, 400);
    }
    if (!body.teacher_ids.every(isUuid)) {
      return json({ error: "teacher_ids must all be uuids" }, 400);
    }

    // ─── STUB: chỉ log + trả ok. Thay bằng enqueue_email khi hạ tầng email
    //     của Lovable Cloud được bật cho project. ───
    console.log(
      `[send-class-invitations] STUB: would email ${body.teacher_ids.length} teacher(s) for class ${body.class_id}`,
    );

    return json({
      ok: true,
      stub: true,
      message: "Edge function stub — email gateway not wired yet.",
      queued: body.teacher_ids.length,
    });
  } catch (e) {
    console.error("[send-class-invitations] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
