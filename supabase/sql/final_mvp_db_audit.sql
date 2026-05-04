-- Final MVP database audit helpers.
-- Run these queries in Supabase SQL Editor before/after applying the cleanup migration.

-- 1. Duplicate constraints by identical definition.
WITH normalized AS (
  SELECT
    conrelid::regclass::text AS table_name,
    contype,
    pg_get_constraintdef(oid) AS definition,
    array_agg(conname ORDER BY conname) AS constraint_names,
    count(*) AS duplicates_count
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace
  GROUP BY conrelid, contype, pg_get_constraintdef(oid)
)
SELECT *
FROM normalized
WHERE duplicates_count > 1
ORDER BY table_name, definition;

-- 2. Duplicate indexes by identical index definition after removing the index name.
WITH idx AS (
  SELECT
    schemaname,
    tablename,
    indexname,
    regexp_replace(indexdef, 'INDEX\\s+\\S+\\s+', 'INDEX <name> ', 'i') AS normalized_indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
), grouped AS (
  SELECT
    tablename,
    normalized_indexdef,
    array_agg(indexname ORDER BY indexname) AS index_names,
    count(*) AS duplicates_count
  FROM idx
  GROUP BY tablename, normalized_indexdef
)
SELECT *
FROM grouped
WHERE duplicates_count > 1
ORDER BY tablename;

-- 3. RLS policies overview by table and command.
SELECT
  schemaname,
  tablename,
  cmd,
  array_agg(policyname ORDER BY policyname) AS policies,
  count(*) AS policies_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename, cmd
ORDER BY tablename, cmd;

-- 4. Check critical status constraints.
SELECT
  conrelid::regclass::text AS table_name,
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype = 'c'
  AND conrelid::regclass::text IN ('courses', 'lessons', 'course_versions', 'assignment_submissions')
ORDER BY table_name, conname;

-- 5. Health check for a concrete course. Replace the UUID below.
WITH target AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS course_id
),
modules_base AS (
  SELECT m.* FROM modules m JOIN target t ON t.course_id = m.course_id
),
lessons_base AS (
  SELECT l.*, m.course_id, m.position AS module_position
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  JOIN target t ON t.course_id = m.course_id
),
content_base AS (
  SELECT lc.* FROM lesson_contents lc JOIN lessons_base l ON l.id = lc.lesson_id
),
quiz_base AS (
  SELECT q.* FROM quizzes q
  JOIN target t ON q.course_id = t.course_id OR q.lesson_id IN (SELECT id FROM lessons_base)
),
version_base AS (
  SELECT cv.* FROM course_versions cv JOIN target t ON t.course_id = cv.course_id
),
qa_base AS (
  SELECT qr.* FROM qa_reports qr JOIN target t ON t.course_id = qr.course_id
)
SELECT
  c.id AS course_id,
  c.title,
  c.status,
  c.current_version_id,
  (SELECT count(*) FROM modules_base) AS modules_count,
  (SELECT count(*) FROM lessons_base) AS lessons_count,
  (SELECT count(*) FROM content_base) AS lesson_contents_count,
  (SELECT count(*) FROM lessons_base WHERE content_status = 'empty') AS empty_lessons_count,
  (SELECT count(*) FROM lessons_base WHERE content_status IN ('generated', 'edited')) AS filled_lessons_count,
  (SELECT count(*) FROM quiz_base) AS quizzes_count,
  (SELECT count(*) FROM version_base) AS versions_count,
  (SELECT count(*) FROM qa_base) AS qa_reports_count,
  CASE
    WHEN c.id IS NULL THEN 'FAIL: course not found'
    WHEN (SELECT count(*) FROM modules_base) = 0 THEN 'WARN: no modules'
    WHEN (SELECT count(*) FROM lessons_base) = 0 THEN 'WARN: no lessons'
    WHEN c.status NOT IN ('draft', 'plan', 'partial', 'ready', 'archived') THEN 'FAIL: invalid status'
    ELSE 'OK: base course graph is readable'
  END AS health_result
FROM target t
LEFT JOIN courses c ON c.id = t.course_id;
