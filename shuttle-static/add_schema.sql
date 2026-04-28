-- ============================================================
-- 추가 스키마 (Supabase SQL Editor에 실행)
-- ============================================================

-- teachers 테이블에 phone 컬럼 추가
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;

-- work_logs 테이블에 work_type 컬럼 추가
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT 'work';

-- holidays 테이블 생성
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'school_holiday',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_all" ON holidays
  FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays (date);
