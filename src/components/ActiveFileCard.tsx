import React, { useRef, useState } from 'react';
import { UploadCloud, Upload, FileText, X, Clock, Download, FileDown } from 'lucide-react';

interface ActiveFileCardProps {
  fileName?: string;
  totalLines?: number;
  progressPercent?: number;
  onFileSelect: (file: File) => void;
  onClearFile?: () => void;
  onDownloadSRT?: () => void;
  onOpenSyncModal?: () => void;
  onOpenExportModal?: () => void;
  className?: string;
}

export const ActiveFileCard: React.FC<ActiveFileCardProps> = ({
  fileName,
  totalLines = 0,
  progressPercent = 0,
  onFileSelect,
  onClearFile,
  onDownloadSRT,
  onOpenSyncModal,
  onOpenExportModal,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const isFileActive = Boolean(fileName && totalLines > 0);

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    if (file.name.toLowerCase().endsWith('.srt') || file.type.includes('text') || file.name.toLowerCase().endsWith('.vtt') || file.name.toLowerCase().endsWith('.txt')) {
      onFileSelect(file);
    } else {
      setUploadError('لطفاً یک فایل زیرنویس با پسوند .srt انتخاب نمایید.');
      setTimeout(() => setUploadError(null), 4000);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      id="active-file-container"
      className={`bg-white dark:bg-[#111622] rounded-2xl border border-slate-200/90 dark:border-[#232D3F] p-5 sm:p-6 shadow-xs transition-colors ${className}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".srt"
        className="hidden"
      />

      {/* Top Header: "ACTIVE FILE" on left, and Status Pill on right matching exact screenshot */}
      <div className="flex items-center justify-between gap-3 mb-4" dir="ltr">
        <span className="text-xs sm:text-[13px] font-bold tracking-wider text-[#475569] dark:text-[#94A3B8] uppercase font-sans">
          ACTIVE FILE
        </span>

        {isFileActive ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#00A86B] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-persian flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
              فایل فعال
            </span>
            <button
              id="active-card-change-file-btn"
              type="button"
              onClick={triggerUpload}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E2738] hover:bg-slate-200 dark:hover:bg-[#273248] rounded-lg transition-colors cursor-pointer"
            >
              تغییر فایل
            </button>
            {onClearFile && (
              <button
                id="active-card-clear-file-btn"
                type="button"
                onClick={onClearFile}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="بستن فایل جاری"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs font-medium px-3.5 py-1 rounded-full bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] font-persian">
            بدون فایل فعال
          </span>
        )}
      </div>

      {/* Main Card Content */}
      {!isFileActive ? (
        /* Empty State matching uploaded screenshot exactly */
        <div
          id="active-file-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerUpload}
          className={`border-2 border-dashed rounded-2xl py-8 px-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#00A86B] bg-emerald-50/30 dark:bg-emerald-950/20'
              : 'border-[#E2E8F0] dark:border-[#334155] hover:border-[#00A86B] dark:hover:border-[#00A86B] bg-transparent'
          }`}
        >
          {/* Cloud upload icon in soft rounded squircle container */}
          <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6 text-[#94A3B8] dark:text-[#94A3B8]" strokeWidth={1.8} />
          </div>

          {/* Heading */}
          <h3 className="text-base font-bold text-[#1E293B] dark:text-[#F8FAFC] font-persian mb-1.5">
            هیچ فایلی بارگذاری نشده است
          </h3>

          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-[#94A3B8] dark:text-[#94A3B8] font-persian mb-5" dir="rtl">
            برای شروع ترجمه، یک فایل زیرنویس (.srt) انتخاب کنید
          </p>

          {uploadError && (
            <div className="mb-4 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-persian">
              {uploadError}
            </div>
          )}

          {/* Green Upload Button */}
          <button
            id="active-file-upload-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerUpload();
            }}
            className="px-6 py-2.5 bg-[#00A86B] hover:bg-[#00945E] active:scale-[0.99] text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-white" strokeWidth={2.2} />
            <span className="font-persian">انتخاب فایل SRT</span>
          </button>
        </div>
      ) : (
        /* Active File Details */
        <div className="space-y-4 font-persian">
          <div className="p-3.5 bg-slate-50 dark:bg-[#151C28] rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[#00A86B] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate"
                title={fileName}
              >
                {fileName}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span dir="ltr" className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Lines: {totalLines ?? 0}
                </span>
                <span>•</span>
                <span>فایل زیرنویس</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] rounded-lg border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center min-h-[48px]">
              <span
                className="font-bold text-slate-800 dark:text-slate-200 text-sm inline-block tracking-tight"
                dir="ltr"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Segoe UI", sans-serif' }}
              >
                Lines: {totalLines ?? 0}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-[#151C28] rounded-lg border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between min-h-[48px]">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                پیشرفت ترجمه:
              </span>
              <span
                className="font-bold text-[#00A86B] text-sm inline-block"
                dir="ltr"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Segoe UI", sans-serif' }}
              >
                {Math.round(progressPercent ?? 0)}%
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            {onDownloadSRT && (
              <button
                id="sidebar-download-srt-btn"
                type="button"
                onClick={onDownloadSRT}
                className="w-full py-2 px-3 bg-[#00A86B] hover:bg-[#00945E] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود فایل / Download SRT</span>
              </button>
            )}

            {onOpenExportModal && (
              <button
                id="sidebar-export-btn"
                type="button"
                onClick={onOpenExportModal}
                className="w-full py-2 px-3 bg-white dark:bg-[#151C28] hover:bg-slate-50 dark:hover:bg-[#1E2736] border border-slate-200 dark:border-[#232D3F] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#00A86B]" />
                <span>سایر قالب‌ها (Export)</span>
              </button>
            )}

            {onOpenSyncModal && (
              <button
                id="sidebar-sync-btn"
                type="button"
                onClick={onOpenSyncModal}
                className="w-full py-2 px-3 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>هماهنگ‌سازی زمانی و رفع دیلی (Sync)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
