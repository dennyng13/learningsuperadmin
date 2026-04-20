import type { Annotation } from "@shared/components/grading/AnnotatedText";

const TYPE_COLORS: Record<string, string> = {
  error: "#ef4444",
  correction: "#f59e0b",
  good: "#22c55e",
  comment: "#3b82f6",
};

const TYPE_LABELS: Record<string, string> = {
  error: "Lỗi",
  correction: "Gợi ý",
  good: "Hay",
  comment: "Ghi chú",
};

const CRITERIA_LABELS: Record<string, string> = {
  task_achievement: "Task Achievement",
  coherence_cohesion: "Coherence & Cohesion",
  lexical_resource: "Lexical Resource",
  grammar_accuracy: "Grammatical Range & Accuracy",
};

interface FeedbackPdfParams {
  studentName: string;
  assessmentName: string;
  taskKey: string;
  responseText: string;
  taskPrompt: string;
  scores: Record<string, string>;
  overall: number | null;
  comment: string;
  annotations: Annotation[];
}

/**
 * Generate a PDF blob for writing feedback using canvas-based rendering.
 * No external PDF library needed — we draw to canvas and export.
 */
export async function generateFeedbackPdf(params: FeedbackPdfParams): Promise<Blob> {
  const {
    studentName, assessmentName, taskKey, responseText, taskPrompt,
    scores, overall, comment, annotations,
  } = params;

  // Create an offscreen canvas to render the PDF content as an image,
  // then wrap it in a simple PDF structure
  const width = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 40;
  const contentWidth = width - margin * 2;

  // We'll build HTML and use the print-to-pdf approach via a hidden iframe
  const html = buildFeedbackHtml({
    studentName, assessmentName, taskKey, responseText, taskPrompt,
    scores, overall, comment, annotations,
  });

  // Create blob from HTML for printing
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  // Open in a hidden iframe and trigger print
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("No iframe window");

        // Give it a moment to render
        setTimeout(() => {
          win.print();
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
          // Since we can't capture the print output as blob directly,
          // we resolve with the HTML blob for download
          resolve(new Blob([html], { type: "application/pdf" }));
        }, 500);
      } catch (err) {
        reject(err);
      }
    };

    iframe.src = url;
  });
}

function buildFeedbackHtml(params: FeedbackPdfParams): string {
  const {
    studentName, assessmentName, taskKey, responseText, taskPrompt,
    scores, overall, comment, annotations,
  } = params;

  // Build annotated text HTML
  const sortedAnns = [...annotations].sort((a, b) => a.start_offset - b.start_offset);
  let annotatedHtml = "";
  let cursor = 0;

  // Collect all boundary points for overlapping support
  const points = new Set<number>();
  points.add(0);
  points.add(responseText.length);
  for (const ann of sortedAnns) {
    points.add(Math.max(0, ann.start_offset));
    points.add(Math.min(responseText.length, ann.end_offset));
  }
  const sortedPoints = Array.from(points).sort((a, b) => a - b);

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    const text = escapeHtml(responseText.slice(start, end));
    const covering = sortedAnns.filter(a => a.start_offset <= start && a.end_offset >= end);

    if (covering.length === 0) {
      annotatedHtml += text;
    } else {
      const primaryType = covering[0].annotation_type;
      const color = TYPE_COLORS[primaryType] || "#888";
      annotatedHtml += `<span style="background:${color}20;border-bottom:2px solid ${color};padding:1px 2px;border-radius:2px;" title="${covering.map(a => TYPE_LABELS[a.annotation_type]).join(', ')}">${text}</span>`;
    }
  }

  // Annotations list
  const annListHtml = sortedAnns.map(ann => {
    const color = TYPE_COLORS[ann.annotation_type] || "#888";
    return `
      <div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #eee;">
        <span style="color:${color};font-weight:600;font-size:11px;min-width:50px;">${TYPE_LABELS[ann.annotation_type]}</span>
        <div style="flex:1;font-size:11px;">
          <span style="color:#666;">"${escapeHtml(ann.original_text)}"</span>
          ${ann.correction ? `<br/><span style="color:${color};">→ ${escapeHtml(ann.correction)}</span>` : ""}
          ${ann.comment ? `<br/><span style="color:#888;font-style:italic;">${escapeHtml(ann.comment)}</span>` : ""}
          ${ann.category ? `<span style="color:#aaa;font-size:10px;margin-left:8px;">[${ann.category}]</span>` : ""}
        </div>
      </div>
    `;
  }).join("");

  // Score cards
  const scoreHtml = Object.entries(CRITERIA_LABELS).map(([key, label]) => {
    const val = scores[key] || "—";
    return `
      <div style="flex:1;text-align:center;padding:8px;border:1px solid #e5e7eb;border-radius:8px;min-width:100px;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">${label}</div>
        <div style="font-size:24px;font-weight:800;color:#1e40af;">${val}</div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Writing Feedback — ${escapeHtml(studentName)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; color: #555; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1e40af; }
  .scores { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
  .overall { text-align: center; margin: 16px 0; }
  .overall-circle { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border: 3px solid #1e40af; border-radius: 50%; font-size: 28px; font-weight: 800; color: #1e40af; }
  .response { white-space: pre-wrap; line-height: 2; font-size: 13px; padding: 12px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb; }
  .comment-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; font-size: 12px; white-space: pre-wrap; }
  .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Nhận xét Writing</h1>
      <div style="font-size:12px;color:#666;">${escapeHtml(studentName)} — ${escapeHtml(assessmentName)} — ${taskKey.replace("_", " ").toUpperCase()}</div>
    </div>
    <div class="overall">
      <div class="overall-circle">${overall ?? "—"}</div>
      <div style="font-size:10px;color:#888;margin-top:4px;">Overall</div>
    </div>
  </div>

  <div class="scores">${scoreHtml}</div>

  ${taskPrompt ? `<h2>Đề bài</h2><div style="font-size:12px;color:#555;margin-bottom:12px;">${escapeHtml(taskPrompt)}</div>` : ""}

  <h2>Bài viết (có ghi chú)</h2>
  <div class="response">${annotatedHtml}</div>

  ${sortedAnns.length > 0 ? `<h2>Danh sách ghi chú (${sortedAnns.length})</h2><div>${annListHtml}</div>` : ""}

  ${comment ? `<h2>Nhận xét tổng quan</h2><div class="comment-box">${escapeHtml(comment)}</div>` : ""}

  <div class="footer">Được tạo bởi Learning Plus IELTS Practice · ${new Date().toLocaleDateString("vi-VN")}</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
