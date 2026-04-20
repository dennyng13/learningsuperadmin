import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { allMockTests } from "@shared/data/mockTests";

export interface MockTestGroup {
  id: string; // book_name slugified or "mock-" prefix
  name: string;
  bookName?: string;
  description?: string;
  readingId?: string;
  listeningId?: string;
  writingId?: string;
  speakingId?: string;
  totalDuration: number; // seconds
  skillCount: number;
  source: "db" | "mock";
  // Filters / classification
  program?: string;          // 'ielts' | 'wre' | 'customized' | 'other'
  courseLevel?: string;      // tên level
  tags?: string[];           // resource_tags
  isIelts?: boolean;         // program=ielts hoặc có tag 'ielts'
  assessmentIds?: string[];  // tất cả assessment thuộc bundle
}

/**
 * Fetches published assessments from DB and groups them by book_name
 * to form mock test bundles. Falls back to include mock data.
 */
export function useMockTests() {
  return useQuery<MockTestGroup[]>({
    queryKey: ["mock-tests"],
    queryFn: async () => {
      // Chỉ fetch assessments dạng "test" (loại trừ exercise)
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, name, book_name, section_type, duration, status, program, course_level, content_type")
        .eq("status", "published")
        .neq("content_type", "exercise")
        .order("book_name")
        .order("section_type");

      const dbGroups: MockTestGroup[] = [];

      // Lấy toàn bộ tag liên quan để gộp vào group
      const ids = (assessments || []).map((a: any) => a.id);
      let tagsByAssessment: Record<string, string[]> = {};
      if (ids.length > 0) {
        const { data: tags } = await supabase
          .from("resource_tags")
          .select("resource_id, tag")
          .eq("resource_type", "assessment")
          .in("resource_id", ids);
        (tags || []).forEach((t: any) => {
          if (!tagsByAssessment[t.resource_id]) tagsByAssessment[t.resource_id] = [];
          tagsByAssessment[t.resource_id].push(t.tag);
        });
      }

      if (assessments && assessments.length > 0) {
        // Group by book_name
        const byBook = new Map<string, typeof assessments>();
        const standalone: typeof assessments = [];

        for (const a of assessments) {
          const key = a.book_name || `__standalone_${a.id}`;
          if (!a.book_name) {
            standalone.push(a);
          } else {
            if (!byBook.has(key)) byBook.set(key, []);
            byBook.get(key)!.push(a);
          }
        }

        const buildClassification = (items: any[]) => {
          const programs = new Set<string>();
          const levels = new Set<string>();
          const tags = new Set<string>();
          items.forEach((a) => {
            if (a.program) programs.add(a.program);
            if (a.course_level) levels.add(a.course_level);
            (tagsByAssessment[a.id] || []).forEach((t) => tags.add(t.toLowerCase()));
          });
          // Ưu tiên program rõ ràng nhất; nếu trộn lẫn → lấy cái đầu
          const program = programs.size > 0 ? Array.from(programs)[0] : undefined;
          const courseLevel = levels.size > 0 ? Array.from(levels)[0] : undefined;
          const tagArr = Array.from(tags);
          const isIelts = program === "ielts" || tagArr.includes("ielts");
          return { program, courseLevel, tags: tagArr, isIelts };
        };

        // Create groups from book_name bundles
        for (const [bookName, items] of byBook) {
          const cls = buildClassification(items);
          const group: MockTestGroup = {
            id: `db-${items[0].id}`,
            name: bookName,
            bookName,
            totalDuration: items.reduce((s, a) => s + a.duration, 0),
            skillCount: items.length,
            source: "db",
            assessmentIds: items.map((a) => a.id),
            ...cls,
          };

          for (const a of items) {
            switch (a.section_type) {
              case "READING": group.readingId = a.id; break;
              case "LISTENING": group.listeningId = a.id; break;
              case "WRITING": group.writingId = a.id; break;
              case "SPEAKING": group.speakingId = a.id; break;
            }
          }

          dbGroups.push(group);
        }

        // Standalone assessments as individual entries
        for (const a of standalone) {
          const cls = buildClassification([a]);
          dbGroups.push({
            id: `db-${a.id}`,
            name: a.name,
            totalDuration: a.duration,
            skillCount: 1,
            source: "db",
            assessmentIds: [a.id],
            readingId: a.section_type === "READING" ? a.id : undefined,
            listeningId: a.section_type === "LISTENING" ? a.id : undefined,
            writingId: a.section_type === "WRITING" ? a.id : undefined,
            speakingId: a.section_type === "SPEAKING" ? a.id : undefined,
            ...cls,
          });
        }
      }

      // Include mock data (for backward compatibility) — coi là IELTS mặc định
      const mockGroups: MockTestGroup[] = allMockTests.map((mt) => ({
        id: mt.id,
        name: mt.name,
        bookName: mt.bookName,
        description: mt.description,
        readingId: mt.readingId,
        listeningId: mt.listeningId,
        writingId: mt.writingId,
        speakingId: mt.speakingId,
        totalDuration: 170 * 60,
        skillCount: 4,
        source: "mock" as const,
        program: "ielts",
        isIelts: true,
        tags: ["ielts"],
      }));

      return [...dbGroups, ...mockGroups];
    },
  });
}
