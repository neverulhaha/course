BEGIN;

CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = p_course_id AND c.author_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_module_course_owner(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = p_module_id AND c.author_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_lesson_course_owner(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = p_lesson_id AND c.author_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quiz_course_owner(p_quiz_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quizzes q
    LEFT JOIN public.courses c ON c.id = q.course_id
    LEFT JOIN public.lessons l ON l.id = q.lesson_id
    LEFT JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses lc ON lc.id = m.course_id
    WHERE q.id = p_quiz_id
      AND COALESCE(c.author_id, lc.author_id) = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_question_course_owner(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.questions qn
    WHERE qn.id = p_question_id
      AND public.is_quiz_course_owner(qn.quiz_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_course_access_status(p_course_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT author_id INTO v_author FROM public.courses WHERE id = p_course_id;
  IF v_author IS NULL THEN RETURN 'not_found'; END IF;
  IF v_author <> auth.uid() THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_module_access_status(p_module_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course_id uuid; v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT m.course_id, c.author_id INTO v_course_id, v_author
  FROM public.modules m
  JOIN public.courses c ON c.id = m.course_id
  WHERE m.id = p_module_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF v_author <> auth.uid() THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lesson_access_status(p_lesson_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course_id uuid; v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT m.course_id, c.author_id INTO v_course_id, v_author
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = p_lesson_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF v_author <> auth.uid() THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_access_status(p_quiz_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course_id uuid; v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT COALESCE(q.course_id, m.course_id), COALESCE(c.author_id, lc.author_id)
    INTO v_course_id, v_author
  FROM public.quizzes q
  LEFT JOIN public.courses c ON c.id = q.course_id
  LEFT JOIN public.lessons l ON l.id = q.lesson_id
  LEFT JOIN public.modules m ON m.id = l.module_id
  LEFT JOIN public.courses lc ON lc.id = m.course_id
  WHERE q.id = p_quiz_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF v_author <> auth.uid() THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_version_access_status(p_version_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course_id uuid; v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  SELECT cv.course_id, c.author_id INTO v_course_id, v_author
  FROM public.course_versions cv
  JOIN public.courses c ON c.id = cv.course_id
  WHERE cv.id = p_version_id;
  IF v_course_id IS NULL THEN RETURN 'not_found'; END IF;
  IF p_course_id IS NOT NULL AND p_course_id <> v_course_id THEN RETURN 'forbidden'; END IF;
  IF v_author <> auth.uid() THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.is_course_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_module_course_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_lesson_course_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_quiz_course_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_question_course_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_course_access_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_module_access_status(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_access_status(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_access_status(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_version_access_status(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_course_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_module_course_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lesson_course_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_quiz_course_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_question_course_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_access_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_access_status(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_access_status(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_access_status(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_version_access_status(uuid, uuid) TO authenticated;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'courses','modules','lessons','lesson_contents','sources','quizzes','questions','answer_options',
        'quiz_attempts','lesson_completions','assignment_submissions','progress','qa_reports','course_versions','audit_logs'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY courses_owner_select ON public.courses FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY courses_owner_insert ON public.courses FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY courses_owner_update ON public.courses FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY courses_owner_delete ON public.courses FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY modules_owner_select ON public.modules FOR SELECT TO authenticated USING (public.is_course_owner(course_id));
CREATE POLICY modules_owner_insert ON public.modules FOR INSERT TO authenticated WITH CHECK (public.is_course_owner(course_id));
CREATE POLICY modules_owner_update ON public.modules FOR UPDATE TO authenticated USING (public.is_course_owner(course_id)) WITH CHECK (public.is_course_owner(course_id));
CREATE POLICY modules_owner_delete ON public.modules FOR DELETE TO authenticated USING (public.is_course_owner(course_id));

CREATE POLICY lessons_owner_select ON public.lessons FOR SELECT TO authenticated USING (public.is_lesson_course_owner(id));
CREATE POLICY lessons_owner_insert ON public.lessons FOR INSERT TO authenticated WITH CHECK (public.is_module_course_owner(module_id));
CREATE POLICY lessons_owner_update ON public.lessons FOR UPDATE TO authenticated USING (public.is_lesson_course_owner(id)) WITH CHECK (public.is_module_course_owner(module_id));
CREATE POLICY lessons_owner_delete ON public.lessons FOR DELETE TO authenticated USING (public.is_lesson_course_owner(id));

CREATE POLICY lesson_contents_owner_select ON public.lesson_contents FOR SELECT TO authenticated USING (public.is_lesson_course_owner(lesson_id));
CREATE POLICY lesson_contents_owner_insert ON public.lesson_contents FOR INSERT TO authenticated WITH CHECK (public.is_lesson_course_owner(lesson_id));
CREATE POLICY lesson_contents_owner_update ON public.lesson_contents FOR UPDATE TO authenticated USING (public.is_lesson_course_owner(lesson_id)) WITH CHECK (public.is_lesson_course_owner(lesson_id));
CREATE POLICY lesson_contents_owner_delete ON public.lesson_contents FOR DELETE TO authenticated USING (public.is_lesson_course_owner(lesson_id));

CREATE POLICY sources_owner_select ON public.sources FOR SELECT TO authenticated USING (public.is_course_owner(course_id));
CREATE POLICY sources_owner_insert ON public.sources FOR INSERT TO authenticated WITH CHECK (public.is_course_owner(course_id));
CREATE POLICY sources_owner_update ON public.sources FOR UPDATE TO authenticated USING (public.is_course_owner(course_id)) WITH CHECK (public.is_course_owner(course_id));
CREATE POLICY sources_owner_delete ON public.sources FOR DELETE TO authenticated USING (public.is_course_owner(course_id));

CREATE POLICY quizzes_owner_select ON public.quizzes FOR SELECT TO authenticated USING ((course_id IS NOT NULL AND public.is_course_owner(course_id)) OR (lesson_id IS NOT NULL AND public.is_lesson_course_owner(lesson_id)));
CREATE POLICY quizzes_owner_insert ON public.quizzes FOR INSERT TO authenticated WITH CHECK ((course_id IS NOT NULL AND public.is_course_owner(course_id)) OR (lesson_id IS NOT NULL AND public.is_lesson_course_owner(lesson_id)));
CREATE POLICY quizzes_owner_update ON public.quizzes FOR UPDATE TO authenticated USING ((course_id IS NOT NULL AND public.is_course_owner(course_id)) OR (lesson_id IS NOT NULL AND public.is_lesson_course_owner(lesson_id))) WITH CHECK ((course_id IS NOT NULL AND public.is_course_owner(course_id)) OR (lesson_id IS NOT NULL AND public.is_lesson_course_owner(lesson_id)));
CREATE POLICY quizzes_owner_delete ON public.quizzes FOR DELETE TO authenticated USING ((course_id IS NOT NULL AND public.is_course_owner(course_id)) OR (lesson_id IS NOT NULL AND public.is_lesson_course_owner(lesson_id)));

CREATE POLICY questions_owner_select ON public.questions FOR SELECT TO authenticated USING (public.is_quiz_course_owner(quiz_id));
CREATE POLICY questions_owner_insert ON public.questions FOR INSERT TO authenticated WITH CHECK (public.is_quiz_course_owner(quiz_id));
CREATE POLICY questions_owner_update ON public.questions FOR UPDATE TO authenticated USING (public.is_quiz_course_owner(quiz_id)) WITH CHECK (public.is_quiz_course_owner(quiz_id));
CREATE POLICY questions_owner_delete ON public.questions FOR DELETE TO authenticated USING (public.is_quiz_course_owner(quiz_id));

CREATE POLICY answer_options_owner_select ON public.answer_options FOR SELECT TO authenticated USING (public.is_question_course_owner(question_id));
CREATE POLICY answer_options_owner_insert ON public.answer_options FOR INSERT TO authenticated WITH CHECK (public.is_question_course_owner(question_id));
CREATE POLICY answer_options_owner_update ON public.answer_options FOR UPDATE TO authenticated USING (public.is_question_course_owner(question_id)) WITH CHECK (public.is_question_course_owner(question_id));
CREATE POLICY answer_options_owner_delete ON public.answer_options FOR DELETE TO authenticated USING (public.is_question_course_owner(question_id));

CREATE POLICY quiz_attempts_user_select ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_quiz_course_owner(quiz_id));
CREATE POLICY quiz_attempts_user_insert ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_quiz_course_owner(quiz_id));

CREATE POLICY lesson_completions_user_select ON public.lesson_completions FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_lesson_course_owner(lesson_id));
CREATE POLICY lesson_completions_user_insert ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_lesson_course_owner(lesson_id));

CREATE POLICY assignment_submissions_user_select ON public.assignment_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_lesson_course_owner(lesson_id));
CREATE POLICY assignment_submissions_user_insert ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_lesson_course_owner(lesson_id));
CREATE POLICY assignment_submissions_user_update ON public.assignment_submissions FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_lesson_course_owner(lesson_id)) WITH CHECK (user_id = auth.uid() AND public.is_lesson_course_owner(lesson_id));

CREATE POLICY progress_user_select ON public.progress FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_course_owner(course_id));
CREATE POLICY progress_user_insert ON public.progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_course_owner(course_id));
CREATE POLICY progress_user_update ON public.progress FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_course_owner(course_id)) WITH CHECK (user_id = auth.uid() AND public.is_course_owner(course_id));

CREATE POLICY qa_reports_owner_select ON public.qa_reports FOR SELECT TO authenticated USING (public.is_course_owner(course_id));
CREATE POLICY qa_reports_owner_insert ON public.qa_reports FOR INSERT TO authenticated WITH CHECK (public.is_course_owner(course_id));
CREATE POLICY qa_reports_owner_update ON public.qa_reports FOR UPDATE TO authenticated USING (public.is_course_owner(course_id)) WITH CHECK (public.is_course_owner(course_id));
CREATE POLICY qa_reports_owner_delete ON public.qa_reports FOR DELETE TO authenticated USING (public.is_course_owner(course_id));

CREATE POLICY course_versions_owner_select ON public.course_versions FOR SELECT TO authenticated USING (public.is_course_owner(course_id));
CREATE POLICY course_versions_owner_insert ON public.course_versions FOR INSERT TO authenticated WITH CHECK (public.is_course_owner(course_id) AND created_by = auth.uid());
CREATE POLICY course_versions_owner_update ON public.course_versions FOR UPDATE TO authenticated USING (public.is_course_owner(course_id)) WITH CHECK (public.is_course_owner(course_id) AND created_by = auth.uid());
CREATE POLICY course_versions_owner_delete ON public.course_versions FOR DELETE TO authenticated USING (public.is_course_owner(course_id));

CREATE POLICY audit_logs_owner_select ON public.audit_logs FOR SELECT TO authenticated USING ((course_id IS NULL AND actor_user_id = auth.uid()) OR (course_id IS NOT NULL AND public.is_course_owner(course_id)));
CREATE POLICY audit_logs_owner_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid() AND (course_id IS NULL OR public.is_course_owner(course_id)));

COMMIT;
