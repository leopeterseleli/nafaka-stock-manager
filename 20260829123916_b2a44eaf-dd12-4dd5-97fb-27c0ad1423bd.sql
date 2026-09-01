ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_question TEXT,
  ADD COLUMN IF NOT EXISTS security_answer_hash TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_security_question_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_security_question_check
  CHECK (security_question IS NULL OR security_question IN ('place_of_birth','year_of_birth'));