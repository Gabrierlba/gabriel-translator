import React from 'react';
import { X, Keyboard, Sparkles, Database, FileText, CheckCircle2 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111622] rounded-2xl max-w-xl w-full border border-[#E1E7EE] dark:border-[#232D3F] shadow-xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E1E7EE] dark:border-[#232D3F] flex items-center justify-between bg-slate-50/50 dark:bg-[#151C28]/80 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#00A878] dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] text-base">
                Gabriel Subtitle Translator Guide
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-persian" dir="rtl">
                راهنمای کاربری و کلیدهای میانبر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2736] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm text-slate-600 dark:text-slate-300">
          {/* Section: Shortcuts */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2.5">
              <Keyboard className="w-4 h-4 text-[#00A878] dark:text-emerald-400" />
              Keyboard Navigation Shortcuts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232D3F] rounded-lg flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Select Next/Prev Line</span>
                <kbd className="px-2 py-1 bg-white dark:bg-[#1E2736] border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono shadow-2xs">
                  ↑ / ↓
                </kbd>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232D3F] rounded-lg flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Switch Fields</span>
                <kbd className="px-2 py-1 bg-white dark:bg-[#1E2736] border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono shadow-2xs">
                  Tab
                </kbd>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232D3F] rounded-lg flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Save Translation</span>
                <kbd className="px-2 py-1 bg-white dark:bg-[#1E2736] border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono shadow-2xs">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232D3F] rounded-lg flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Filter Lines</span>
                <kbd className="px-2 py-1 bg-white dark:bg-[#1E2736] border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono shadow-2xs">
                  Search bar
                </kbd>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232D3F] rounded-lg flex items-center justify-between sm:col-span-2">
                <span className="text-slate-600 dark:text-slate-400">جستجو و جایگزینی (Find & Replace)</span>
                <kbd className="px-2 py-1 bg-white dark:bg-[#1E2736] border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono shadow-2xs">
                  Ctrl + H
                </kbd>
              </div>
            </div>
          </div>

          {/* Section: Key Features in Persian */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl font-persian" dir="rtl">
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-2 flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#00A878] dark:text-emerald-400" />
              ویژگی‌های کلیدی سیستم ترجمه
            </h4>
            <ul className="text-xs text-emerald-800/90 dark:text-emerald-300/80 space-y-1.5 list-disc list-inside">
              <li>ترجمه روان و محاوره‌ای متناسب با دیالوگ فیلم و ویدیوهای آموزشی.</li>
              <li>جستجو و جایگزینی سراسری (Find & Replace) با یک کلیک در کل خطوط زیرنویس (Ctrl + H).</li>
              <li>پشتیبانی کامل از حافظه ترجمه (Translation Memory) برای کاهش هزینه‌ها.</li>
              <li>اعمال دیتابیس کلمات تخصصی (ICT، مهندسی و مالی) بدون تغییر ناخواسته اصطلاحات.</li>
              <li>خروجی استاندارد در ۷ قالب متنوع (SRT، WebVTT یوتیوب، متن پیوسته، دوزبانه، اکسل و JSON).</li>
              <li>ویرایشگر همزمان دوزبانه با همگام‌سازی لحظه‌ای زمان‌بندی‌ها و قابلیت بازگردانی (Undo).</li>
              <li>انکودینگ استاندارد UTF-8 با BOM برای عدم به‌هم‌ریختگی فونت فارسی در انواع پلیرها و اکسل.</li>
            </ul>
          </div>

          {/* Section: MoE Engine */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-start gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-semibold">MoE Multi-Model Collaboration Architecture</p>
              <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-persian" dir="rtl">
                در این حالت، ترجمه خطوط با ترکیب هوش مصنوعی‌های پیشرو (Gemini، ChatGPT، Claude و Grok) بهینه‌سازی شده و با فیلتر فرهنگ واژگان تخصصی بازبینی می‌شود.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E1E7EE] dark:border-[#232D3F] bg-slate-50 dark:bg-[#151C28] flex justify-end transition-colors">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#00A878] hover:bg-[#009667] text-white rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            متوجه شدم / Close
          </button>
        </div>
      </div>
    </div>
  );
};
