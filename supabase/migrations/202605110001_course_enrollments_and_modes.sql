BEGIN;

-- Course audience: the author can create a course for self-study or for assigned learners.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_type text NOT NULL DEFAULT 'self_study';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_course_type_check'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_course_type_check
      CHECK (course_type IN ('self_study', 'for_students'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'learner' CHECK (role IN ('owner', 'learner')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS course_enrollments_course_id_idx ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS course_enrollments_user_id_idx ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS course_enrollments_active_user_idx ON public.course_enrollments(user_id, status) WHERE status = 'active';

-- Existing courses should immediately behave as personal courses owned by their authors.
INSERT INTO public.course_enrollments (course_id, user_id, role, status, invited_by)
SELECT c.id, c.author_id, 'owner', 'active', c.author_id
FROM public.courses c
WHERE c.author_id IS NOT NULL
ON CONFLICT (course_id, user_id) DO UPDATE
SET role = 'owner',
    status = 'active',
    updated_at = now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_enrollments_updated_at ON public.course_enrollments;
CREATE TRIGGER trg_course_enrollments_updated_at
BEFORE UPDATE ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_course_owner_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS NOT NULL THEN
    INSERT INTO public.course_enrollments (course_id, user_id, role, status, invited_by)
    VALUES (NEW.id, NEW.author_id, 'owner', 'active', NEW.author_id)
    ON CONFLICT (course_id, user_id) DO UPDATE
    SET role = 'owner', status = 'active', updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_courses_owner_enrollment ON public.courses;
CREATE TRIGGER trg_courses_owner_enrollment
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.ensure_course_owner_enrollment();

-- Helpers. Owner means the course author. Learner access is course-specific via course_enrollments.
CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.author_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.author_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    WHERE ce.course_id = p_course_id
      AND ce.user_id = auth.uid()
      AND ce.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_module(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modules m
    WHERE m.id = p_module_id
      AND public.can_access_course(m.course_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id
      AND public.can_access_course(m.course_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_quiz(p_quiz_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quizzes q
    LEFT JOIN public.lessons l ON l.id = q.lesson_id
    LEFT JOIN public.modules m ON m.id = l.module_id
    WHERE q.id = p_quiz_id
      AND public.can_access_course(COALESCE(q.course_id, m.course_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_course_access_status(p_course_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'unauthorized';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN 'not_found';
  END IF;

  IF public.can_access_course(p_course_id) THEN
    RETURN 'ok';
  END IF;

  RETURN 'forbidden';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_module_access_status(p_module_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT m.course_id INTO v_course_id FROM public.modules m WHERE m.id = p_module_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF public.can_access_course(v_course_id) THEN RETURN 'ok'; END IF;
  RETURN 'forbidden';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lesson_access_status(p_lesson_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT m.course_id INTO v_course_id
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF public.can_access_course(v_course_id) THEN RETURN 'ok'; END IF;
  RETURN 'forbidden';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_access_status(p_quiz_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT COALESCE(q.course_id, m.course_id) INTO v_course_id
  FROM public.quizzes q
  LEFT JOIN public.lessons l ON l.id = q.lesson_id
  LEFT JOIN public.modules m ON m.id = l.module_id
  WHERE q.id = p_quiz_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF public.can_access_course(v_course_id) THEN RETURN 'ok'; END IF;
  RETURN 'forbidden';
END;
$$;

-- RPC used by the React wizard. This overload accepts the new p_course_type argument.
CREATE OR REPLACE FUNCTION public.create_course_draft(
  p_title text,
  p_topic text,
  p_level text,
  p_goal text DEFAULT NULL,
  p_duration integer DEFAULT NULL,
  p_format text DEFAULT NULL,
  p_generation_mode text DEFAULT NULL,
  p_generation_depth text DEFAULT 'plan',
  p_source_mode text DEFAULT NULL,
  p_language text DEFAULT 'ru',
  p_tone text DEFAULT 'neutral',
  p_source_type text DEFAULT NULL,
  p_raw_text text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_file_ref text DEFAULT NULL,
  p_only_source_mode boolean DEFAULT false,
  p_course_type text DEFAULT 'self_study'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_generation_mode text := COALESCE(NULLIF(trim(p_generation_mode), ''), 'scratch');
  v_source_mode text := COALESCE(NULLIF(trim(p_source_mode), ''), 'none');
  v_course_type text := COALESCE(NULLIF(trim(p_course_type), ''), 'self_study');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '28000';
  END IF;

  IF COALESCE(NULLIF(trim(p_topic), ''), '') = '' THEN
    RAISE EXCEPTION 'INVALID_INPUT: topic is required';
  END IF;

  IF v_course_type NOT IN ('self_study', 'for_students') THEN
    v_course_type := 'self_study';
  END IF;

  INSERT INTO public.courses (
    author_id,
    title,
    topic,
    level,
    goal,
    duration,
    format,
    generation_mode,
    generation_depth,
    source_mode,
    language,
    tone,
    status,
    course_type
  ) VALUES (
    v_user_id,
    COALESCE(NULLIF(trim(p_title), ''), NULLIF(trim(p_topic), ''), 'Новый курс'),
    COALESCE(NULLIF(trim(p_topic), ''), NULLIF(trim(p_title), ''), 'Новый курс'),
    COALESCE(NULLIF(trim(p_level), ''), 'Начальный'),
    NULLIF(trim(COALESCE(p_goal, '')), ''),
    p_duration,
    NULLIF(trim(COALESCE(p_format, '')), ''),
    v_generation_mode,
    COALESCE(NULLIF(trim(p_generation_depth), ''), 'plan'),
    v_source_mode,
    COALESCE(NULLIF(trim(p_language), ''), 'ru'),
    COALESCE(NULLIF(trim(p_tone), ''), 'neutral'),
    'draft',
    v_course_type
  )
  RETURNING id INTO v_course_id;

  INSERT INTO public.course_enrollments (course_id, user_id, role, status, invited_by)
  VALUES (v_course_id, v_user_id, 'owner', 'active', v_user_id)
  ON CONFLICT (course_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active', updated_at = now();

  IF v_generation_mode = 'source'
     OR v_source_mode NOT IN ('none', '')
     OR NULLIF(trim(COALESCE(p_raw_text, '')), '') IS NOT NULL
     OR NULLIF(trim(COALESCE(p_source_url, '')), '') IS NOT NULL
     OR NULLIF(trim(COALESCE(p_file_ref, '')), '') IS NOT NULL THEN
    INSERT INTO public.sources (
      course_id,
      source_type,
      raw_text,
      source_url,
      file_ref,
      only_source_mode
    ) VALUES (
      v_course_id,
      COALESCE(NULLIF(trim(p_source_type), ''), 'text'),
      NULLIF(trim(COALESCE(p_raw_text, '')), ''),
      NULLIF(trim(COALESCE(p_source_url, '')), ''),
      NULLIF(trim(COALESCE(p_file_ref, '')), ''),
      COALESCE(p_only_source_mode, false)
    );
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, course_id, entity_type, entity_id, action, payload)
  VALUES (v_user_id, v_course_id, 'course', v_course_id, 'course_created', jsonb_build_object('course_type', v_course_type, 'generation_mode', v_generation_mode))
  ON CONFLICT DO NOTHING;

  RETURN v_course_id;
END;
$$;

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_enrollments_owner_select ON public.course_enrollments;
DROP POLICY IF EXISTS course_enrollments_owner_insert ON public.course_enrollments;
DROP POLICY IF EXISTS course_enrollments_owner_update ON public.course_enrollments;
DROP POLICY IF EXISTS course_enrollments_owner_delete ON public.course_enrollments;
DROP POLICY IF EXISTS courses_member_select ON public.courses;
DROP POLICY IF EXISTS modules_member_select ON public.modules;
DROP POLICY IF EXISTS lessons_member_select ON public.lessons;
DROP POLICY IF EXISTS lesson_contents_member_select ON public.lesson_contents;
DROP POLICY IF EXISTS quizzes_member_select ON public.quizzes;
DROP POLICY IF EXISTS questions_member_select ON public.questions;
DROP POLICY IF EXISTS answer_options_member_select ON public.answer_options;
DROP POLICY IF EXISTS progress_member_select ON public.progress;
DROP POLICY IF EXISTS progress_member_insert ON public.progress;
DROP POLICY IF EXISTS progress_member_update ON public.progress;
DROP POLICY IF EXISTS lesson_completions_member_select ON public.lesson_completions;
DROP POLICY IF EXISTS lesson_completions_member_insert ON public.lesson_completions;
DROP POLICY IF EXISTS assignment_submissions_member_select ON public.assignment_submissions;
DROP POLICY IF EXISTS assignment_submissions_member_insert ON public.assignment_submissions;
DROP POLICY IF EXISTS assignment_submissions_member_update ON public.assignment_submissions;
DROP POLICY IF EXISTS quiz_attempts_member_select ON public.quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_member_insert ON public.quiz_attempts;

CREATE POLICY course_enrollments_owner_select ON public.course_enrollments
FOR SELECT TO authenticated
USING (public.is_course_owner(course_id) OR user_id = auth.uid());

CREATE POLICY course_enrollments_owner_insert ON public.course_enrollments
FOR INSERT TO authenticated
WITH CHECK (public.is_course_owner(course_id) AND invited_by = auth.uid());

CREATE POLICY course_enrollments_owner_update ON public.course_enrollments
FOR UPDATE TO authenticated
USING (public.is_course_owner(course_id))
WITH CHECK (public.is_course_owner(course_id));

CREATE POLICY course_enrollments_owner_delete ON public.course_enrollments
FOR DELETE TO authenticated
USING (public.is_course_owner(course_id));

-- Learner read policies. Existing owner policies remain in place for write/edit operations.
CREATE POLICY courses_member_select ON public.courses
FOR SELECT TO authenticated
USING (public.can_access_course(id));

CREATE POLICY modules_member_select ON public.modules
FOR SELECT TO authenticated
USING (public.can_access_course(course_id));

CREATE POLICY lessons_member_select ON public.lessons
FOR SELECT TO authenticated
USING (public.can_access_lesson(id));

CREATE POLICY lesson_contents_member_select ON public.lesson_contents
FOR SELECT TO authenticated
USING (public.can_access_lesson(lesson_id));

CREATE POLICY quizzes_member_select ON public.quizzes
FOR SELECT TO authenticated
USING ((course_id IS NOT NULL AND public.can_access_course(course_id)) OR (lesson_id IS NOT NULL AND public.can_access_lesson(lesson_id)));

CREATE POLICY questions_member_select ON public.questions
FOR SELECT TO authenticated
USING (public.can_access_quiz(quiz_id));

CREATE POLICY answer_options_member_select ON public.answer_options
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.questions q
  WHERE q.id = answer_options.question_id
    AND public.can_access_quiz(q.quiz_id)
));

CREATE POLICY progress_member_select ON public.progress
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.can_access_course(course_id));

CREATE POLICY progress_member_insert ON public.progress
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_access_course(course_id));

CREATE POLICY progress_member_update ON public.progress
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.can_access_course(course_id))
WITH CHECK (user_id = auth.uid() AND public.can_access_course(course_id));

CREATE POLICY lesson_completions_member_select ON public.lesson_completions
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.can_access_lesson(lesson_id));

CREATE POLICY lesson_completions_member_insert ON public.lesson_completions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_access_lesson(lesson_id));

CREATE POLICY assignment_submissions_member_select ON public.assignment_submissions
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.can_access_lesson(lesson_id));

CREATE POLICY assignment_submissions_member_insert ON public.assignment_submissions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_access_lesson(lesson_id));

CREATE POLICY assignment_submissions_member_update ON public.assignment_submissions
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.can_access_lesson(lesson_id))
WITH CHECK (user_id = auth.uid() AND public.can_access_lesson(lesson_id));

CREATE POLICY quiz_attempts_member_select ON public.quiz_attempts
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND public.can_access_quiz(quiz_id));

CREATE POLICY quiz_attempts_member_insert ON public.quiz_attempts
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_access_quiz(quiz_id));

REVOKE ALL ON FUNCTION public.can_access_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_module(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_lesson(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_quiz(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_course_draft(text,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,boolean,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_module(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_course_draft(text,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,boolean,text) TO authenticated;

COMMIT;
