'use client';

import { useState } from 'react';
import { checkAdminPassword, setAdminSession } from '@/lib/auth';

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checkAdminPassword(password)) {
      setAdminSession();
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl p-10 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-5 mx-auto">
            <span
              className="material-symbols-outlined text-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock_person
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface font-headline mb-2">관리자 접속</h1>
          <p className="text-sm text-on-surface-variant">
            관리자 비밀번호를 입력해 주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-2">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="••••••••"
                className={`w-full bg-surface-container-high border-2 rounded-lg px-4 py-3 text-on-surface
                            focus:outline-none focus:ring-0 transition-all
                            ${error ? 'border-error' : 'border-transparent focus:border-primary'}`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPw ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                비밀번호가 올바르지 않습니다
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-lg
                       hover:bg-primary-dim active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            접속하기
            <span className="material-symbols-outlined text-sm">login</span>
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-outline-variant">
          <span className="material-symbols-outlined text-sm">verified_user</span>
          <span className="text-[10px] uppercase tracking-widest font-label">Encrypted Session Secure</span>
        </div>
      </div>

      {/* BG */}
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/2 bg-gradient-to-bl from-primary-container/20 to-transparent blur-3xl" />
      <div className="fixed bottom-0 left-0 -z-10 w-1/4 h-1/3 bg-gradient-to-tr from-secondary-container/15 to-transparent blur-3xl" />
    </div>
  );
}
