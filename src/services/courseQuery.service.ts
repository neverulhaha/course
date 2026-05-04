/**
 * Чтение курсов для списков и метрик (дашборд, недавние, наполненность).
 */
import { supabase } from "@/lib/supabase/client";
import type { CourseStatus } from "@/entities/course/courseStatus";
import { normalizeCourseStatus } from "@/entities/course/courseStatus";
import type { CourseContentMetrics } from "@/entities/course/courseStatus";
import { lessonContentRowHasContent } from "@/entities/course/lessonContentJson";
import type { DashboardCourse } from "@/entities/course/readModels";
import { formatRuDate } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";

export type { DashboardCourse };

export async function fetchCourseContentMetrics(courseId: string): Promise<CourseContentMetrics> {
  const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
  const mids = (modules ?? []).map((m) => str(asRecord(m)?.id)).filter(Boolean) as string[];
  if (mids.length === 0) return { moduleCount: 0, lessonCount: 0, filledCount: 0 };

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, content_status")
    .in("module_id", mids);

  const lessonRows = lessons ?? [];
  const lessonIds = lessonRows.map((l) => str(asRecord(l)?.id)).filter(Boolean) as string[];
  const lessonCount = lessonIds.length;

  let filled = lessonRows.filter((l) => {
    const status = str(asRecord(l)?.content_status);
    return status === "generated" || status === "edited";
  }).length;

  if (filled === 0 && lessonIds.length > 0) {
    const { data: contents } = await supabase
      .from("lesson_contents")
      .select("lesson_id, theory_text, examples_text, practice_text, checklist_text")
      .in("lesson_id", lessonIds);
    filled = (contents ?? []).filter((row) => lessonContentRowHasContent(row)).length;
  }

  return { moduleCount: mids.length, lessonCount, filledCount: filled };
}

export async function listDashboardCourses(authorId: string): Promise<{ courses: DashboardCourse[]; error: Error | null }> {
  const { data: courses, error: cErr } = await supabase
    .from("courses")
    .select("id, title, author_id, updated_at, created_at, status")
    .eq("author_id", authorId)
    .order("updated_at", { ascending: false });

  if (cErr) return { courses: [], error: cErr };
  const list = courses ?? [];
  if (list.length === 0) return { courses: [], error: null };

  const courseIds = list.map((c) => c.id as string);
  const { data: modules } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
  const moduleRows = modules ?? [];
  const moduleIds = moduleRows.map((m) => m.id as string);

  const { data: lessons } = moduleIds.length > 0
    ? await supabase.from("lessons").select("id, module_id, content_status").in("module_id", moduleIds)
    : { data: [] as unknown[] };

  const lessonRows = lessons ?? [];
  const lessonIds = lessonRows.map((l) => str(asRecord(l)?.id)).filter(Boolean) as string[];

  const { data: contents } = lessonIds.length > 0
    ? await supabase
        .from("lesson_contents")
        .select("lesson_id, theory_text, examples_text, practice_text, checklist_text")
        .in("lesson_id", lessonIds)
    : { data: [] as unknown[] };

  const contentByLesson = new Map<string, unknown>();
  for (const row of contents ?? []) {
    const rr = asRecord(row);
    const lid = str(rr?.lesson_id);
    if (lid) contentByLesson.set(lid, rr);
  }

  const { data: qaRows } = await supabase
    .from("qa_reports")
    .select("course_id, total_score, created_at")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false });

  const qaByCourse = new Map<string, number>();
  for (const q of qaRows ?? []) {
    const cid = str(asRecord(q)?.course_id);
    if (!cid || qaByCourse.has(cid)) continue;
    const score = num(asRecord(q)?.total_score);
    if (score != null) qaByCourse.set(cid, score);
  }

  const modulesByCourse = new Map<string, string[]>();
  for (const m of moduleRows) {
    const cid = str(asRecord(m)?.course_id);
    const mid = str(asRecord(m)?.id);
    if (!cid || !mid) continue;
    const arr = modulesByCourse.get(cid) ?? [];
    arr.push(mid);
    modulesByCourse.set(cid, arr);
  }

  const lessonsByModule = new Map<string, string[]>();
  const statusByLesson = new Map<string, string | null>();
  for (const l of lessonRows) {
    const lr = asRecord(l);
    const mid = str(lr?.module_id);
    const lid = str(lr?.id);
    if (!mid || !lid) continue;
    const arr = lessonsByModule.get(mid) ?? [];
    arr.push(lid);
    lessonsByModule.set(mid, arr);
    statusByLesson.set(lid, str(lr?.content_status));
  }

  const result: DashboardCourse[] = [];
  for (const c of list) {
    const cr = asRecord(c);
    const id = str(cr?.id);
    if (!id) continue;
    const mids = modulesByCourse.get(id) ?? [];
    let lessonCount = 0;
    let filled = 0;
    for (const mid of mids) {
      const lids = lessonsByModule.get(mid) ?? [];
      lessonCount += lids.length;
      for (const lid of lids) {
        const status = statusByLesson.get(lid);
        if (status === "generated" || status === "edited" || lessonContentRowHasContent(contentByLesson.get(lid))) filled += 1;
      }
    }
    const progress = lessonCount === 0 ? 0 : Math.round((filled / lessonCount) * 100);
    const status: CourseStatus = normalizeCourseStatus(str(cr?.status));
    const updated = str(cr?.updated_at) ?? str(cr?.created_at);
    result.push({
      id,
      title: str(cr?.title) ?? "Без названия",
      status,
      progress,
      modules: mids.length,
      lessons: lessonCount,
      lastModified: formatRuDate(updated),
      qaScore: qaByCourse.get(id) ?? null,
    });
  }

  return { courses: result, error: null };
}

export async function listRecentCourses(authorId: string, limit: number): Promise<{ items: { id: string; title: string }[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, updated_at")
    .eq("author_id", authorId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { items: [], error };
  return {
    items: (data ?? []).map((r) => {
      const row = asRecord(r);
      return { id: str(row?.id) ?? "", title: str(row?.title) ?? "Без названия" };
    }),
    error: null,
  };
}
