import { WorkLog, Teacher, PayrollResult, DailyPayroll, Holiday } from '@/types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  getDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * Parse "HH:MM" time string to total minutes from midnight
 */
export function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Convert minutes to "HH:MM" string
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculate adjusted check-in time
 * Rule: max 20 minutes before first bus departure is recognized
 */
export function calcAdjustedCheckIn(
  checkInTime: string | null,
  firstBusTime: string | null
): string | null {
  const checkInMins = timeToMinutes(checkInTime);
  const firstBusMins = timeToMinutes(firstBusTime);

  if (checkInMins === null || firstBusMins === null) return null;

  const maxEarlyMins = firstBusMins - 10;
  const adjustedMins = Math.max(checkInMins, maxEarlyMins);
  return minutesToTime(adjustedMins);
}

/**
 * Calculate daily work hours
 */
export function calcDailyWorkHours(
  adjustedCheckIn: string | null,
  arrivalTime: string | null
): number | null {
  const startMins = timeToMinutes(adjustedCheckIn);
  const endMins = timeToMinutes(arrivalTime);

  if (startMins === null || endMins === null) return null;
  if (endMins <= startMins) return null;

  return (endMins - startMins) / 60;
}

/**
 * Full payroll calculation for a teacher for a given month
 */
export function calculatePayroll(
  teacher: Teacher,
  logs: WorkLog[],
  month: string, // "YYYY-MM"
  holidays: Holiday[] = []
): PayrollResult {
  const [year, mon] = month.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, mon - 1, 1));
  const monthEnd = endOfMonth(monthStart);

  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekdays = allDays.filter((d) => !isWeekend(d));

  const logMap = new Map<string, WorkLog>();
  for (const log of logs) {
    logMap.set(log.work_date, log);
  }

  const holidayMap = new Map<string, Holiday>();
  for (const h of holidays) {
    holidayMap.set(h.holiday_date, h);
  }

  const dailyResults: DailyPayroll[] = weekdays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const log = logMap.get(dateStr);
    const dayIdx = getDay(day);

    const checkIn = log?.check_in_time ?? null;
    const firstBus = log?.first_bus_time ?? null;
    const arrival = log?.arrival_time ?? null;

    const adjustedCheckIn = calcAdjustedCheckIn(checkIn, firstBus);
    const workHours = calcDailyWorkHours(adjustedCheckIn, arrival);

    const holidayInfo = holidayMap.get(dateStr) || null;

    const isMissing =
      !holidayInfo && (
        !log ||
        !log.check_in_time ||
        !log.first_bus_time ||
        !log.last_dropoff_time ||
        !log.arrival_time
      );

    return {
      date: dateStr,
      dayOfWeek: DAY_NAMES[dayIdx],
      checkInTime: checkIn,
      firstBusTime: firstBus,
      adjustedCheckIn,
      arrivalTime: arrival,
      workHours,
      memo: log?.memo ?? null,
      isMissing,
      holidayInfo,
    };
  });

  const totalWorkHours = dailyResults.reduce(
    (sum, d) => sum + (d.workHours ?? 0),
    0
  );

  const totalSalary = totalWorkHours * teacher.hourly_rate;

  return {
    teacher,
    month,
    logs: dailyResults,
    totalWorkHours: Math.round(totalWorkHours * 100) / 100,
    totalSalary: Math.round(totalSalary),
  };
}

/**
 * Get weekdays for a given month (YYYY-MM)
 */
export function getWeekdaysOfMonth(month: string): Date[] {
  const [year, mon] = month.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, mon - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  return allDays.filter((d) => !isWeekend(d));
}

export function formatKoreanDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayIdx = getDay(date);
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} (${DAY_NAMES[dayIdx]})`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}시간 ${m}분`;
}

export function maskName(name: string): string {
  if (!name || name.length < 2) return name;
  const chars = name.split('');
  chars[name.length - 2] = '*';
  return chars.join('');
}
