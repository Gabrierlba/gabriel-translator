import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { TerminologyProfile } from '../types';

interface NewStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProfile: (profile: TerminologyProfile) => void;
}

export const NewStyleModal: React.FC<NewStyleModalProps> = ({
  isOpen,
  onClose,
  onCreateProfile,
}) => {
  const [nameEn, setNameEn] = useState('');
  const [nameFa, setNameFa] = useState('');
  const [initialTermsText, setInitialTermsText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameFa.trim()) return;

    // Parse initial terms if any: "English = Persian" on each line
    const items = initialTermsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const parts = line.split(/[=:]/);
        return {
          id: `term-${Date.now()}-${idx}`,
          english: parts[0]?.trim() || line,
          persian: parts[1]?.trim() || parts[0]?.trim() || '',
        };
      });

    const newProfile: TerminologyProfile = {
      id: `profile-${Date.now()}`,
      name: nameEn.trim() || nameFa.trim(),
      persianName: nameFa.trim(),
      items,
    };

    onCreateProfile(newProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111622] rounded-2xl max-w-lg w-full border border-[#E1E7EE] dark:border-[#232D3F] shadow-2xl overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-[#E1E7EE] dark:border-[#232D3F] flex items-center justify-between bg-slate-50 dark:bg-[#151C28] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#00A878] dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] text-base font-persian">
              تعریف سبک جدید ترجمه و اصطلاحات
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2736] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 font-persian" dir="rtl">
              نام سبک تخصصی (فارسی):
            </label>
            <input
              type="text"
              required
              placeholder="مثلاً: کریپتوکارنسی و بلاک‌چین"
              dir="rtl"
              value={nameFa}
              onChange={(e) => setNameFa(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg font-persian focus:outline-none focus:border-[#00A878]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              English Category Name (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Crypto & Web3"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#00A878]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 font-persian" dir="rtl">
              واژگان اولیه (اختیاری - هر خط یک مورد به شکل English = Persian):
            </label>
            <textarea
              rows={4}
              placeholder={`Staking = استیکینگ\nGas Fee = کارمزد شبکه\nSmart Contract = قرارداد هوشمند`}
              value={initialTermsText}
              onChange={(e) => setInitialTermsText(e.target.value)}
              className="w-full text-xs p-3 bg-white dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg font-mono focus:outline-none focus:border-[#00A878]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2736] rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#00A878] hover:bg-[#009667] text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              ایجاد و ذخیره سبک
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
