'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Teacher, WorkLog, PayrollResult } from '@/types';
import {
  calculatePayroll,
  formatCurrency,
  formatHours,
  formatKoreanDate,
} from '@/lib/payroll';
import { exportPayrollToExcel } from '@/lib/excel';
import { format, addMonths, subMonths } from 'date-fns';

function PayrollPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initTeacherId = searchParams.get('teacherId') || '';
  const initMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(initTeacherId);
  const [month, setMonth] = useState(initMonth);
  const [payroll, setPayroll] = useState<PayrollResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('teachers').select('*').order('name').then(({ data }) => {
      if (data) {
        const sorted = [...data].sort((a, b) => {
          const aResigned = a.status === '퇴사' ? 1 : 0;
          const bResigned = b.status === '퇴사' ? 1 : 0;
          if (aResigned !== bResigned) return aResigned - bResigned;
          return a.name.localeCompare(b.name);
        });
        setTeachers(sorted);
        if (!initTeacherId && sorted.length > 0) setSelectedTeacherId(sorted[0].id);
      }
    });
  }, []);

  async function fetchPayroll() {
    if (!selectedTeacherId) return;
    setLoading(true);

    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) { setLoading(false); return; }

    const startDate = `${month}-01`;
    // Get the last day of the month correctly
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const { data: logs } = await supabase
      .from('work_logs')
      .select('*')
      .eq('teacher_id', selectedTeacherId)
      .gte('work_date', startDate)
      .lte('work_date', endDate);

    const { data: holidays } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate);

    const result = calculatePayroll(teacher, logs || [], month, holidays || []);
    setPayroll(result);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedTeacherId && teachers.length > 0) {
      fetchPayroll();
    }
  }, [selectedTeacherId, month, teachers]);

  function navigateMonth(dir: 'prev' | 'next') {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const next = dir === 'next' ? addMonths(d, 1) : subMonths(d, 1);
    setMonth(format(next, 'yyyy-MM'));
  }

  const [y, mon] = month.split('-').map(Number);
  const monthLabel = `${y}년 ${mon}월`;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">
            급여 정산
          </h2>
          <p className="text-on-surface-variant mt-1">근무일지 기반 급여를 자동 계산합니다</p>
        </div>
        {payroll && (
          <button
            onClick={() => exportPayrollToExcel(payroll)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant
                       text-on-surface rounded-lg text-sm font-semibold hover:bg-stone-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            엑셀 다운로드
          </button>
        )}
      </div>

      {/* Filter bar */}
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
              <option key={t.id} value={t.id}>
                {t.status === '퇴사' ? `(퇴사) ${t.name} 선생님` : `${t.name} 선생님`}
              </option>
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
      </div>

      {/* Summary bento */}
      {payroll && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">총 근무일수</p>
              <p className="text-3xl font-extrabold text-on-surface font-headline">
                {payroll.logs.filter((l) => !l.isMissing && l.workHours !== null).length}일
              </p>
              <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-stone-200/50 pointer-events-none">
                calendar_month
              </span>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">총 근무시간</p>
              <p className="text-3xl font-extrabold text-on-surface font-headline">
                {formatHours(payroll.totalWorkHours)}
              </p>
              <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-stone-200/50 pointer-events-none">
                schedule
              </span>
            </div>
            <div className="bg-primary-container p-6 rounded-xl relative overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container/70 mb-1">
                총 급여 (예상)
              </p>
              <p className="text-3xl font-extrabold text-on-primary-container font-headline">
                {formatCurrency(payroll.totalSalary)}
              </p>
              <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-stone-400/20 pointer-events-none">
                payments
              </span>
            </div>
          </div>

          {/* Payroll rules aside + table */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-primary rounded-full" />
                <h4 className="font-bold text-on-surface font-headline">상세 근무 내역</h4>
              </div>

              <div className="bg-surface-container-lowest rounded-xl border border-stone-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-stone-50 border-b border-stone-100">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">날짜</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">입력 출근</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">
                          보정 출근
                          <span className="ml-1 text-[9px] normal-case tracking-normal text-outline/60">(첫차-10분)</span>
                        </th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">퇴근</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">근무시간</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {loading
                        ? [...Array(5)].map((_, i) => (
                            <tr key={i}>
                              {[...Array(6)].map((_, j) => (
                                <td key={j} className="px-4 py-3">
                                  <div className="h-6 bg-stone-100 rounded animate-pulse" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : payroll.logs.map((log) => (
                            <tr
                              key={log.date}
                              className={`transition-colors ${
                                log.isMissing ? 'bg-red-50/40' : log.holidayInfo ? 'bg-amber-50/30' : 'hover:bg-stone-50/50'
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-on-surface">
                                <div className="flex flex-col">
                                  <span>{formatKoreanDate(log.date)}</span>
                                  {log.holidayInfo && (
                                    <span className="text-[10px] font-bold text-amber-600">
                                      {log.holidayInfo.name || '학원 휴원일'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">
                                {log.checkInTime || <span className="text-stone-300">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-primary">
                                {log.adjustedCheckIn || <span className="text-stone-300 font-normal">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">
                                {log.arrivalTime || <span className="text-stone-300">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-on-surface">
                                {log.workHours !== null
                                  ? formatHours(log.workHours)
                                  : <span className="text-stone-300 font-normal">-</span>}
                              </td>
                              <td className="px-4 py-3">
                                {log.isMissing ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-error">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    누락
                                  </span>
                                ) : log.holidayInfo ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                    <span className="material-symbols-outlined text-sm">event_busy</span>
                                    휴원
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    완료
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Rules sidebar */}
            <div className="space-y-5">
              <div className="bg-surface-container p-5 rounded-xl border border-stone-200">
                <h5 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">gavel</span>
                  급여 정산 규칙
                </h5>
                <ul className="space-y-4">
                  {[
                    {
                      title: '보정 출근 로직',
                      desc: '첫 차 출발 시간 10분 전까지만 출근 시간으로 인정됩니다.',
                    },
                    {
                      title: '퇴근 기준',
                      desc: '퇴근 시간을 기준으로 정산됩니다.',
                    },
                  ].map((rule) => (
                    <li key={rule.title} className="flex gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">{rule.title}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                          {rule.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Salary breakdown */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-stone-100">
                <h5 className="text-sm font-bold text-on-surface mb-4">급여 계산식</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>총 근무시간</span>
                    <span className="font-bold text-on-surface">{formatHours(payroll.totalWorkHours)}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>시급</span>
                    <span className="font-bold text-on-surface">{formatCurrency(payroll.teacher.hourly_rate)}</span>
                  </div>
                  <div className="border-t border-stone-100 pt-2 flex justify-between font-bold">
                    <span>합계</span>
                    <span className="text-primary">{formatCurrency(payroll.totalSalary)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!payroll && !loading && (
        <div className="text-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl block mb-4 opacity-30">calculate</span>
          <p>선생님과 월을 선택하면 급여가 자동 계산됩니다</p>
        </div>
      )}
    </div>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PayrollPageInner />
    </Suspense>
  );
}
