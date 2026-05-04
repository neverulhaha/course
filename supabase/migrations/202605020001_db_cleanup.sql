BEGIN;

CREATE OR REPLACE FUNCTION public._cleanup_try_drop_constraint(
  p_table regclass,
  p_constraint text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', p_table, p_constraint);
  RAISE NOTICE 'Dropped duplicate constraint if it existed: %.%', p_table::text, p_constraint;
EXCEPTION
  WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Skipped %.% because another object depends on it', p_table::text, p_constraint;
  WHEN undefined_object THEN
    RAISE NOTICE 'Skipped %.% because it does not exist', p_table::text, p_constraint;
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipped %.% because of: %', p_table::text, p_constraint, SQLERRM;
END;
$$;

SELECT public._cleanup_try_drop_constraint('public.answer_options', 'answer_options_question_position_unique');
SELECT public._cleanup_try_drop_constraint('public.course_versions', 'course_versions_course_id_id_unique');
SELECT public._cleanup_try_drop_constraint('public.course_versions', 'course_versions_course_version_unique');
SELECT public._cleanup_try_drop_constraint('public.lesson_completions', 'lesson_completions_user_lesson_unique');
SELECT public._cleanup_try_drop_constraint('public.lessons', 'lessons_module_position_unique');
SELECT public._cleanup_try_drop_constraint('public.modules', 'modules_course_position_unique');
SELECT public._cleanup_try_drop_constraint('public.progress', 'progress_user_course_unique');
SELECT public._cleanup_try_drop_constraint('public.questions', 'questions_quiz_position_unique');
SELECT public._cleanup_try_drop_constraint('public.quiz_attempts', 'quiz_attempts_quiz_user_attempt_unique');

DROP FUNCTION IF EXISTS public._cleanup_try_drop_constraint(regclass, text);

CREATE INDEX IF NOT EXISTS idx_course_versions_course_version_desc
  ON public.course_versions (course_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_qa_reports_course_created_desc
  ON public.qa_reports (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_course_created_desc
  ON public.audit_logs (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz_created_desc
  ON public.quiz_attempts (user_id, quiz_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_lesson
  ON public.lesson_completions (user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_progress_user_course
  ON public.progress (user_id, course_id);

COMMIT;
