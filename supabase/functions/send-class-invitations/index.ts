// supabase/functions/send-class-invitations/index.ts
// ---------------------------------------------------------------------------
// STUB: Gửi email mời GV vào lớp.
// FE gọi function này NGAY SAU `request_replacement_teacher` RPC.
// Trả response chuẩn:
//   { ok, stub?, queued, sent, failed, results: [{ teacher_id, ok, email?, error? }] }
// FE dựa vào `results` để biết GV nào fail và cho admin retry.
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

interface DeliveryResult {
  teacher_id: string;
  ok: boolean;
  email?: string | null;
  full_name?: string | null;
  error?: string;
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

    // ─── Lookup teacher emails để FE có thể hiển thị tên/email khi báo lỗi ───
    const { data: teachers, error: teacherErr } = await supabase
      .from("teachers")
      .select("id, full_name, email")
      .in("id", body.teacher_ids);
    if (teacherErr) {
      return json({ error: `Lookup teachers failed: ${teacherErr.message}` }, 500);
    }

    // ─── STUB delivery: per-teacher result. GV thiếu email = fail. ───
    // Khi hạ tầng email Lovable Cloud bật → swap block này bằng
    // `enqueue_email` cho từng GV và bắt error từng cái.
    const results: DeliveryResult[] = body.teacher_ids.map((tid) => {
      const t = teachers?.find((x) => x.id === tid);
      if (!t) {
        return { teacher_id: tid, ok: false, error: "Không tìm thấy giáo viên" };
      }
      if (!t.email) {
        return {
          teacher_id: tid,
          ok: false,
          full_name: t.full_name,
          error: "Giáo viên chưa có email",
        };
      }
      // STUB: coi như queued thành công.
      return { teacher_id: tid, ok: true, full_name: t.full_name, email: t.email };
    });

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    console.log(
      `[send-class-invitations] STUB class=${body.class_id} sent=${sent} failed=${failed}`,
    );

    // 207-style multi-status: trả 200 luôn, FE đọc `failed` để xử lý UX.
    return json({
      ok: failed === 0,
      stub: true,
      message: "Edge function stub — email gateway not wired yet.",
      queued: body.teacher_ids.length,
      sent,
      failed,
      results,
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
