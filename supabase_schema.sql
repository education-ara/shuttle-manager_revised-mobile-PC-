-- ============================================================
-- Academy Shuttle Management System - Supabase Schema
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. teachers 테이블
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 15000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. work_logs 테이블
CREATE TABLE IF NOT EXISTS work_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  work_date         DATE NOT NULL,
  check_in_time     TIME,
  first_bus_time    TIME,
  last_dropoff_time TIME,
  arrival_time      TIME,
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 하루에 선생님당 1개의 기록만 허용
  CONSTRAINT work_logs_teacher_date_unique UNIQUE (teacher_id, work_date)
);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_logs_updated_at
  BEFORE UPDATE ON work_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 설정
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- anon key로 읽기/쓰기 모두 허용 (앱에서 인증 관리)
CREATE POLICY "teachers_all" ON teachers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "work_logs_all" ON work_logs
  FOR ALL USING (true) WITH CHECK (true);

-- 5. 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_work_logs_teacher_id ON work_logs (teacher_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_work_date  ON work_logs (work_date);
CREATE INDEX IF NOT EXISTS idx_work_logs_teacher_date ON work_logs (teacher_id, work_date);

-- 6. 샘플 데이터 (선택사항 - 테스트용)
-- INSERT INTO teachers (name, start_date, hourly_rate) VALUES
--   ('김지수', '2024-03-01', 15000),
--   ('이영희', '2024-04-15', 14500),
--   ('박철수', '2023-09-01', 16000),
--   ('최민준', '2024-01-10', 15500);
