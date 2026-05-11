BEGIN;

-- Global role settings used by the UI and access checks.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_learning_navigation boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ALTER COLUMN app_role SET DEFAULT 'student';

UPDATE public.profiles
SET app_role = 'student'
WHERE app_role IS NULL
   OR app_role = ''
   OR app_role NOT IN ('student', 'teacher', 'author', 'learner', 'admin');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_app_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_role_check
  CHECK (app_role IN ('student', 'teacher', 'author', 'learner', 'admin'));

CREATE OR REPLACE FUNCTION public.can_create_courses()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.app_role, 'student') IN ('teacher', 'author', 'admin')
  );
$$;

-- Course management is allowed only for course authors whose global role can create/manage courses.
CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.can_create_courses()
  AND EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.author_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_module_course_owner(p_module_id uuid)
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
      AND public.is_course_owner(m.course_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_lesson_course_owner(p_lesson_id uuid)
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
      AND public.is_course_owner(m.course_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quiz_course_owner(p_quiz_id uuid)
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
      AND public.is_course_owner(COALESCE(q.course_id, m.course_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_question_course_owner(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.questions qn
    WHERE qn.id = p_question_id
      AND public.is_quiz_course_owner(qn.quiz_id)
  );
$$;

-- Direct table inserts/updates/deletes must also respect global role.
DROP POLICY IF EXISTS courses_owner_insert ON public.courses;
DROP POLICY IF EXISTS courses_owner_update ON public.courses;
DROP POLICY IF EXISTS courses_owner_delete ON public.courses;

CREATE POLICY courses_owner_insert
ON public.courses
FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_create_courses());

CREATE POLICY courses_owner_update
ON public.courses
FOR UPDATE TO authenticated
USING (author_id = auth.uid() AND public.can_create_courses())
WITH CHECK (author_id = auth.uid() AND public.can_create_courses());

CREATE POLICY courses_owner_delete
ON public.courses
FOR DELETE TO authenticated
USING (author_id = auth.uid() AND public.can_create_courses());

-- RPC used by the React wizard. Students are blocked at DB level too.
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

  IF NOT public.can_create_courses() THEN
    RAISE EXCEPTION 'FORBIDDEN: students cannot create courses' USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.can_create_courses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_create_courses() TO authenticated;

COMMIT;
