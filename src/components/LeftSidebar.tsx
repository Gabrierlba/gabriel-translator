import React from 'react';
import {
  Sliders,
  BookOpen,
  Sparkles,
  RefreshCw,
  Layers,
  ChevronDown,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  TranslationTone,
  TerminologyProfile,
  TranslationStats,
  AIProviderStatus
} from '../types';
import { DEFAULT_TERMINOLOGY_PROFILES } from '../data/defaultTerminology';
import { ActiveFileCard } from './ActiveFileCard';

interface LeftSidebarProps {
  fileName: string;
  totalLines: number;
  stats: TranslationStats;
  tone: TranslationTone;
  onToneChange: (tone: TranslationTone) => void;
  videoContext: string;
  onContextChange: (ctx: string) => void;
  memoryEnabled: boolean;
  onToggleMemory: (enabled: boolean) => void;
  profiles: TerminologyProfile[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  onOpenNewStyle: () => void;
  onOpenTerminologyModal: () => void;
  aiModel: string;
  onAiModelChange: (model: string) => void;
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  isTranslating: boolean;
  onStartTranslation: () => void;
  onPauseTranslation: () => void;
  onRetryErrors: () => void;
  onClearTranslations: () => void;
  onClearFile?: () => void;
  onDownloadSRT?: () => void;
  onOpenSyncModal: () => void;
  onOpenExportModal?: () => void;
  onFileSelect: (file: File) => void;
  providerStatus: AIProviderStatus;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  fileName,
  totalLines = 0,
  stats,
  tone,
  onToneChange,
  videoContext,
  onContextChange,
  memoryEnabled,
  onToggleMemory,
  profiles = [],
  selectedProfileId,
  onSelectProfile,
  onOpenNewStyle,
  onOpenTerminologyModal,
  aiModel,
  onAiModelChange,
  batchSize,
  onBatchSizeChange,
  isTranslating,
  onStartTranslation,
  onPauseTranslation,
  onRetryErrors,
  onClearTranslations,
  onClearFile,
  onDownloadSRT,
  onOpenSyncModal,
  onOpenExportModal,
  onFileSelect,
  providerStatus,
}) => {
  const safeProfiles = Array.isArray(profiles) && profiles.length > 0 ? profiles : DEFAULT_TERMINOLOGY_PROFILES;
  const selectedProfile = safeProfiles.find((p) => p && p.id === selectedProfileId) || safeProfiles[0] || { id: 'default', persianName: 'عمومی', items: [] };
  const doneCount = stats?.done ?? 0;
  const progressPercent = totalLines > 0 ? Math.round((doneCount / totalLines) * 100) : 0;

  return (
    <aside className="w-full lg:w-[400px] shrink-0 space-y-4 font-sans">
      {/* 1. ACTIVE FILE CARD (Matching exact screenshot design) */}
      <ActiveFileCard
        fileName={fileName}
        totalLines={totalLines}
        progressPercent={progressPercent}
        onFileSelect={onFileSelect}
        onClearFile={onClearFile}
        onDownloadSRT={onDownloadSRT}
        onOpenSyncModal={onOpenSyncModal}
        onOpenExportModal={onOpenExportModal}
      />

      {/* 2. TRANSLATION SETTINGS CARD */}
      <div className="bg-white dark:bg-[#111622] rounded-xl border border-[#E1E7EE] dark:border-[#232D3F] p-5 shadow-xs space-y-5 transition-colors">
        {/* Card Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#1E2736]">
          <Sliders className="w-4 h-4 text-[#00A878]" />
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">
            Translation Settings
          </h2>
        </div>

        {/* Section: TRANSLATION TONE */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">
            TRANSLATION TONE / لحن ترجمه
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Tone: Spoken */}
            <button
              type="button"
              onClick={() => onToneChange('spoken')}
              className={`p-2.5 rounded-xl text-left border transition-all relative cursor-pointer ${
                tone === 'spoken'
                  ? 'border-[#00A878] bg-emerald-50/40 dark:bg-emerald-950/40 ring-1 ring-[#00A878]/30'
                  : 'border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  محاوره‌ای
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    tone === 'spoken'
                      ? 'border-[#00A878] bg-[#00A878]'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151C28]'
                  }`}
                >
                  {tone === 'spoken' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
              </div>
              <p className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8] leading-tight font-persian">
                روان و صمیمی مانند لحن خود مدرس در یوتیوب.
              </p>
            </button>

            {/* Tone: Formal */}
            <button
              type="button"
              onClick={() => onToneChange('formal')}
              className={`p-2.5 rounded-xl text-left border transition-all relative cursor-pointer ${
                tone === 'formal'
                  ? 'border-[#00A878] bg-emerald-50/40 dark:bg-emerald-950/40 ring-1 ring-[#00A878]/30'
                  : 'border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  رسمی و کتابی
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    tone === 'formal'
                      ? 'border-[#00A878] bg-[#00A878]'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151C28]'
                  }`}
                >
                  {tone === 'formal' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
              </div>
              <p className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8] leading-tight font-persian">
                مناسب مقالات، مستندها و ویدیوهای آکادمیک.
              </p>
            </button>

            {/* Tone: Minimal / Concise */}
            <button
              type="button"
              onClick={() => onToneChange('minimal')}
              className={`p-2.5 rounded-xl text-left border transition-all relative cursor-pointer ${
                tone === 'minimal'
                  ? 'border-[#00A878] bg-emerald-50/40 dark:bg-emerald-950/40 ring-1 ring-[#00A878]/30'
                  : 'border-[#E1E7EE] dark:border-[#232D3F] bg-white dark:bg-[#151C28] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  فشرده و مینیمال
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    tone === 'minimal'
                      ? 'border-[#00A878] bg-[#00A878]'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151C28]'
                  }`}
                >
                  {tone === 'minimal' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
              </div>
              <p className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8] leading-tight font-persian">
                جملات کوتاه‌تر و خلاصه‌تر برای خوانش سریع‌تر مخاطب.
              </p>
            </button>
          </div>
        </div>

        {/* Section: CONTEXT / GENRE OF VIDEO */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">
            CONTEXT / GENRE OF VIDEO
          </label>
          <input
            type="text"
            value={videoContext}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder="e.g. Action Movie, Tech Vlog, Stand-up Comedy..."
            className="w-full text-xs px-3 py-2.5 bg-slate-50/50 dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] rounded-lg focus:outline-none focus:border-[#00A878] focus:bg-white dark:focus:bg-[#1A2231] text-slate-800 dark:text-[#F1F5F9] transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
            Helps Gemini accurately translate slang, cultural puns, and industry terms.
          </p>
        </div>

        {/* Section: SMART TRANSLATION MEMORY */}
        <div className="bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#BBF7D0] dark:border-emerald-800/50 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
              SMART TRANSLATION MEMORY / حافظه هوشمند
            </span>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={memoryEnabled}
              onClick={() => onToggleMemory(!memoryEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                memoryEnabled ? 'bg-[#00A878]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  memoryEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed font-persian" dir="rtl">
            حافظه هوشمند عبارات ترجمه شده را به خاطر می‌سپارد تا در زمان تکرار همان جملات، ترجمه یکدست باقی مانده و هزینه‌های API کاهش یابد.
          </p>
        </div>

        {/* Section: SPECIALIZED STYLE / TERMINOLOGY */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00A878]" />
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] font-persian" dir="rtl">
                سبک آموزشی و اصطلاحات تخصصی
              </span>
            </div>
            <button
              onClick={onOpenNewStyle}
              className="text-[11px] font-semibold text-[#00A878] hover:text-[#008259] font-persian transition-colors cursor-pointer"
            >
              + تعریف سبک جدید
            </button>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <select
              value={selectedProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              className="w-full appearance-none text-xs px-3 py-2.5 pr-8 bg-slate-50/50 dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] rounded-lg text-[#0F172A] dark:text-[#F1F5F9] font-persian focus:outline-none focus:border-[#00A878] focus:bg-white dark:focus:bg-[#1A2231] cursor-pointer"
              dir="rtl"
            >
              {safeProfiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">
                  {p.persianName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Terminology Button */}
          <button
            type="button"
            onClick={onOpenTerminologyModal}
            className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-[#151C28] hover:bg-slate-100 dark:hover:bg-[#1E2736] border border-[#E1E7EE] dark:border-[#232D3F] rounded-lg text-slate-700 dark:text-slate-300 font-persian flex items-center justify-between transition-colors cursor-pointer"
            dir="rtl"
          >
            <span>نمایش دیتابیس کلمات کلیدی سبک ({selectedProfile?.items?.length ?? 0} مورد)</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">مشاهده و ویرایش ←</span>
          </button>
        </div>

        {/* Section: AI MODEL */}
        <div className="space-y-2.5 pt-1">
          <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">
            AI MODEL / مدل هوش مصنوعی
          </label>

          <div className="relative">
            <select
              value={aiModel}
              onChange={(e) => onAiModelChange(e.target.value)}
              className="w-full appearance-none text-xs px-3 py-2.5 pr-8 bg-slate-50/50 dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] rounded-lg text-[#0F172A] dark:text-[#F1F5F9] font-persian focus:outline-none focus:border-[#00A878] focus:bg-white dark:focus:bg-[#1A2231] cursor-pointer"
              dir="rtl"
            >
              <option value="moe" className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">🧠 چند هوش مصنوعی (حرفه‌ای‌ترین حالت) (MoE)</option>
              <option value="gemini-flash" className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">⚡ Gemini 3.8 Flash (پیشرفته و سریع)</option>
              <option value="claude" className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">💎 Claude 3.5 Sonnet (ادبی و منسجم)</option>
              <option value="chatgpt" className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">🤖 GPT-4o (چندمنظوره)</option>
              <option value="grok" className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">🚀 Grok 2 (محاوره‌ای قوی)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* MoE Informational Lavender/Blue Card */}
          <div className="bg-[#EEF2FF] dark:bg-indigo-950/30 border border-[#C7D2FE] dark:border-indigo-800/50 rounded-xl p-3.5 space-y-2 text-indigo-950 dark:text-indigo-200">
            <h4 className="text-xs font-bold font-persian" dir="rtl">
              وضعیت و همکاری فعال در ترجمه چندگانه (MoE):
            </h4>

            {/* Provider status pills */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${providerStatus?.gemini === 'active' ? 'bg-[#00A878] shadow-[0_0_6px_rgba(0,168,120,0.6)]' : providerStatus?.gemini === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                <span>Gemini: {providerStatus?.gemini === 'active' ? 'فعال' : providerStatus?.gemini === 'error' ? 'خطا' : 'آماده'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${providerStatus?.chatgpt === 'active' ? 'bg-[#00A878]' : providerStatus?.chatgpt === 'error' ? 'bg-rose-500' : 'bg-indigo-400'}`} />
                <span>ChatGPT: {providerStatus?.chatgpt === 'active' ? 'فعال' : providerStatus?.chatgpt === 'error' ? 'خطا' : 'آماده به کار'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${providerStatus?.claude === 'active' ? 'bg-[#00A878]' : providerStatus?.claude === 'error' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                <span>Claude: {providerStatus?.claude === 'active' ? 'فعال' : providerStatus?.claude === 'error' ? 'خطا' : 'آماده به کار'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${providerStatus?.grok === 'active' ? 'bg-[#00A878]' : providerStatus?.grok === 'error' ? 'bg-rose-500' : 'bg-sky-400'}`} />
                <span>Grok: {providerStatus?.grok === 'active' ? 'فعال' : providerStatus?.grok === 'error' ? 'خطا' : 'آماده به کار'}</span>
              </div>
            </div>

            <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed font-persian pt-1" dir="rtl">
              در حالت MoE، ترجمه بخش‌ها ابتدا توسط سریع‌ترین مدل پردازش شده و سپس توسط مدل کیفیتی با دیتابیس اصطلاحات بازبینی می‌شود تا دقیق‌ترین ترجمه محاوره‌ای استخراج گردد.
            </p>
          </div>
        </div>

        {/* Section: BATCH SPEED */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">
              BATCH SPEED (SUBTITLES PER REQUEST)
            </label>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-[#1E2736] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Advanced
            </span>
          </div>

          <div className="relative">
            <select
              value={batchSize}
              onChange={(e) => onBatchSizeChange(Number(e.target.value))}
              className="w-full appearance-none text-xs px-3 py-2.5 pr-8 bg-slate-50/50 dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#00A878] focus:bg-white dark:focus:bg-[#1A2231] cursor-pointer"
            >
              <option value={10} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">10 lines (Ultra-fast preview & quick test)</option>
              <option value={25} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">25 lines (Fine-grained live stream)</option>
              <option value={50} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">50 lines (Standard testing)</option>
              <option value={100} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">100 lines (Balanced speed)</option>
              <option value={250} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">250 lines (Recommended standard)</option>
              <option value={500} className="bg-white dark:bg-[#151C28] text-[#0F172A] dark:text-[#F1F5F9]">500 lines (Maximum batch)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            {batchSize === 10
              ? 'تست سریع و پیش‌نمایش آنی ۱۰ خط در هر ارسال با حداکثر دقت و سرعت.'
              : 'تعداد خطوط زیرنویس ارسال‌شده به هوش مصنوعی در هر مرحله.'}
          </p>
        </div>

        {/* Section: TRANSLATION PROGRESS */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E2736]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">Translation Progress</span>
            <span className="font-bold text-[#00A878]">{progressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-[#1E2736] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A878] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 4 Statistics Cards */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 bg-slate-50 dark:bg-[#151C28] border border-[#E1E7EE] dark:border-[#232D3F] rounded-lg">
              <span className="block text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                TOTAL
              </span>
              <span className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">{stats?.total ?? 0}</span>
            </div>
            <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
              <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                DONE
              </span>
              <span className="text-sm font-bold text-[#00A878]">{stats?.done ?? 0}</span>
            </div>
            <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
              <span className="block text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                ACTIVE
              </span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{stats?.active ?? 0}</span>
            </div>
            <div className="p-2 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg">
              <span className="block text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                ERROR
              </span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{stats?.error ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Error Retry Notice if any */}
        {(stats?.error ?? 0) > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{stats?.error} خط با خطا مواجه شد</span>
            </div>
            <button
              onClick={onRetryErrors}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              تلاش مجدد
            </button>
          </div>
        )}

        {/* 3. MAIN ACTION BUTTON & CLEAR TRANSLATIONS */}
        <div className="pt-2">
          {isTranslating ? (
            <button
              id="pause-translation-btn"
              onClick={onPauseTranslation}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              <span>توقف موقت ترجمه (Pause)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="start-translation-btn"
                onClick={onStartTranslation}
                disabled={totalLines === 0}
                className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                  totalLines > 0
                    ? 'bg-[#00A878] hover:bg-[#009667] active:bg-[#008259] text-white shadow-[#00A878]/30 cursor-pointer'
                    : 'bg-slate-100 dark:bg-[#1E2736] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed shadow-none'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${totalLines > 0 ? 'text-emerald-100' : 'text-slate-400'}`} />
                <span>Start AI Translation</span>
              </button>

              <button
                id="clear-translations-btn"
                type="button"
                onClick={onClearTranslations}
                disabled={totalLines === 0}
                title="پاک کردن تمام ترجمه‌ها و ریست (Clear / Reset Translations)"
                className={`w-12 h-[48px] border rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  totalLines > 0
                    ? 'bg-slate-50 dark:bg-[#151C28] hover:bg-slate-100 dark:hover:bg-[#1E2736] border-[#E1E7EE] dark:border-[#232D3F] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#F1F5F9] cursor-pointer'
                    : 'bg-slate-100 dark:bg-[#1E2736] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
