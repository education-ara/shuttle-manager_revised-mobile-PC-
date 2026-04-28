'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Teacher, WorkLog } from '@/types';
import { formatKoreanDate } from '@/lib/payroll';
import { format, addMonths, subMonths } from 'date-fns';

function LogsPageInner() {
  const searchParams = useSearchParams();
  const initTeacherId = searchParams.get('teacherId') || '';
  const initMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(initTeacherId);
  const [month, setMonth] = useState(initMonth);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('teachers').select('*').order('name').then(({ data }) => {
      if (data) {
        setTeachers(data);
        if (!initTeacherId && data.length > 0) setSelectedTeacherId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) return;
    setLoading(true);
    supabase
      .from('work_logs')
      .select('*')
      .eq('teacher_id', selectedTeacherId)
      .gte('work_date', `${month}-01`)
      .lte('work_date', `${month}-31`)
      .order('work_date')
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [selectedTeacherId, month]);

  function navigateMonth(dir: 'prev' | 'next') {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const next = dir === 'next' ? addMonths(d, 1) : subMonths(d, 1);
    setMonth(format(next, 'yyyy-MM'));
  }

  const [y, mon] = month.split('-').map(Number);
  const monthLabel = `${y}년 ${mon}월`;
  const completedCount = logs.filter(
    (l) => l.check_in_time && l.first_bus_time && l.last_dropoff_time && l.arrival_time
  ).length;
  const missingCount = logs.filter(
    (l) => !l.check_in_time || !l.first_bus_time || !l.last_dropoff_time || !l.arrival_time
  ).length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">
          출석 로그
        </h2>
        <p className="text-on-surface-variant mt-1">입력된 근무일지 원본 데이터</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-4 mb-8 p-5 bg-surface-container-lowest rounded-xl border border-stone-100">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            선생님 선택
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="bg-surface-container-high border-none rounded-lg text-sm px-4 py-2.5
                       focus:ring-2 focus:ring-primary focus:outline-none w-44"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name} 선생님</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            월 선택
          </label>
          <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-lg">
            <button onClick={() => navigateMonth('prev')} className="p-0.5 hover:bg-stone-200 rounded transition-colors">
              <span className="material-symbols-outlined text-stone-600 text-lg">chevron_left</span>
            </button>
            <span className="font-headline font-bold text-stone-800 text-sm w-28 text-center">{monthLabel}</span>
            <button onClick={() => navigateMonth('next')} className="p-0.5 hover:bg-stone-200 rounded transition-colors">
              <span className="material-symbols-outlined text-stone-600 text-lg">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-on-surface-variant">완료 <strong className="text-on-surface">{completedCount}</strong></span>
          </div>
          {missingCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-error" />
              <span className="text-on-surface-variant">누락 <strong className="text-error">{missingCount}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">날짜</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">출근</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">첫차 출발</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">마지막 하차</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">원 도착</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">메모</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">기록 시간</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-5 bg-stone-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : logs.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl block mb-3 opacity-30">receipt_long</span>
                        해당 월의 기록이 없습니다
                      </td>
                    </tr>
                  )
                : logs.map((log) => {
                    const isComplete =
                      log.check_in_time && log.first_bus_time &&
                      log.last_dropoff_time && log.arrival_time;
                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors ${
                          !isComplete ? 'bg-red-50/30' : 'hover:bg-stone-50/50'
                        }`}
                      >
                        <td className="px-5 py-3 text-sm font-medium text-on-surface whitespace-nowrap">
                          {formatKoreanDate(log.work_date)}
                        </td>
                        <td className="px-5 py-3 text-sm text-on-surface-variant">
                          {log.check_in_time || <span className="text-error font-bold">-</span>}
                        </td>
                        <td className="px-5 py-3 text-sm text-on-surface-variant">
                          {log.first_bus_time || <span className="text-error font-bold">-</span>}
                        </td>
                        <td className="px-5 py-3 text-sm text-on-surface-variant">
                          {log.last_dropoff_time || <span className="text-error font-bold">-</span>}
                        </td>
                        <td className="px-5 py-3 text-sm text-on-surface-variant">
                          {log.arrival_time || <span className="text-error font-bold">-</span>}
                        </td>
                        <td className="px-5 py-3 text-sm text-on-surface-variant max-w-[140px] truncate">
                          {log.memo || <span className="text-stone-300">-</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {log.updated_at
                            ? format(new Date(log.updated_at), 'MM.dd HH:mm')
                            : format(new Date(log.created_at), 'MM.dd HH:mm')}
                        </td>
                        <td className="px-5 py-3">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-error font-bold">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              누락
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">
            총 <strong>{logs.length}</strong>건의 기록
          </p>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> 완료
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error" /> 누락
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LogsPageInner />
    </Suspense>
  );
}
