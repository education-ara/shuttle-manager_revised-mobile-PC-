'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Teacher } from '@/types';
import { format } from 'date-fns';

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200' },
  { bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200' },
  { bg: 'bg-rose-100', text: 'text-rose-600', ring: 'ring-rose-200' },
  { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-200' },
];

export default function HomePage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    async function fetchTeachers() {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('name');
      if (!error && data) setTeachers(data);
      setLoading(false);
    }
    fetchTeachers();
  }, []);

  function handleStart() {
    if (!selected) return;
    router.push(`/teacher?id=${selected}&month=${currentMonth}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 md:px-6 py-3 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/50">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-base md:text-lg">directions_bus</span>
          </div>
          <span className="text-sm md:text-base font-bold text-stone-800 font-headline tracking-tight">
            셔틀 관리 시스템
          </span>
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] md:text-xs font-semibold text-on-surface-variant hover:text-on-surface 
                     hover:bg-surface-container rounded-lg transition-all"
        >
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          관리자
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-10 md:py-20">
        {/* Title */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container rounded-full mb-4">
            <span className="material-symbols-outlined text-primary text-sm">edit_note</span>
            <span className="text-[10px] md:text-xs font-bold text-on-primary-container tracking-widest uppercase">
              근무일지 작성
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-3 tracking-tight">
            선생님을 선택해 주세요
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant">
            본인의 이름을 선택한 후 근무일지를 작성합니다
          </p>
        </div>

        {/* Teacher Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-10 md:mb-14">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 md:h-48 bg-surface-container-high rounded-xl animate-pulse" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">group</span>
            <p className="font-medium">등록된 선생님이 없습니다</p>
            <p className="text-sm mt-1">관리자 화면에서 선생님을 먼저 추가해 주세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-10 md:mb-14">
            {teachers.map((teacher, idx) => {
              const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const isSelected = selected === teacher.id;
              return (
                <button
                  key={teacher.id}
                  onClick={() => setSelected(teacher.id)}
                  className={`relative p-4 md:p-6 flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200
                    hover:shadow-lg active:scale-[0.98] cursor-pointer text-left
                    ${isSelected
                      ? 'border-primary bg-primary-container/30 shadow-md'
                      : 'border-transparent bg-surface-container-lowest hover:border-outline-variant'
                    }`}
                >
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${color.bg} ${color.ring} ring-2 
                                   flex items-center justify-center mb-3 md:mb-4`}>
                    <span className="text-xl md:text-2xl font-black font-headline text-stone-700">
                      {teacher.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm md:text-base font-bold text-on-surface">{teacher.name}</span>
                  <span className="text-[10px] md:text-xs text-on-surface-variant mt-0.5 opacity-70">
                    {teacher.start_date?.slice(0, 7)} 부터
                  </span>

                  {isSelected && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3">
                      <span className="material-symbols-outlined text-primary text-lg md:text-xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleStart}
            disabled={!selected}
            className={`flex items-center gap-2 px-8 md:px-10 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-md
              transition-all active:scale-[0.98]
              ${selected
                ? 'bg-primary text-on-primary hover:bg-primary-dim cursor-pointer'
                : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60'
              }`}
          >
            <span>근무일지 작성하기</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          {!selected && (
            <p className="text-xs md:text-sm text-on-surface-variant">위에서 본인 이름을 선택해 주세요</p>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-stone-200/50">
        <p className="text-xs text-on-surface-variant/40 font-label tracking-widest uppercase">
          © 2024 Academy Shuttle Ledger System
        </p>
      </footer>

      {/* BG decoration */}
      <div className="fixed bottom-0 right-0 -z-10 w-1/3 h-1/3 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-tl from-primary-container to-transparent rounded-tl-[100px]" />
      </div>
    </div>
  );
}
