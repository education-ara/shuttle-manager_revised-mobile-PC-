'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAdminAuthenticated, clearAdminSession } from '@/lib/auth';
import AdminLogin from '@/components/AdminLogin';

const NAV_ITEMS = [
  { href: '/admin', label: '개요', icon: 'dashboard' },
  { href: '/admin/teachers', label: '선생님 관리', icon: 'group' },
  { href: '/admin/payroll', label: '급여 정산', icon: 'payments' },
  { href: '/admin/logs', label: '출석 로그', icon: 'receipt_long' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setAuthed(isAdminAuthenticated());
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  function handleLogout() {
    clearAdminSession();
    setAuthed(false);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-stone-100 border-r border-stone-200 flex flex-col p-4 z-50">
        <div className="flex items-center gap-3 px-2 py-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-lg">directions_bus</span>
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tighter text-stone-900 font-headline">
              아카데미 셔틀
            </div>
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
              관리자 패널
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-white text-primary shadow-sm font-bold'
                    : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-stone-200 pt-4 space-y-1">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-600 hover:bg-stone-200 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            선생님 화면
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-600 hover:bg-stone-200 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-4
                           bg-stone-50/80 backdrop-blur-md border-b border-stone-200/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-400">관리자</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-900 font-semibold">
              {NAV_ITEMS.find((n) => n.href === pathname)?.label || '관리자'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>관리자 인증됨</span>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
