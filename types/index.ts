export interface Teacher {
  id: string;
  name: string;
  start_date: string;
  hourly_rate: number;
  created_at: string;
  status: '근무' | '휴직' | '퇴사';
  last_work_date: string | null;
  leave_start_date: string | null;
  leave_end_date: string | null;
}

export interface WorkLog {
  id: string;
  teacher_id: string;
  work_date: string;
  check_in_time: string | null;
  first_bus_time: string | null;
  last_dropoff_time: string | null;
  arrival_time: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLogWithTeacher extends WorkLog {
  teacher: Teacher;
}

export interface PayrollResult {
  teacher: Teacher;
  month: string;
  logs: DailyPayroll[];
  totalWorkHours: number;
  totalSalary: number;
}

export interface DailyPayroll {
  id?: string;
  date: string;
  dayOfWeek: string;
  checkInTime: string | null;
  firstBusTime: string | null;
  adjustedCheckIn: string | null;
  arrivalTime: string | null;
  workHours: number | null;
  memo: string | null;
  isMissing: boolean;
  holidayInfo?: Holiday | null;
}

export interface Holiday {
  id: string;
  holiday_date: string;
  name: string | null;
  is_academy_holiday: boolean;
  created_at: string;
}
