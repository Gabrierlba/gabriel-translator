import React, { useState, useRef } from 'react';
import { X, Search, Plus, Trash2, BookOpen, Check, Pencil, RotateCcw, Download, Upload, Cloud } from 'lucide-react';
import { TerminologyItem, TerminologyProfile } from '../types';

interface TerminologyDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: TerminologyProfile;
  onAddTerm: (profileId: string, english: string, persian: string) => void;
  onDeleteTerm: (profileId: string, termId: string, english?: string) => void;
  onEditTerm: (profileId: string, termId: string, english: string, persian: string) => void;
  onResetProfileToDefault?: (profileId: string) => void;
  onImportProfileItems?: (profileId: string, items: TerminologyItem[]) => void;
  cloudSyncStatus?: 'syncing' | 'synced' | 'offline';
}

export const TerminologyDatabaseModal: React.FC<TerminologyDatabaseModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onAddTerm,
  onDeleteTerm,
  onEditTerm,
  onResetProfileToDefault,
  onImportProfileItems,
  cloudSyncStatus = 'synced',
}) => {
  const [search, setSearch] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newFa, setNewFa] = useState('');
  const [addedNotice, setAddedNotice] = useState(false);

  // Edit state
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editEn, setEditEn] = useState('');
  const [editFa, setEditFa] = useState('');
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [deletedNotice, setDeletedNotice] = useState<{ id: string; en: string; fa: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredItems = currentProfile.items.filter(
    (item) =>
      item.english.toLowerCase().includes(search.toLowerCase()) ||
      item.persian.includes(search)
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEn.trim() || !newFa.trim()) return;
    onAddTerm(currentProfile.id, newEn.trim(), newFa.trim());
    setNewEn('');
    setNewFa('');
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleDelete = (item: TerminologyItem) => {
    if (editingTermId === item.id) {
      setEditingTermId(null);
      setEditEn('');
      setEditFa('');
    }
    onDeleteTerm(currentProfile.id, item.id, item.english);
    setDeletedNotice({ id: item.id, en: item.english, fa: item.persian });
    setTimeout(() => {
      setDeletedNotice((prev) => (prev?.id === item.id ? null : prev));
    }, 4000);
  };

  const handleUndoDelete = () => {
    if (!deletedNotice) return;
    onAddTerm(currentProfile.id, deletedNotice.en, deletedNotice.fa);
    setDeletedNotice(null);
  };

  const startEdit = (item: TerminologyItem) => {
    // If another item was being edited, save it first if valid
    if (editingTermId && editEn.trim() && editFa.trim() && editingTermId !== item.id) {
      onEditTerm(currentProfile.id, editingTermId, editEn.trim(), editFa.trim());
    }
    setEditingTermId(item.id);
    setEditEn(item.english);
    setEditFa(item.persian);
  };

  const cancelEdit = () => {
    setEditingTermId(null);
    setEditEn('');
    setEditFa('');
  };

  const saveEdit = (termId: string) => {
    if (!editEn.trim() || !editFa.trim()) return;
    onEditTerm(currentProfile.id, termId, editEn.trim(), editFa.trim());
    setEditingTermId(null);
    setSavedNoticeId(termId);
    setTimeout(() => {
      setSavedNoticeId(null);
    }, 2500);
  };

  const handleClose = () => {
    // Auto-save any in-progress edit so user never loses work on modal close
    if (editingTermId && editEn.trim() && editFa.trim()) {
      onEditTerm(currentProfile.id, editingTermId, editEn.trim(), editFa.trim());
      setEditingTermId(null);
    }
    setShowResetConfirm(false);
    onClose();
  };

  const handleExecuteReset = () => {
    onResetProfileToDefault?.(currentProfile.id);
    setEditingTermId(null);
    setShowResetConfirm(false);
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 3000);
  };

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `terminology-${currentProfile.id}-backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          onImportProfileItems?.(currentProfile.id, parsed.items);
          setImportNotice('اصطلاحات با موفقیت بازیابی شدند');
          setTimeout(() => setImportNotice(null), 3000);
        } else {
          setImportNotice('خطا: فایل نامعتبر است یا ساختار صحیحی ندارد.');
          setTimeout(() => setImportNotice(null), 3500);
        }
      } catch (err) {
        setImportNotice('خطا: پردازش فایل JSON با مشکل مواجه شد.');
        setTimeout(() => setImportNotice(null), 3500);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#111622] rounded-2xl max-w-2xl w-full border border-[#E1E7EE] dark:border-[#232D3F] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E1E7EE] dark:border-[#232D3F] flex items-center justify-between bg-slate-50/70 dark:bg-[#151C28]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#00A878] dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] text-base">
                  دیتابیس کلمات کلیدی سبک
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-[#00A878] dark:text-emerald-300">
                  {currentProfile.items.length} مورد
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    cloudSyncStatus === 'synced'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                      : cloudSyncStatus === 'syncing'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                  title="اصطلاحات به طور مستقیم در دیتابیس ابری ذخیره می‌شوند و در تمام لینک‌ها حفظ خواهند شد"
                >
                  <Cloud className="w-3 h-3" />
                  <span>{cloudSyncStatus === 'syncing' ? 'در حال همگام‌سازی...' : 'ذخیره دائمی ابری'}</span>
                </span>
                {resetNotice && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-persian font-semibold flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full animate-in fade-in">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    بازنشانی شد
                  </span>
                )}
                {importNotice && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-persian font-semibold flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full animate-in fade-in">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {importNotice}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {currentProfile.name} • اصطلاحات این بخش با اولویت مستقیم در تمام ترجمه‌ها اعمال می‌شوند.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2736] flex items-center justify-center transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Term Form */}
        <form onSubmit={handleCreate} className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex flex-wrap gap-2.5 items-center">
          <input
            type="text"
            placeholder="English term (e.g. Balanced Price Range)"
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            className="flex-1 min-w-[180px] text-xs px-3 py-2 bg-white dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#00A878]"
          />
          <input
            type="text"
            placeholder="معادل فارسی (مثلاً بی پی آر)"
            dir="rtl"
            value={newFa}
            onChange={(e) => setNewFa(e.target.value)}
            className="flex-1 min-w-[180px] text-xs px-3 py-2 bg-white dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg font-persian focus:outline-none focus:border-[#00A878]"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-[#00A878] hover:bg-[#009667] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            افزودن اصطلاح
          </button>
          {addedNotice && (
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1 font-persian animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ثبت شد
            </span>
          )}
        </form>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#111622]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در اصطلاحات انگلیسی یا معادل فارسی..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50/50 dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#00A878]"
            />
          </div>
        </div>

        {/* Deleted Term Notification with Undo */}
        {deletedNotice && (
          <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 font-persian animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                واژه <strong>«{deletedNotice.en}»</strong> با موفقیت از دیتابیس حذف گردید.
              </span>
            </div>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 rounded-md transition-colors cursor-pointer shrink-0"
            >
              لغو و بازگردانی (Undo)
            </button>
          </div>
        )}

        {/* Terminology List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-[#1E2736] bg-white dark:bg-[#111622]">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs font-persian">
              موردی مطابق با جستجو پیدا نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredItems.map((item) => {
                const isEditing = editingTermId === item.id;
                const wasSaved = savedNoticeId === item.id;

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="sm:col-span-2 p-3 rounded-xl border-2 border-emerald-500 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-xs flex flex-col gap-2.5 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950 dark:text-emerald-200 font-persian">
                        <span className="flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ویرایش اصطلاح:
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          (Enter برای ذخیره، Esc برای انصراف)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-mono">
                            عبارت انگلیسی (English)
                          </label>
                          <input
                            type="text"
                            value={editEn}
                            onChange={(e) => setEditEn(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit(item.id);
                              } else if (e.key === 'Escape') {
                                cancelEdit();
                              }
                            }}
                            className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#151C28] border border-slate-300 dark:border-[#232D3F] text-slate-800 dark:text-[#F1F5F9] rounded-lg focus:outline-none focus:border-emerald-600"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-persian text-right">
                            معادل فارسی دقیق (Persian)
                          </label>
                          <input
                            type="text"
                            dir="rtl"
                            value={editFa}
                            onChange={(e) => setEditFa(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit(item.id);
                              } else if (e.key === 'Escape') {
                                cancelEdit();
                              }
                            }}
                            className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-[#151C28] border border-slate-300 dark:border-[#232D3F] text-slate-800 dark:text-[#F1F5F9] rounded-lg font-persian focus:outline-none focus:border-emerald-600 text-right"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-[#1E2736] flex items-center gap-1 font-persian transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="px-3.5 py-1.5 text-xs rounded-lg bg-[#00A878] hover:bg-[#009667] text-white font-semibold flex items-center gap-1.5 font-persian transition-colors shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره تغییرات
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between group ${
                      wasSaved
                        ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28]/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.english}>
                        {item.english}
                      </p>
                      <p className="text-xs text-[#00A878] dark:text-emerald-400 font-persian font-medium truncate" dir="rtl" title={item.persian}>
                        {item.persian}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {wasSaved && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-persian font-bold flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 rounded">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ذخیره شد
                        </span>
                      )}

                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-all cursor-pointer"
                        title="ویرایش اصطلاح / Edit Term"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-all cursor-pointer"
                        title="حذف قطعی اصطلاح / Permanently Delete Term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E1E7EE] dark:border-[#232D3F] bg-slate-50 dark:bg-[#151C28] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <div className="flex items-center gap-3">
            <span>نمایش {filteredItems.length} از {currentProfile.items.length} واژه</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Export JSON backup */}
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#1E2736] rounded-lg flex items-center gap-1 font-persian transition-colors cursor-pointer"
              title="دانلود نسخه پشتیبان از تمام اصطلاحات سبک فعلی"
            >
              <Download className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              پشتیبان‌گیری (JSON)
            </button>

            {/* Import JSON backup */}
            {onImportProfileItems && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#1E2736] rounded-lg flex items-center gap-1 font-persian transition-colors cursor-pointer"
                  title="بازیابی اصطلاحات از فایل JSON قبلی"
                >
                  <Upload className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  بازیابی (JSON)
                </button>
              </>
            )}

            {onResetProfileToDefault && (
              showResetConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg px-2 py-1">
                  <span className="text-[11px] font-persian text-rose-700 dark:text-rose-300 font-bold">بازنشانی شود؟</span>
                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    بله
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2 py-0.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-[10px] transition-colors cursor-pointer"
                  >
                    خیر
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1E2736] rounded-lg flex items-center gap-1 font-persian transition-colors cursor-pointer"
                  title="بازنشانی واژگان این سبک به حالت پیش‌فرض اولیه"
                >
                  <RotateCcw className="w-3 h-3" />
                  بازنشانی به پیش‌فرض
                </button>
              )
            )}
            <button
              onClick={handleClose}
              className="px-4 py-1.5 bg-slate-200 dark:bg-[#1E2736] hover:bg-slate-300 dark:hover:bg-[#2A3649] text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
            >
              بستن / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
