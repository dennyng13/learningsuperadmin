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

interface GhRun {
  id: number;
  name: string | null;
  display_title: string | null;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  event: string;
  actor?: { login?: string; avatar_url?: string };
  triggering_actor?: { login?: string };
  head_branch: string | null;
  head_sha: string;
  pull_requests?: Array<{ number: number; html_url?: string; url?: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
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
      console.error("[list-sync-type-runs] auth error", userError);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("[list-sync-type-runs] role fetch error", rolesError);
      return jsonResponse({ error: "Could not verify permissions" }, 500);
    }
    const isAdmin = (roles ?? []).some(
      (r: { role: string }) => r.role === "admin" || r.role === "super_admin",
    );
    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden: admin role required" }, 403);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const body = (rawBody ?? {}) as { repo?: string; per_page?: number };
    if (!body.repo || !ALLOWED_REPOS.includes(body.repo as AllowedRepo)) {
      return jsonResponse(
        { error: "Invalid or missing 'repo'", allowed: ALLOWED_REPOS },
        400,
      );
    }
    const repo = body.repo as AllowedRepo;
    const perPage = Math.min(Math.max(body.per_page ?? 15, 1), 50);

    const githubPat = Deno.env.get("GITHUB_PAT");
    if (!githubPat) {
      return jsonResponse({ error: "GITHUB_PAT secret is not configured" }, 500);
    }

    const url = `https://api.github.com/repos/${repo}/actions/workflows/sync-types.yml/runs?per_page=${perPage}`;
    const ghRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "lovable-list-sync-type-runs",
      },
    });

    const text = await ghRes.text();
    if (!ghRes.ok) {
      console.error("[list-sync-type-runs] GitHub error", ghRes.status, text);
      let message = `GitHub API responded with ${ghRes.status}`;
      if (ghRes.status === 401) message = "GitHub PAT không hợp lệ hoặc đã hết hạn (401).";
      else if (ghRes.status === 403) message = "GitHub PAT thiếu quyền đọc Actions trên repo này (403).";
      else if (ghRes.status === 404) message = "Không tìm thấy workflow sync-types.yml trên repo (404).";
      return jsonResponse({ error: message, status: ghRes.status, detail: text }, 502);
    }

    let parsedJson: { workflow_runs?: GhRun[] } = {};
    try {
      parsedJson = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Invalid JSON from GitHub" }, 502);
    }

    const runs = (parsedJson.workflow_runs ?? []).map((r) => ({
      id: r.id,
      title: r.display_title ?? r.name ?? `Run #${r.id}`,
      status: r.status,
      conclusion: r.conclusion,
      event: r.event,
      branch: r.head_branch,
      html_url: r.html_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      run_started_at: r.run_started_at,
      actor: r.triggering_actor?.login ?? r.actor?.login ?? null,
      actor_avatar: r.actor?.avatar_url ?? null,
      pull_request:
        r.pull_requests && r.pull_requests.length > 0
          ? {
              number: r.pull_requests[0].number,
              html_url:
                r.pull_requests[0].html_url ??
                `https://github.com/${repo}/pull/${r.pull_requests[0].number}`,
            }
          : null,
    }));

    return jsonResponse({ success: true, repo, runs });
  } catch (err) {
    console.error("[list-sync-type-runs] unexpected error", err);
    return jsonResponse({ error: "Internal server error", detail: String(err) }, 500);
  }
});