import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  Trash2,
  Plus,
  Clock,
  Check,
  Search,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  UploadCloud,
  Upload,
  FileText,
  Replace,
  Loader2,
} from 'lucide-react';
import { SubtitleSegment, TranslationTone } from '../types';
import { timestampToSeconds } from '../utils/timeSync';

interface SubtitleTableProps {
  segments: SubtitleSegment[];
  onUpdateSegment: (id: number, updates: Partial<SubtitleSegment>) => void;
  onTranslateSingle: (id: number) => void;
  onDeleteSegment: (id: number) => void;
  onAddNewSegmentAfter?: (id: number) => void;
  onAddNewSegmentAtEnd: () => void;
  selectedSegmentId: number | null;
  onSelectSegment: (id: number | null) => void;
  isTranslating: boolean;
  highlightSearch?: string;
  onBatchTranslate?: (ids: number[]) => void;
  onBatchDelete?: (ids: number[]) => void;
  onFileSelect?: (file: File) => void;
  onLoadSample?: () => void;
  tableContainerRef?: React.RefObject<HTMLDivElement | null>;
  // Additional props for exact matching screenshot
  tone?: TranslationTone;
  onToneChange?: (tone: TranslationTone) => void;
  onTranslateRemaining?: () => void;
  onOpenSyncModal?: () => void;
  onOpenFindReplace?: () => void;
  onCleanEnglishArtifacts?: () => void;
}

export const SubtitleTable: React.FC<SubtitleTableProps> = ({
  segments = [],
  onUpdateSegment,
  onTranslateSingle,
  onDeleteSegment,
  onAddNewSegmentAfter,
  onAddNewSegmentAtEnd,
  selectedSegmentId,
  onSelectSegment,
  isTranslating,
  highlightSearch = '',
  onBatchTranslate,
  onBatchDelete,
  onFileSelect,
  onLoadSample,
  tableContainerRef,
  tone = 'conversational',
  onToneChange,
  onTranslateRemaining,
  onOpenSyncModal,
  onOpenFindReplace,
  onCleanEnglishArtifacts,
}) => {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExpandedHeight, setIsExpandedHeight] = useState(false);

  // Hidden file input for file upload button
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File drag & drop reference
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileSelect) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Count untranslated / pending lines
  const pendingCount = useMemo(() => {
    return safeSegments.filter(
      (s) => !s.translatedText || !s.translatedText.trim() || s.status === 'error'
    ).length;
  }, [safeSegments]);

  // Filtered segments based on search query
  const filteredSegments = useMemo(() => {
    return safeSegments.filter((seg) => {
      if (!seg) return false;
      const transText = seg.translatedText || '';
      const srcText = seg.sourceText || '';

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSource = srcText.toLowerCase().includes(q);
        const matchesTrans = transText.toLowerCase().includes(q);
        const matchesId = seg.id?.toString() === q;
        if (!matchesSource && !matchesTrans && !matchesId) return false;
      }

      return true;
    });
  }, [safeSegments, searchQuery]);

  // Handle multi-select checkboxes
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drag and drop for SRT files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onFileSelect) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      id="subtitle-segments-container"
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 w-full flex flex-col bg-white dark:bg-[#111622] rounded-2xl border border-slate-200 dark:border-[#232D3F] shadow-sm transition-all relative ${
        isExpandedHeight ? 'h-[85vh]' : 'h-[750px] lg:h-[780px]'
      } ${isDragging ? 'ring-2 ring-[#00A878] bg-emerald-50/20' : ''}`}
    >
      {/* 1. TOP HEADER BAR - Exactly matching Screenshot layout */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-[#232D3F] bg-white dark:bg-[#111622] rounded-t-2xl space-y-3.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Title + Remaining Translate Button + Tone Switcher */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Title with compact and clean font sizing */}
            <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-700 dark:text-slate-300 font-sans uppercase">
              SUBTITLE SEGMENTS
            </h2>

            {/* Translate Remaining Button (e.g. '(4) ترجمه خطوط باقیمانده') */}
            {onTranslateRemaining && (
              <button
                id="translate-remaining-btn"
                type="button"
                onClick={onTranslateRemaining}
                disabled={isTranslating || pendingCount === 0}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs font-persian"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {pendingCount > 0 ? `(${pendingCount}) ترجمه خطوط باقیمانده` : 'همه ترجمه شده‌اند'}
                </span>
              </button>
            )}

            {/* Inline Tone Pills (محاوره‌ای / رسمی / فشرده) */}
            {onToneChange && (
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#182130] p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs font-persian">
                <button
                  type="button"
                  onClick={() => onToneChange('conversational')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    tone === 'conversational'
                      ? 'bg-white dark:bg-[#0B0F17] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  محاوره‌ای
                </button>
                <button
                  type="button"
                  onClick={() => onToneChange('formal')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    tone === 'formal'
                      ? 'bg-white dark:bg-[#0B0F17] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  رسمی
                </button>
                <button
                  type="button"
                  onClick={() => onToneChange('minimal')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    tone === 'minimal'
                      ? 'bg-white dark:bg-[#0B0F17] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  فشرده
                </button>
              </div>
            )}
          </div>

          {/* Right helper & add button */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline select-none">
              Click line to select
            </span>

            {/* Quick Subtitle Sync Button */}
            {onOpenSyncModal && safeSegments.length > 0 && (
              <button
                id="table-sync-quick-btn"
                type="button"
                onClick={onOpenSyncModal}
                className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="هماهنگ‌سازی و رفع تاخیر زیرنویس (Subtitle Sync & Delay Fix)"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-persian hidden md:inline">هماهنگ‌سازی زمان</span>
              </button>
            )}

            {/* Quick Find & Replace Button */}
            {onOpenFindReplace && safeSegments.length > 0 && (
              <button
                id="table-find-replace-btn"
                type="button"
                onClick={onOpenFindReplace}
                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-800/80 text-[#00A878] dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="جستجو و جایگزینی سراسری در کل زیرنویس (Ctrl + H)"
              >
                <Replace className="w-3.5 h-3.5 text-[#00A878] dark:text-emerald-400" />
                <span className="font-persian hidden md:inline">جستجو و جایگزینی (Ctrl+H)</span>
              </button>
            )}

            {/* Quick Clean English Parentheses & Tickers */}
            {onCleanEnglishArtifacts && safeSegments.some((s) => s.translatedText) && (
              <button
                id="table-clean-english-btn"
                type="button"
                onClick={onCleanEnglishArtifacts}
                className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-300/80 dark:border-purple-800/80 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="حذف فوری تمام پرانتزهای انگلیسی و اصلاح اسامی شاخص‌ها در ترجمه‌های فعلی"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="font-persian hidden md:inline">حذف پرانتزهای انگلیسی</span>
              </button>
            )}

            {/* Add row button */}
            <button
              id="add-segment-at-end-btn"
              type="button"
              onClick={onAddNewSegmentAtEnd}
              className="px-2.5 py-1 bg-white dark:bg-[#151C28] hover:bg-slate-50 dark:hover:bg-[#1E2736] border border-slate-200 dark:border-[#232D3F] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="افزودن سطر جدید به انتهای زیرنویس"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-persian hidden md:inline">+ سطر جدید</span>
            </button>

            {/* Expand / Minimize Height Toggle */}
            <button
              type="button"
              onClick={() => setIsExpandedHeight((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isExpandedHeight ? 'ارتفاع استاندارد' : 'ارتفاع تمام‌صفحه'}
            >
              {isExpandedHeight ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Search input line */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick filter lines... / فیلتر سریع خطوط..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50/70 dark:bg-[#151C28] border border-slate-200 dark:border-[#232D3F] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-[#182130] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. BATCH ACTIONS BAR (Appears when 1+ checkboxes selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900/60 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-persian animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <span className="font-bold">{selectedIds.size} سطر انتخاب شده است.</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
            >
              لغو انتخاب
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onBatchTranslate && (
              <button
                type="button"
                onClick={() => onBatchTranslate(Array.from(selectedIds))}
                className="px-3 py-1 bg-[#00A878] hover:bg-[#009667] text-white rounded-md font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ترجمه خطوط انتخاب شده</span>
              </button>
            )}

            {onBatchDelete && (
              <button
                type="button"
                onClick={() => {
                  onBatchDelete(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. SCROLLABLE SUBTITLE SEGMENT RECTANGLE CONTAINER */}
      <div
        id="subtitle-scrollable-viewport"
        ref={tableContainerRef as any}
        className="flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-50/50 dark:bg-[#0B0F17]/50 divide-y divide-slate-100 dark:divide-[#1E2736]"
      >
        {safeSegments.length === 0 ? (
          <div className="min-h-[480px] lg:min-h-[540px] flex flex-col justify-center items-center py-10 px-4 sm:px-8 text-center select-none bg-white dark:bg-[#111622]">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".srt"
              className="hidden"
            />

            {/* Top Soft Mint Squircle Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8FAF0] dark:bg-[#064E3B]/25 border border-[#A7F3D0]/70 dark:border-[#059669]/30 flex items-center justify-center mb-5 shadow-2xs">
              <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-[#00A86B] dark:text-[#34D399]" strokeWidth={2.2} />
            </div>

            {/* Main Heading */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 font-persian mb-2.5">
              هیچ فایل زیرنویسی بارگذاری نشده است
            </h3>

            {/* Description Subtext */}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-persian leading-relaxed max-w-lg mx-auto mb-6" dir="rtl">
              برای شروع ترجمه و کار با پنل، فایل زیرنویس با پسوند <span className="font-bold text-slate-700 dark:text-slate-200" dir="ltr">.srt</span> خود را به این قسمت بکشید و رها کنید، یا از دکمه زیر استفاده نمایید.
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-1" dir="rtl">
              {/* Green Button: Upload File */}
              <button
                id="empty-state-upload-btn"
                type="button"
                onClick={triggerFileUpload}
                className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-[#00A86B] hover:bg-[#00945E] text-white rounded-xl font-persian font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-white" strokeWidth={2.2} />
                <span>انتخاب و بارگذاری فایل زیرنویس (.srt)</span>
              </button>

              {/* Light Slate Button: Load Sample File */}
              {onLoadSample && (
                <button
                  id="empty-state-sample-btn"
                  type="button"
                  onClick={onLoadSample}
                  className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:hover:bg-[#283548] text-slate-700 dark:text-slate-200 rounded-xl font-persian font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                  <span>بارگذاری فایل نمونه برای تست</span>
                </button>
              )}
            </div>

            {/* Divider Line */}
            <div className="w-full max-w-md border-t border-slate-100 dark:border-slate-800/80 my-6 sm:my-7" />

            {/* Three Info Columns */}
            <div className="w-full max-w-md grid grid-cols-3 gap-2 sm:gap-4 text-center font-persian" dir="rtl">
              {/* 1. پردازش داده (Right) */}
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  پردازش داده
                </span>
                <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  امن و محلی ۱۰۰٪
                </span>
              </div>

              {/* 2. انکودینگ (Middle) */}
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  انکودینگ
                </span>
                <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  استاندارد UTF-8
                </span>
              </div>

              {/* 3. فرمت فایل (Left) */}
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  فرمت فایل
                </span>
                <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
                  SubRip (.srt)
                </span>
              </div>
            </div>
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-[#151C28] flex items-center justify-center text-slate-400">
              <Search className="w-7 h-7 text-[#00A878]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-persian">
                سطری مطابق با عبارت جستجو یافت نشد
              </p>
              <p className="text-xs text-slate-400 mt-1 font-persian">
                عبارت جستجو را پاک کنید تا همه سطرها نمایش داده شوند.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
            {filteredSegments.map((seg) => {
              const isSelected = selectedSegmentId === seg.id;
              const isChecked = selectedIds.has(seg.id);

              // Calculate duration in seconds
              const startSec = timestampToSeconds(seg.startTime || '00:00:00,000');
              const endSec = timestampToSeconds(seg.endTime || '00:00:01,000');
              const durationSec = Math.max(0, endSec - startSec);

              // Status determination
              const isUntranslated = !seg.translatedText || !seg.translatedText.trim();

              return (
                <div
                  key={seg.id}
                  id={`segment-card-${seg.id}`}
                  onClick={() => onSelectSegment(seg.id)}
                  className={`rounded-2xl transition-all p-4 cursor-pointer bg-white dark:bg-[#151C28] ${
                    isSelected
                      ? 'border-2 border-emerald-500 dark:border-emerald-400 shadow-md ring-1 ring-emerald-500/20'
                      : 'border border-slate-200 dark:border-[#232D3F] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  {/* Top Header Row of Card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    {/* Left: Checkbox, Badge & Timings */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Multi-Select Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(seg.id);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="انتخاب سطر"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Segment Number Badge */}
                      <div
                        className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {seg.id}
                      </div>

                      {/* Timing Display (Clock icon + Timestamps + Duration) */}
                      <div
                        className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={seg.startTime}
                          onChange={(e) => onUpdateSegment(seg.id, { startTime: e.target.value })}
                          className="w-[90px] bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-[#111622] rounded px-1.5 py-0.5 text-center border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-xs"
                          title="زمان شروع (In)"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                          type="text"
                          value={seg.endTime}
                          onChange={(e) => onUpdateSegment(seg.id, { endTime: e.target.value })}
                          className="w-[90px] bg-slate-50 dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-[#111622] rounded px-1.5 py-0.5 text-center border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-xs"
                          title="زمان پایان (Out)"
                        />
                        <span className="text-slate-400 dark:text-slate-500 text-xs ml-0.5 font-sans">
                          ({durationSec.toFixed(1)}s)
                        </span>
                      </div>
                    </div>

                    {/* Right: Status Pill & Action Buttons (ادغام با بعد / شکستن / ترجمه تکی) */}
                    <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {/* Status badge */}
                      {seg.status === 'translating' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-persian font-medium animate-pulse">
                          در حال ترجمه...
                        </span>
                      ) : seg.status === 'error' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-persian font-medium">
                          خطا در ترجمه
                        </span>
                      ) : isUntranslated ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-[#1E2736] text-slate-500 dark:text-slate-400 font-persian font-medium">
                          ترجمه نشده
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-persian font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>ترجمه شده</span>
                        </span>
                      )}

                      {/* Translate Single Line Button */}
                      <button
                        type="button"
                        onClick={() => onTranslateSingle(seg.id)}
                        disabled={isTranslating || seg.status === 'translating'}
                        className={`border text-xs font-persian font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                          seg.status === 'translating'
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 cursor-wait'
                            : 'border-emerald-300 dark:border-emerald-700/70 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                        }`}
                        title="ترجمه فوری این سطر با هوش مصنوعی"
                      >
                        {seg.status === 'translating' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                            <span>درحال ترجمه...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>ترجمه تکی</span>
                          </>
                        )}
                      </button>

                      {/* Delete Line Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteSegment(seg.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="حذف این سطر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Content Area (Two Columns: English & Persian) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
                    {/* Left Column: English Source */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>SOURCE (ENGLISH)</span>
                        <span className="font-medium text-slate-400 dark:text-slate-400 font-persian">
                          (ویرایش متن انگلیسی)
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={seg.sourceText}
                        onChange={(e) => onUpdateSegment(seg.id, { sourceText: e.target.value })}
                        placeholder="English subtitle text..."
                        className="w-full min-h-[85px] text-sm p-3 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#232D3F] rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans subtitle-source-text resize-y font-medium"
                        dir="ltr"
                      />
                    </div>

                    {/* Right Column: Persian Translation */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 font-persian">
                        <span>ترجمه (فارسی)</span>
                      </div>
                      <textarea
                        rows={3}
                        value={seg.translatedText}
                        onChange={(e) => onUpdateSegment(seg.id, { translatedText: e.target.value })}
                        placeholder="ترجمه فارسی..."
                        className={`w-full min-h-[85px] text-sm p-3 rounded-xl transition-all font-persian subtitle-persian-text text-right resize-y placeholder:font-normal font-medium ${
                          seg.status === 'error'
                            ? 'bg-rose-50/40 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            : seg.status === 'translating'
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-400 text-slate-900 dark:text-slate-100 animate-pulse'
                            : 'bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#232D3F] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        }`}
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FOOTER STATUS BAR (Exactly matching screenshot bottom) */}
      <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-[#232D3F] bg-white dark:bg-[#111622] rounded-b-2xl flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Collaborative Ready</span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden sm:inline">Batch scale: 10 lines / call</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Press Tab to hop fields</span>
          <span>•</span>
          <span>Supports dual-editing natively</span>
        </div>
      </div>
    </div>
  );
};
