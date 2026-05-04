import type { LessonBlock, LessonContent } from "./types";

function asRecord(v: unknown): Record<string, unknown> | null { return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null; }
function str(v: unknown): string | null { return typeof v === "string" ? v : v != null ? String(v) : null; }
function nonEmpty(v: unknown): string | null { const s = str(v)?.trim(); return s ? s : null; }
export const emptyLessonContent: LessonContent = { goal: null, blocks: [] };

function block(id: string, type: LessonBlock["type"], label: string, content: string): LessonBlock {
  return { id, type, label, content, aiGenerated: true, hasSource: false, qaIssue: null };
}

export function parseLessonContentRow(raw: unknown, fallbackGoal?: string | null): LessonContent {
  const r = asRecord(raw);
  if (!r) return { goal: fallbackGoal ?? null, blocks: [] };
  if (r.content != null) return parseLessonContentJson(r.content, fallbackGoal);
  const blocks: LessonBlock[] = [];
  const theory = nonEmpty(r.theory_text);
  const examples = nonEmpty(r.examples_text);
  const practice = nonEmpty(r.practice_text);
  const checklist = nonEmpty(r.checklist_text);
  if (theory) blocks.push(block("theory_text", "text", "Теория", theory));
  if (examples) blocks.push(block("examples_text", "example", "Примеры", examples));
  if (practice) blocks.push(block("practice_text", "practice", "Практика", practice));
  if (checklist) blocks.push(block("checklist_text", "text", "Чек-лист", checklist));
  return { goal: str(r.goal) ?? fallbackGoal ?? null, blocks };
}

export function lessonContentRowHasContent(raw: unknown): boolean { return parseLessonContentRow(raw).blocks.length > 0; }

export function parseLessonContentJson(raw: unknown, fallbackGoal?: string | null): LessonContent {
  const rec = asRecord(raw);
  if (!rec) return { goal: fallbackGoal ?? null, blocks: [] };
  if ("theory_text" in rec || "examples_text" in rec || "practice_text" in rec || "checklist_text" in rec) return parseLessonContentRow(rec, fallbackGoal);
  const goal = str(rec.goal) ?? fallbackGoal ?? null;
  const blocksRaw = rec.blocks;
  if (!Array.isArray(blocksRaw)) return { goal, blocks: [] };
  const blocks: LessonBlock[] = [];
  for (const b of blocksRaw) {
    const br = asRecord(b); if (!br) continue;
    const type = str(br.type);
    const t = type === "text" || type === "example" || type === "practice" || type === "code" ? type : "text";
    blocks.push({
      id: str(br.id) ?? crypto.randomUUID(), type: t, label: str(br.label) ?? "Блок", content: str(br.content) ?? "",
      description: str(br.description) ?? undefined, aiGenerated: Boolean(br.aiGenerated), hasSource: Boolean(br.hasSource),
      qaIssue: br.qaIssue && typeof br.qaIssue === "object" ? {
        severity: (str(asRecord(br.qaIssue)?.severity) as "low" | "medium" | "high") ?? "low",
        message: str(asRecord(br.qaIssue)?.message) ?? "", suggestion: str(asRecord(br.qaIssue)?.suggestion) ?? "",
      } : null,
    });
  }
  return { goal, blocks };
}
