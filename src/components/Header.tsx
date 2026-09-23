import React from 'react';
import { Languages, HelpCircle, Sparkles, Sun, Moon, Replace } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  geminiConnected: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleFindReplace?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHelp,
  geminiConnected,
  isDark,
  onToggleTheme,
  onToggleFindReplace,
}) => {
  return (
    <header className="w-full bg-white dark:bg-[#111622] border-b border-[#E1E7EE] dark:border-[#232D3F] h-16 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors">
      <div className="max-w-[1520px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: App Logo & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#00A878] flex items-center justify-center text-white shadow-sm shadow-[#00A878]/25">
            <Languages className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
                Gabriel Subtitle Translator
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-[#00A878] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <Sparkles className="w-3 h-3" />
                AI-Powered
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-persian" dir="rtl">
              مترجم هوشمند زیرنویس SRT به زبان فارسی
            </p>
          </div>
        </div>

        {/* Right: Status Pill & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            id="gemini-status-pill"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A878]"></span>
            </span>
            <span className="tracking-tight">
              {geminiConnected ? 'Gemini connected' : 'Gemini AI Ready (MoE)'}
            </span>
          </div>

          {/* Quick Find & Replace Button (Ctrl + H) */}
          {onToggleFindReplace && (
            <button
              id="header-find-replace-btn"
              type="button"
              onClick={onToggleFindReplace}
              aria-label="جستجو و جایگزینی سراسری (Ctrl+H)"
              className="h-9 px-3 rounded-full border border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28] text-[#00A878] dark:text-emerald-400 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-persian font-semibold shadow-2xs"
              title="جستجو و جایگزینی سراسری در کل زیرنویس (Ctrl + H)"
            >
              <Replace className="w-3.5 h-3.5 text-[#00A878] dark:text-emerald-400" />
              <span className="hidden sm:inline">جستجو و جایگزینی</span>
              <kbd className="hidden md:inline-block text-[10px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono">
                Ctrl+H
              </kbd>
            </button>
          )}

          {/* Theme Toggle Button (Dark / Light) */}
          <button
            id="theme-toggle-button"
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "تغییر به حالت روشن / Switch to Light Mode" : "تغییر به حالت تاریک / Switch to Dark Mode"}
            className="w-9 h-9 rounded-full border border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#1E2736] transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            title={isDark ? "تغییر به حالت روشن (Light Mode)" : "تغییر به حالت تاریک (Dark Mode)"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-transform hover:rotate-12 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:text-slate-900 transition-transform hover:-rotate-12 duration-200" />
            )}
          </button>

          <button
            id="help-button"
            onClick={onOpenHelp}
            aria-label="Help and shortcuts"
            className="w-9 h-9 rounded-full border border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#1E2736] transition-colors flex items-center justify-center cursor-pointer"
            title="راهنما و کلیدهای میانبر / Help and User Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
