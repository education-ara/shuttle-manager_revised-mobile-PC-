'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Teacher } from '@/types';
import { format } from 'date-fns';

type FormData = {
  name: string;
  start_date: string;
  hourly_rate: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  hourly_rate: '15000',
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function fetchTeachers() {
    const { data } = await supabase.from('teachers').select('*').order('name');
    if (data) setTeachers(data);
    setLoading(false);
  }

  useEffect(() => { fetchTeachers(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(t: Teacher) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      start_date: t.start_date,
      hourly_rate: String(t.hourly_rate),
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      start_date: form.start_date,
      hourly_rate: Number(form.hourly_rate),
    };

    if (editingId) {
      await supabase.from('teachers').update(payload).eq('id', editingId);
    } else {
      await supabase.from('teachers').insert({
        ...payload,
        created_at: new Date().toISOString(),
      });
    }

    setSaving(false);
    setShowForm(false);
    fetchTeachers();
  }

  async function handleDelete(id: string) {
    await supabase.from('teachers').delete().eq('id', id);
    setConfirmDelete(null);
    fetchTeachers();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">
            선생님 관리
          </h2>
          <p className="text-on-surface-variant mt-1">시급 및 근무 정보를 관리합니다</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg
                     font-semibold text-sm shadow-sm hover:bg-primary-dim active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          새 선생님 추가
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold font-headline mb-6">
              {editingId ? '선생님 정보 수정' : '새 선생님 추가'}
            </h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-2">
                  이름 *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="선생님 성함"
                  className="w-full bg-surface-container-high border-2 border-transparent focus:border-primary
                             rounded-lg px-4 py-3 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-2">
                  근무 시작일 *
                </label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-surface-container-high border-2 border-transparent focus:border-primary
                             rounded-lg px-4 py-3 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-2">
                  시급 (원) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1000"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                    className="w-full bg-surface-container-high border-2 border-transparent focus:border-primary
                               rounded-lg px-4 py-3 pr-16 focus:outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">
                    KRW
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-lg
                             font-semibold text-sm hover:bg-surface-variant transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm
                             hover:bg-primary-dim disabled:opacity-60 transition-all"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl p-8 w-full max-w-sm shadow-2xl text-center">
            <span className="material-symbols-outlined text-error text-4xl mb-4 block">
              delete_forever
            </span>
            <h3 className="text-lg font-bold mb-2">정말 삭제하시겠습니까?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              삭제 후에는 복구할 수 없습니다. 근무 데이터는 유지됩니다.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-lg font-semibold text-sm"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-5 py-2.5 bg-error text-on-error rounded-lg font-bold text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block mb-4 opacity-30">person_off</span>
            <p className="font-medium">등록된 선생님이 없습니다</p>
            <button onClick={openAdd} className="mt-4 text-primary text-sm font-semibold hover:underline">
              + 선생님 추가하기
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-outline">이름</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-outline">근무 시작일</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-outline">시급</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-outline text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                        <span className="font-bold text-primary text-sm font-headline">
                          {t.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-semibold text-on-surface">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{t.start_date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface font-mono">
                    {t.hourly_rate.toLocaleString('ko-KR')}원/h
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="수정"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="p-2 text-outline hover:text-error hover:bg-red-50 rounded-lg transition-all"
                        title="삭제"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
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
