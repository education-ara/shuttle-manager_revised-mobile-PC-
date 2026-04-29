'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Holiday } from '@/types';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function fetchHolidays() {
    setLoading(true);
    const startDate = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const { data } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date');

    setHolidays(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchHolidays();
  }, [month]);

  async function handleAdd() {
    if (!newDate) return;
    setIsAdding(true);
    const { error } = await supabase.from('holidays').insert({
      holiday_date: newDate,
      name: newName || null,
      is_academy_holiday: true
    });

    if (error) {
      alert('휴원일 추가 중 오류가 발생했습니다: ' + error.message);
    } else {
      setNewDate('');
      setNewName('');
      fetchHolidays();
    }
    setIsAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('이 휴원일을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) {
      alert('삭제 중 오류가 발생했습니다');
    } else {
      fetchHolidays();
    }
  }

  function navigateMonth(dir: 'prev' | 'next') {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const next = dir === 'next' ? addMonths(d, 1) : subMonths(d, 1);
    setMonth(format(next, 'yyyy-MM'));
  }

  const [y, mon] = month.split('-').map(Number);
  const monthLabel = `${y}년 ${mon}월`;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">
          휴원일 관리
        </h2>
        <p className="text-on-surface-variant mt-1">공휴일 및 학원 휴원일을 설정합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Form */}
        <div className="bg-surface-container-low p-6 rounded-xl border border-stone-200 h-fit">
          <h4 className="font-bold text-on-surface mb-4">휴원일 추가</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-outline mb-1.5">날짜</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-outline mb-1.5">이름 (선택)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 어린이날, 여름방학"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={isAdding || !newDate}
              className="w-full py-2.5 bg-primary text-on-primary rounded-lg text-sm font-bold hover:bg-primary-dim transition-all disabled:opacity-50"
            >
              {isAdding ? '추가 중...' : '휴원일 등록'}
            </button>
          </div>
        </div>

        {/* Holiday List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-lg">
              <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-stone-200 rounded transition-colors">
                <span className="material-symbols-outlined text-stone-600 text-lg">chevron_left</span>
              </button>
              <span className="font-headline font-bold text-stone-800 text-sm px-4">{monthLabel}</span>
              <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-stone-200 rounded transition-colors">
                <span className="material-symbols-outlined text-stone-600 text-lg">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-outline">날짜</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-outline">이름</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-outline text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-stone-400">로딩 중...</td></tr>
                ) : holidays.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-16 text-center text-stone-300">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-20">event_busy</span>
                    등록된 휴원일이 없습니다
                  </td></tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-on-surface">
                        {h.holiday_date.replace(/-/g, '.')}
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        {h.name || <span className="text-stone-300 font-normal">학원 휴원일</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-stone-400 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
