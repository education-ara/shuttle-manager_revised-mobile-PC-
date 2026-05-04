'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Teacher, WorkLog, Holiday } from '@/types';
import { getWeekdaysOfMonth, formatKoreanDate, maskName } from '@/lib/payroll';
import { format, addMonths, subMonths } from 'date-fns';
import { Suspense } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type RowData = {
  check_in_time: string;
  first_bus_time: string;
  last_dropoff_time: string;
  arrival_time: string;
  memo: string;
};

function TeacherPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('id');
  const monthParam = searchParams.get('month') || format(new Date(), 'yyyy-MM');

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [month, setMonth] = useState(monthParam);
  const [logs, setLogs] = useState<Map<string, WorkLog>>(new Map());
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [rowData, setRowData] = useState<Map<string, RowData>>(new Map());
  const [saveStatus, setSaveStatus] = useState<Map<string, SaveStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const weekdays = getWeekdaysOfMonth(month);

  // Fetch teacher
  useEffect(() => {
    if (!teacherId) { router.push('/'); return; }
    supabase.from('teachers').select('*').eq('id', teacherId).single()
      .then(({ data, error }) => {
        if (error || !data) { router.push('/'); return; }
        setTeacher(data);
      });
  }, [teacherId, router]);

  // Fetch logs for month
  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);

    const startDate = `${month}-01`;
    // Get the last day of the month correctly
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    supabase
      .from('work_logs')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .then(({ data }) => {
        const logMap = new Map<string, WorkLog>();
        const rdMap = new Map<string, RowData>();

        if (data) {
          for (const log of data) {
            logMap.set(log.work_date, log);
            rdMap.set(log.work_date, {
              check_in_time: log.check_in_time || '',
              first_bus_time: log.first_bus_time || '',
              last_dropoff_time: log.last_dropoff_time || '',
              arrival_time: log.arrival_time || '',
              memo: log.memo || '',
            });
          }
        }

        // Initialize empty rows for weekdays not yet logged
        for (const day of weekdays) {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (!rdMap.has(dateStr)) {
            rdMap.set(dateStr, {
              check_in_time: '',
              first_bus_time: '',
              last_dropoff_time: '',
              arrival_time: '',
              memo: '',
            });
          }
        }

        setLogs(logMap);
        setRowData(rdMap);
      });

    // Fetch holidays
    supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .then(({ data }) => {
        const hMap = new Map<string, Holiday>();
        if (data) {
          for (const h of data) hMap.set(h.holiday_date, h);
        }
        setHolidays(hMap);
        setLoading(false);
      });
  }, [teacherId, month]);

  // Save function (Manual)
  const handleSave = async (dateStr: string) => {
    const data = rowData.get(dateStr);
    if (!data || !teacherId) return;

    setSaveStatus((prev) => new Map(prev).set(dateStr, 'saving'));

    try {
      const payload = {
        teacher_id: teacherId,
        work_date: dateStr,
        check_in_time: data.check_in_time || null,
        first_bus_time: data.first_bus_time || null,
        last_dropoff_time: data.last_dropoff_time || null,
        arrival_time: data.arrival_time || null,
        memo: data.memo || null,
        updated_at: new Date().toISOString(),
      };

      const { data: newLog, error } = await supabase
        .from('work_logs')
        .upsert(payload, { onConflict: 'teacher_id,work_date' })
        .select()
        .single();

      if (error) throw error;

      if (newLog) {
        setLogs((prev) => new Map(prev).set(dateStr, newLog));
      }

      setSaveStatus((prev) => new Map(prev).set(dateStr, 'saved'));
      setTimeout(() => {
        setSaveStatus((prev) => new Map(prev).set(dateStr, 'idle'));
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus((prev) => new Map(prev).set(dateStr, 'error'));
    }
  };

  function handleFieldChange(dateStr: string, field: keyof RowData, value: string) {
    setRowData((prev) => {
      const current = prev.get(dateStr) || {
        check_in_time: '', first_bus_time: '',
        last_dropoff_time: '', arrival_time: '', memo: '',
      };
      const updated = { ...current, [field]: value };
      const next = new Map(prev).set(dateStr, updated);
      // Removed scheduleAutoSave(dateStr, updated);
      return next;
    });

    // Reset status to idle when user starts editing again
    if (saveStatus.get(dateStr) === 'saved') {
      setSaveStatus((prev) => new Map(prev).set(dateStr, 'idle'));
    }
  }

  function navigateMonth(dir: 'prev' | 'next') {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const next = dir === 'next' ? addMonths(d, 1) : subMonths(d, 1);
    setMonth(format(next, 'yyyy-MM'));
  }

  function isRowMissing(dateStr: string): boolean {
    const rd = rowData.get(dateStr);
    if (!rd) return false;
    // Only highlight if at least one field is filled but others are empty
    const hasAny = rd.check_in_time || rd.first_bus_time || rd.last_dropoff_time || rd.arrival_time;
    const hasMissing = !rd.check_in_time || !rd.first_bus_time || !rd.last_dropoff_time || !rd.arrival_time;
    return !!(hasAny && hasMissing);
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>로딩 중...</span>
        </div>
      </div>
    );
  }

  const [year, mon] = month.split('-').map(Number);
  const monthLabel = `${year}년 ${mon}월`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 md:px-8 py-3
                         bg-stone-50/90 backdrop-blur-md border-b border-stone-200/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-on-surface 
                       hover:bg-surface-container rounded-lg transition-all border border-stone-200"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            <span className="text-xs font-bold">홈으로</span>
          </button>
          <div className="h-6 w-[1px] bg-stone-200 mx-1 hidden sm:block" />
          <div>
            <div className="text-sm font-bold text-on-surface font-headline">{maskName(teacher.name)} 선생님</div>
            <div className="text-xs text-on-surface-variant">{monthLabel} 근무일지</div>
          </div>
        </div>

        {/* Global save status */}
        <div className="flex items-center gap-2 text-xs">
          {Array.from(saveStatus.values()).some((s) => s === 'saving') && (
            <span className="flex items-center gap-1 text-amber-600 saving-pulse">
              <span className="material-symbols-outlined text-sm">cloud_sync</span>
              저장 중...
            </span>
          )}
          {Array.from(saveStatus.values()).some((s) => s === 'error') && (
            <span className="flex items-center gap-1 text-error">
              <span className="material-symbols-outlined text-sm">cloud_off</span>
              저장 실패
            </span>
          )}
          {!Array.from(saveStatus.values()).some((s) => s === 'saving' || s === 'error') && (
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="material-symbols-outlined text-sm">cloud_done</span>
              <span className="hidden sm:inline">자동 저장</span>
            </span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Teacher card + Month selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 bg-surface-container-lowest p-5 rounded-xl border border-stone-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
              <span className="text-xl font-black font-headline text-primary">
                {teacher.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface font-headline">{maskName(teacher.name)} 선생님</h2>
              <p className="text-sm text-on-surface-variant">
                근무 시작: <span className="font-semibold">{teacher.start_date}</span>
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl border border-stone-100 flex flex-col justify-center">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              월 선택
            </label>
            <div className="flex items-center justify-between bg-stone-100 p-2 rounded-lg">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-stone-200 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-stone-600">chevron_left</span>
              </button>
              <span className="font-headline font-bold text-stone-800 text-sm">{monthLabel}</span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-stone-200 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-stone-600">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ledger - Responsive View */}
        <div className="bg-surface-container-lowest rounded-xl border border-stone-100 overflow-hidden">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">날짜</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">출근</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">첫차 출발</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">마지막 하차</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">퇴근</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">메모</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline text-center">제출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading
                  ? [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(7)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-8 bg-stone-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : weekdays.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const rd = rowData.get(dateStr) || {
                        check_in_time: '', first_bus_time: '',
                        last_dropoff_time: '', arrival_time: '', memo: '',
                      };
                      const status = saveStatus.get(dateStr) || 'idle';
                      const missing = isRowMissing(dateStr);
                      const holiday = holidays.get(dateStr);

                      return (
                        <tr
                          key={dateStr}
                          className={`transition-colors ${
                            missing ? 'bg-red-50/30' : holiday ? 'bg-amber-50/20' : 'hover:bg-stone-50/50'
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-on-surface">
                                {formatKoreanDate(dateStr)}
                              </span>
                              {holiday && (
                                <span className="text-[10px] font-bold text-amber-600 leading-tight">
                                  {holiday.name || '학원 휴원일'}
                                </span>
                              )}
                            </div>
                          </td>

                          {(['check_in_time', 'first_bus_time', 'last_dropoff_time', 'arrival_time'] as const).map(
                            (field) => (
                              <td key={field} className="px-4 py-3">
                                <input
                                  type="time"
                                  value={rd[field]}
                                  onChange={(e) => handleFieldChange(dateStr, field, e.target.value)}
                                  className={`ledger-input ${
                                    missing && !rd[field] ? 'error' : ''
                                  }`}
                                />
                              </td>
                            )
                          )}

                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={rd.memo}
                              onChange={(e) => handleFieldChange(dateStr, 'memo', e.target.value)}
                              placeholder="특이사항"
                              className="w-full bg-stone-50 border-none rounded text-sm px-3 py-2
                                         focus:ring-1 focus:ring-stone-300 focus:outline-none"
                            />
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleSave(dateStr)}
                              disabled={status === 'saving'}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                ${status === 'saved' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-primary text-on-primary hover:bg-primary-dim active:scale-95'}
                                ${status === 'saving' ? 'opacity-70 cursor-not-allowed' : ''}
                              `}
                            >
                              {status === 'saving' ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  중...
                                </span>
                              ) : status === 'saved' ? (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">done</span>
                                  완료
                                </span>
                              ) : (
                                '제출'
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Hidden on desktop) */}
          <div className="md:hidden flex flex-col divide-y divide-stone-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 space-y-4">
                  <div className="h-6 w-1/3 bg-stone-100 rounded animate-pulse" />
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-10 bg-stone-100 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              weekdays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const rd = rowData.get(dateStr) || {
                  check_in_time: '', first_bus_time: '',
                  last_dropoff_time: '', arrival_time: '', memo: '',
                };
                const status = saveStatus.get(dateStr) || 'idle';
                const missing = isRowMissing(dateStr);
                const holiday = holidays.get(dateStr);

                return (
                  <div 
                    key={dateStr} 
                    className={`p-4 space-y-4 transition-colors ${
                      missing ? 'bg-red-50/30' : holiday ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">
                          {formatKoreanDate(dateStr)}
                        </span>
                        {holiday && (
                          <span className="text-[10px] font-bold text-amber-600">
                            {holiday.name || '학원 휴원일'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'saving' && <span className="material-symbols-outlined text-amber-400 text-base saving-pulse">cloud_sync</span>}
                        {status === 'saved' && <span className="material-symbols-outlined text-emerald-500 text-base">cloud_done</span>}
                        {status === 'error' && <span className="material-symbols-outlined text-error text-base">cloud_off</span>}
                        {status === 'idle' && missing && <span className="material-symbols-outlined text-error text-base">error</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'check_in_time', label: '출근' },
                        { id: 'first_bus_time', label: '첫차' },
                        { id: 'last_dropoff_time', label: '하차' },
                        { id: 'arrival_time', label: '퇴근' },
                      ].map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[10px] font-bold text-outline uppercase">{field.label}</label>
                          <input
                            type="time"
                            value={rd[field.id as keyof RowData]}
                            onChange={(e) => handleFieldChange(dateStr, field.id as keyof RowData, e.target.value)}
                            className={`w-full bg-stone-50 border-none rounded-lg text-sm px-3 py-2.5 
                                       focus:ring-2 focus:ring-primary focus:outline-none transition-all
                                       ${missing && !rd[field.id as keyof RowData] ? 'ring-1 ring-error/50 bg-red-50/50' : ''}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase">메모</label>
                      <input
                        type="text"
                        value={rd.memo}
                        onChange={(e) => handleFieldChange(dateStr, 'memo', e.target.value)}
                        placeholder="특이사항 입력"
                        className="w-full bg-stone-50 border-none rounded-lg text-sm px-3 py-2.5
                                   focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleSave(dateStr)}
                        disabled={status === 'saving'}
                        className={`w-full py-3 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]
                          flex items-center justify-center gap-2
                          ${status === 'saved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-primary text-on-primary hover:bg-primary-dim'}
                        `}
                      >
                        {status === 'saving' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>제출 중...</span>
                          </>
                        ) : status === 'saved' ? (
                          <>
                            <span className="material-symbols-outlined text-lg">cloud_done</span>
                            <span>근무 내역 제출 완료</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg">send</span>
                            <span>근무 내역 제출하기</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row
                          items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">
              입력하면 즉시{' '}
              <span className="font-bold text-primary">자동 저장</span>됩니다
            </p>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-200 border border-error/30" />
                누락 필드
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-500 text-sm">cloud_done</span>
                저장 완료
              </span>
            </div>
          </div>
        </div>


        {/* Legend */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-stone-300 opacity-50 select-none">
            <div className="h-[1px] w-12 bg-current" />
            <span className="text-[10px] font-headline tracking-[0.2em] font-bold uppercase">
              {monthLabel} 근무일지
            </span>
            <div className="h-[1px] w-12 bg-current" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TeacherPageInner />
    </Suspense>
  );
}
