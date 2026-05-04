'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Teacher, WorkLog } from '@/types';
import { format } from 'date-fns';
import { calculatePayroll, formatCurrency, formatHours } from '@/lib/payroll';

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [summaries, setSummaries] = useState<
    { teacher: Teacher; totalHours: number; totalSalary: number; missingDays: number }[]
  >([]);

  useEffect(() => {
    async function fetchData() {
      const { data: allTeacherData } = await supabase
        .from('teachers')
        .select('*')
        .order('name');

      if (!allTeacherData) { setLoading(false); return; }
      
      const teacherData = allTeacherData.filter(t => (t.status || '근무') === '근무');
      setTeachers(teacherData);

      const [year, mon] = currentMonth.split('-').map(Number);
      const startDate = `${currentMonth}-01`;
      // Get the last day of the month correctly
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data: holidays } = await supabase
        .from('holidays')
        .select('*')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate);

      const sums = await Promise.all(
        teacherData.map(async (t) => {
          const { data: logs } = await supabase
            .from('work_logs')
            .select('*')
            .eq('teacher_id', t.id)
            .gte('work_date', startDate)
            .lte('work_date', endDate);

          const payroll = calculatePayroll(t, logs || [], currentMonth, holidays || []);
          const missingDays = payroll.logs.filter((l) => l.isMissing).length;

          return {
            teacher: t,
            totalHours: payroll.totalWorkHours,
            totalSalary: payroll.totalSalary,
            missingDays,
          };
        })
      );

      setSummaries(sums);
      setLoading(false);
    }

    fetchData();
  }, []);

  const [y, m] = currentMonth.split('-').map(Number);
  const monthLabel = `${y}년 ${m}월`;
  const totalPayroll = summaries.reduce((s, x) => s + x.totalSalary, 0);
  const totalMissing = summaries.reduce((s, x) => s + x.missingDays, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">
          개요 대시보드
        </h2>
        <p className="text-on-surface-variant mt-1">{monthLabel} 현황</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-stone-100 relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">활성 선생님</p>
          <p className="text-4xl font-extrabold text-on-surface font-headline">{teachers.length}명</p>
          <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-stone-100 pointer-events-none">group</span>
        </div>
        <div className="bg-primary-container p-6 rounded-xl relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container/70 mb-1">
            이번 달 총 급여
          </p>
          <p className="text-3xl font-extrabold text-on-primary-container font-headline">
            {formatCurrency(totalPayroll)}
          </p>
          <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-primary/10 pointer-events-none">payments</span>
        </div>
        <div className={`p-6 rounded-xl relative overflow-hidden ${
          totalMissing > 0 ? 'bg-red-50' : 'bg-surface-container-lowest border border-stone-100'
        }`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
            누락 기록
          </p>
          <p className={`text-4xl font-extrabold font-headline ${totalMissing > 0 ? 'text-error' : 'text-on-surface'}`}>
            {totalMissing}건
          </p>
          {totalMissing > 0 && (
            <span className="material-symbols-outlined text-error text-xs mt-1 block">
              warning
            </span>
          )}
          <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-stone-100 pointer-events-none">pending_actions</span>
        </div>
      </div>

      {/* Teacher summary table */}
      <div className="bg-surface-container-lowest rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-on-surface font-headline">선생님별 {monthLabel} 현황</h3>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-stone-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl block mb-3 opacity-30">person_off</span>
            등록된 선생님이 없습니다
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">선생님</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">시급</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">총 근무시간</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-outline">예상 급여</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-outline text-center">누락</th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-outline"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {summaries.map(({ teacher, totalHours, totalSalary, missingDays }) => (
                <tr key={teacher.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
                        <span className="text-sm font-bold text-primary font-headline">
                          {teacher.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-semibold text-on-surface">{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {formatCurrency(teacher.hourly_rate)}/h
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-on-surface">
                    {formatHours(totalHours)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">
                    {formatCurrency(totalSalary)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {missingDays > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-error rounded-full text-xs font-bold">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        {missingDays}
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/admin/payroll?teacherId=${teacher.id}&month=${currentMonth}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      상세 보기 →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
