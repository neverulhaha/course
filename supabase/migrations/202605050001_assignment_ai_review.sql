-- Stores hidden answer keys for generated practical tasks and AI review results for submissions.
ALTER TABLE public.lesson_contents
  ADD COLUMN IF NOT EXISTS expected_answer_text text,
  ADD COLUMN IF NOT EXISTS assessment_criteria_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS review_score integer,
  ADD COLUMN IF NOT EXISTS review_status text,
  ADD COLUMN IF NOT EXISTS review_feedback text,
  ADD COLUMN IF NOT EXISTS review_json jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignment_submissions_review_score_range'
      AND conrelid = 'public.assignment_submissions'::regclass
  ) THEN
    ALTER TABLE public.assignment_submissions
      ADD CONSTRAINT assignment_submissions_review_score_range
      CHECK (review_score IS NULL OR (review_score >= 0 AND review_score <= 100));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignment_submissions_review_status_check'
      AND conrelid = 'public.assignment_submissions'::regclass
  ) THEN
    ALTER TABLE public.assignment_submissions
      ADD CONSTRAINT assignment_submissions_review_status_check
      CHECK (review_status IS NULL OR review_status IN ('passed', 'needs_revision'));
  END IF;
END $$;
