// trigger-sync-types — v3 (force redeploy)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_REPOS = [
  "dennyng13/ieltspractice-aa5eb78f",
  "dennyng13/learningsuperadmin",
  "dennyng13/teachingwithlearningplus-52cac937",
] as const;
type AllowedRepo = (typeof ALLOWED_REPOS)[number];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("[trigger-sync-types] auth error", userError);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? undefined;

    // ── Admin check ──
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("[trigger-sync-types] role fetch error", rolesError);
      return jsonResponse({ error: "Could not verify permissions" }, 500);
    }

    const isAdmin = (roles ?? []).some(
      (r: { role: string }) => r.role === "admin" || r.role === "super_admin",
    );
    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden: admin role required" }, 403);
    }

    // ── Validate input ──
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const body = (rawBody ?? {}) as { repo?: string; triggered_by?: string };
    if (!body.repo || !ALLOWED_REPOS.includes(body.repo as AllowedRepo)) {
      return jsonResponse(
        { error: "Invalid or missing 'repo'", allowed: ALLOWED_REPOS },
        400,
      );
    }
    const repo = body.repo as AllowedRepo;
    const triggeredBy = body.triggered_by ?? userEmail ?? "unknown";

    // ── GitHub PAT ──
    const githubPat = Deno.env.get("GITHUB_PAT");
    if (!githubPat) {
      return jsonResponse(
        { error: "GITHUB_PAT secret is not configured on the server" },
        500,
      );
    }

    // ── Dispatch workflow ──
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/sync-types.yml/dispatches`;
    const ghRes = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "lovable-trigger-sync-types",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { triggered_by: triggeredBy },
      }),
    });

    if (ghRes.status === 204) {
      const [owner, repoName] = repo.split("/");
      const actionsUrl = `https://github.com/${owner}/${repoName}/actions/workflows/sync-types.yml`;
      return jsonResponse({
        success: true,
        actions_url: actionsUrl,
        triggered_by: triggeredBy,
      });
    }

    // ── Error mapping ──
    let detail = "";
    try {
      detail = await ghRes.text();
    } catch {
      detail = "";
    }
    console.error("[trigger-sync-types] GitHub API error", ghRes.status, detail);

    let message = `GitHub API responded with ${ghRes.status}`;
    if (ghRes.status === 401) {
      message = "GitHub PAT không hợp lệ hoặc đã hết hạn (401).";
    } else if (ghRes.status === 403) {
      message =
        "GitHub PAT không có quyền chạy workflow trên repo này (403). Kiểm tra scope `workflow` và quyền truy cập repo.";
    } else if (ghRes.status === 404) {
      message =
        "Không tìm thấy repo hoặc workflow `sync-types.yml` trên branch `main` (404).";
    } else if (ghRes.status === 422) {
      message =
        "GitHub từ chối request (422). Workflow có thể chưa tồn tại trên `main` hoặc input không hợp lệ.";
    }

    return jsonResponse({ error: message, status: ghRes.status, detail }, 502);
  } catch (err) {
    console.error("[trigger-sync-types] unexpected error", err);
    return jsonResponse(
      { error: "Internal server error", detail: String(err) },
      500,
    );
  }
});