import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";

type Rec = Record<string, unknown>;

export type QuizTakingOption = { id: string; answer_text: string; position: number };
export type QuizTakingQuestion = {
  id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | string;
  position: number;
  options: QuizTakingOption[];
};
export type QuizAttemptHistoryItem = {
  id: string;
  quiz_id: string;
  score: number;
  percent: number;
  attempt_number: number;
  created_at: string;
};
export type QuizTakingPayload = {
  quiz: { id: string; title: string; description: string | null; course_id?: string | null; lesson_id?: string | null };
  questions: QuizTakingQuestion[];
  attempts: QuizAttemptHistoryItem[];
};
export type QuizSubmitResult = {
  quiz_id: string;
  course_id: string;
  score: number;
  percent: number;
  correct_count: number;
  total_questions: number;
  attempt?: QuizAttemptHistoryItem & { result_data?: unknown };
  details: Array<{
    question_id: string;
    question_text: string;
    selected_option_ids: string[];
    selected_answers?: { id: string; answer_text: string }[];
    correct_option_ids: string[];
    is_correct: boolean;
    explanation: string;
    correct_answers: { id: string; answer_text: string }[];
  }>;
  progress?: unknown;
  progress_warning?: string | null;
};

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}

function messageFromBackend(value: unknown): string | null {
  const error = asRecord(asRecord(value)?.error);
  const message = error?.message;
  const code = error?.code;
  if (typeof message === "string" && message.trim()) return toUserErrorMessage({ error: { code, message } }, "Не удалось выполнить действие. Попробуйте ещё раз.");
  if (typeof code === "string" && code.trim()) return toUserErrorMessage({ error: { code } }, "Не удалось выполнить действие. Попробуйте ещё раз.");
  return null;
}

async function invoke<T>(name: string, body: Rec): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T | { error: unknown }>(name, { body });
  if (error) {
    if (error.context instanceof Response) {
      try {
        const payload = await error.context.clone().json();
        const message = messageFromBackend(payload);
        if (message) return { data: null, error: message };
      } catch {
        // ignore
      }
    }
    return { data: null, error: toUserErrorMessage(error, "Не удалось выполнить действие. Попробуйте ещё раз.") };
  }
  const backendMessage = messageFromBackend(data);
  if (backendMessage) return { data: null, error: backendMessage };
  return { data: data as T, error: null };
}

export async function generateLessonQuiz(courseId: string, lessonId: string, questionsCount = 5, force = false) {
  return invoke<{ quiz_id: string; quiz: unknown; questions: unknown[]; version_id: string | null; warnings?: string[] }>("generate-lesson-quiz", {
    course_id: courseId,
    lesson_id: lessonId,
    questions_count: questionsCount,
    force,
  });
}

export async function generateCourseQuiz(courseId: string, questionsCount = 10, force = false) {
  return invoke<{ quiz_id: string; quiz: unknown; questions: unknown[]; version_id: string | null; warnings?: string[] }>("generate-course-quiz", {
    course_id: courseId,
    questions_count: questionsCount,
    force,
  });
}

export async function getQuizForTaking(quizId: string): Promise<{ data: QuizTakingPayload | null; error: string | null }> {
  return invoke<QuizTakingPayload>("get-quiz-for-taking", { quiz_id: quizId });
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Array<{ question_id: string; selected_option_ids: string[] }>,
) {
  return invoke<QuizSubmitResult>("submit-quiz-attempt", { quiz_id: quizId, answers });
}
