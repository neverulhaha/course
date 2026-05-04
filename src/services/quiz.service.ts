import { supabase } from "@/lib/supabase/client";

type Rec = Record<string, unknown>;

export type QuizTakingOption = { id: string; answer_text: string; position: number };
export type QuizTakingQuestion = {
  id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | string;
  position: number;
  options: QuizTakingOption[];
};
export type QuizTakingPayload = {
  quiz: { id: string; title: string; description: string | null; course_id?: string | null; lesson_id?: string | null };
  questions: QuizTakingQuestion[];
};
export type QuizSubmitResult = {
  quiz_id: string;
  course_id: string;
  score: number;
  percent: number;
  correct_count: number;
  total_questions: number;
  details: Array<{
    question_id: string;
    question_text: string;
    selected_option_ids: string[];
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
  if (typeof message === "string" && message.trim()) {
    return typeof code === "string" && code.trim() ? `${message} (${code})` : message;
  }
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
    return { data: null, error: error.message || "Не удалось выполнить действие" };
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

export async function fetchQuizForTakingSecure(quizId: string): Promise<{ data: QuizTakingPayload | null; error: string | null }> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, title, description, course_id, lesson_id")
    .eq("id", quizId)
    .maybeSingle();
  if (quizError) return { data: null, error: quizError.message };
  const quizRec = asRecord(quiz);
  if (!quizRec) return { data: null, error: "Квиз не найден" };

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, question_type, position")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });
  if (questionsError) return { data: null, error: questionsError.message };

  const resultQuestions: QuizTakingQuestion[] = [];
  for (const q of questions ?? []) {
    const qr = asRecord(q);
    const questionId = String(qr?.id ?? "");
    if (!questionId) continue;
    const { data: options, error: optionsError } = await supabase
      .from("answer_options")
      .select("id, answer_text, position")
      .eq("question_id", questionId)
      .order("position", { ascending: true });
    if (optionsError) return { data: null, error: optionsError.message };
    resultQuestions.push({
      id: questionId,
      question_text: String(qr?.question_text ?? "Вопрос"),
      question_type: String(qr?.question_type ?? "single_choice"),
      position: Number(qr?.position ?? resultQuestions.length + 1),
      options: (options ?? []).map((o) => {
        const or = asRecord(o);
        return {
          id: String(or?.id ?? ""),
          answer_text: String(or?.answer_text ?? ""),
          position: Number(or?.position ?? 0),
        };
      }).filter((option) => option.id && option.answer_text),
    });
  }

  return {
    data: {
      quiz: {
        id: String(quizRec.id ?? ""),
        title: String(quizRec.title ?? "Квиз"),
        description: typeof quizRec.description === "string" ? quizRec.description : null,
        course_id: typeof quizRec.course_id === "string" ? quizRec.course_id : null,
        lesson_id: typeof quizRec.lesson_id === "string" ? quizRec.lesson_id : null,
      },
      questions: resultQuestions,
    },
    error: null,
  };
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Array<{ question_id: string; selected_option_ids: string[] }>,
) {
  return invoke<QuizSubmitResult>("submit-quiz-attempt", { quiz_id: quizId, answers });
}
