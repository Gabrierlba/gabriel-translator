import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  Globe,
  Layers,
  Table,
  Code,
  Eye,
  ChevronUp,
  FileDown,
  Sparkles,
  Palette,
  Settings2,
  FolderArchive,
  Tv,
  BookOpen,
  FileCode,
  AlignLeft,
} from 'lucide-react';
import { SubtitleSegment } from '../types';
import {
  downloadExportFile,
  downloadZipBundle,
  generateSRTContent,
  generateWebVTTContent,
  generateASSContent,
  generateBilingualSRTContent,
  generateSBVContent,
  generateYTranscriptContent,
  generateTranscriptWithTimestamps,
  generatePlainTextContent,
  generateMarkdownContent,
  generateObsidianMarkdownContent,
  generateObsidianTextContent,
  generateCSVContent,
  generateTSVContent,
  generateJSONContent,
  ASSOptions,
  BilingualOptions,
} from '../utils/exportFormats';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  fileName?: string;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type ExportCategory = 'subtitles' | 'transcripts' | 'settings';

export type ExportFormatKey =
  | 'srt_fa'
  | 'ass'
  | 'vtt'
  | 'bilingual'
  | 'sbv'
  | 'obsidian_md'
  | 'obsidian_txt'
  | 'transcript_ts'
  | 'txt'
  | 'markdown'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'srt_en';

interface FormatConfig {
  key: ExportFormatKey;
  category: 'subtitles' | 'transcripts';
  title: string;
  subtitle: string;
  ext: string;
  badge: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  popular?: boolean;
  generate: (segments: SubtitleSegment[], fileName?: string) => string;
  mimeType: string;
  suffix: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  segments,
  fileName,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<ExportCategory>('subtitles');
  const [copiedKey, setCopiedKey] = useState<ExportFormatKey | null>(null);
  const [previewKey, setPreviewKey] = useState<ExportFormatKey | null>('srt_fa');
  const [isZipping, setIsZipping] = useState(false);

  // Customization Settings for Advanced SubStation Alpha (.ass)
  const [assOptions, setAssOptions] = useState<ASSOptions>({
    fontName: 'Vazirmatn',
    fontSize: 48,
    primaryColor: '&H0000FFFF', // Yellow BGR (matching standard video subtitles)
    outlineColor: '&H00000000', // Black
    outlineWidth: 2.5,
    shadowDepth: 1.5,
    mode: 'translated',
    bilingualOrder: 'en_top_fa_bottom',
  });

  // Customization Settings for Bilingual Subtitles (English top, Persian bottom)
  const [bilingualOptions, setBilingualOptions] = useState<BilingualOptions>({
    order: 'en_first',
    separator: '\n',
    includeUntranslatedPlaceholder: true,
  });

  const baseFileName = useMemo(() => {
    return (fileName || 'subtitles').replace(/\.(srt|vtt|txt|ass|sbv)$/i, '');
  }, [fileName]);

  const translatedCount = useMemo(() => {
    return segments.filter((s) => s.translatedText?.trim()).length;
  }, [segments]);

  const formats: FormatConfig[] = useMemo(
    () => [
      // 1. Subtitle & Video Formats
      {
        key: 'srt_fa',
        category: 'subtitles',
        title: 'زیرنویس فارسی استاندارد (SRT)',
        subtitle: 'Standard SubRip Subtitles',
        ext: '.srt',
        badge: 'استاندارد جهانی',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
        icon: FileDown,
        popular: true,
        description: 'فرمت استاندارد تمام تلویزیون‌ها، VLC، PotPlayer، KMPlayer و پلیرهای موبایل با انکودینگ ضد به‌هم‌ریختگی (UTF-8 BOM).',
        generate: (segs) => generateSRTContent(segs, true),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_Persian_translated.srt',
      },
      {
        key: 'ass',
        category: 'subtitles',
        title: 'زیرنویس استایل‌دار حرفه‌ای (ASS / SSA)',
        subtitle: 'Advanced SubStation Alpha',
        ext: '.ass',
        badge: 'فونت و استایل اختصاصی',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300',
        icon: Tv,
        popular: true,
        description: 'استایل‌دهی سینمایی به زیرنویس با فونت دلخواه، رنگ زرد یا سفید، حاشیه مشکی و سایه جهت خوانایی بی‌نظیر روی هر پس‌زمینه‌ای.',
        generate: (segs, name) => generateASSContent(segs, name || baseFileName, assOptions),
        mimeType: 'text/x-ssa;charset=utf-8',
        suffix: '_Styled.ass',
      },
      {
        key: 'bilingual',
        category: 'subtitles',
        title: 'زیرنویس دوزبانه (Bilingual SRT)',
        subtitle: 'Dual Subtitles (EN on Top + FA on Bottom)',
        ext: '.srt',
        badge: 'آموزشی و یادگیری زبان',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300',
        icon: Layers,
        description: 'نمایش همزمان متن انگلیسی در سطر بالا و ترجمه فارسی در سطر پایین (مطابق عکس و ویدیوهای آموزشی) جهت تقویت شنیداری و فهم همزمان.',
        generate: (segs) => generateBilingualSRTContent(segs, bilingualOptions),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_Bilingual_EN_FA.srt',
      },
      {
        key: 'vtt',
        category: 'subtitles',
        title: 'فرمت وب و پلیرهای HTML5 (WebVTT)',
        subtitle: 'HTML5 Video & Web Streaming',
        ext: '.vtt',
        badge: 'استاندارد وب و مروگر',
        badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
        icon: Globe,
        description: 'فرمت رسمی مرورگرها برای تگ <track> در ویدیوهای وب‌سایت، سرویس‌های استریم و سامانه‌های LMS.',
        generate: (segs) => generateWebVTTContent(segs, 'translated'),
        mimeType: 'text/vtt;charset=utf-8',
        suffix: '_Persian.vtt',
      },
      {
        key: 'sbv',
        category: 'subtitles',
        title: 'فرمت اختصاصی استودیوی یوتیوب (SBV)',
        subtitle: 'YouTube SubViewer Format',
        ext: '.sbv',
        badge: 'اختصاصی YouTube',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300',
        icon: FileCode,
        description: 'فرمت اختصاصی یوتیوب برای آپلود بی‌دردسر در YouTube Studio بدون ایجاد مشکل تایم‌کد.',
        generate: (segs) => generateSBVContent(segs, 'translated'),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_YouTube.sbv',
      },
      {
        key: 'srt_en',
        category: 'subtitles',
        title: 'زیرنویس اصلی انگلیسی (English SRT)',
        subtitle: 'Original English Master',
        ext: '.srt',
        badge: 'سورس اصلی',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: FileText,
        description: 'نسخه تمیز و ادیت شده سورس زبان اصلی برای نگهداری نسخه مادر یا همگام‌سازی.',
        generate: (segs) => generateSRTContent(segs, false),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_English_source.srt',
      },

      // 2. Transcripts, Docs, Obsidian & Sheets
      {
        key: 'ytranscript_fa',
        category: 'transcripts',
        title: 'رونوشت یوتیوب YTranscript (فارسی روان)',
        subtitle: 'YTranscript Style Clean Timestamped Text (FA)',
        ext: '.txt',
        badge: 'استاندارد YTranscript',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
        icon: AlignLeft,
        popular: true,
        description: 'فرمت دقیق سایت و ابزار YTranscript؛ قرارگیری زمان شروع (مانند 00:14) در کنار جمله و فاصله بین سطرها، ایده‌آل برای مطالعه، خلاصه‌سازی و پرامپت هوش مصنوعی.',
        generate: (segs) => generateYTranscriptContent(segs, 'translated'),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_YTranscript_FA.txt',
      },
      {
        key: 'ytranscript_en',
        category: 'transcripts',
        title: 'رونوشت یوتیوب YTranscript (متن انگلیسی اصلی)',
        subtitle: 'YTranscript Original English YouTube Format',
        ext: '.txt',
        badge: 'سورس اصلی انگلیسی',
        badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300',
        icon: AlignLeft,
        popular: true,
        description: 'خروجی یکدست و منظم زبان اصلی ویدیو دقیقاً مطابق با ساختار تایم‌کد و متن YTranscript (00:14 hi Caleb this is a 15-minute...).',
        generate: (segs) => generateYTranscriptContent(segs, 'source'),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_YTranscript_EN.txt',
      },
      {
        key: 'ytranscript_bilingual',
        category: 'transcripts',
        title: 'رونوشت YTranscript دوزبانه (انگلیسی بالا + ترجمه فارسی)',
        subtitle: 'Bilingual YTranscript (EN on top + FA below)',
        ext: '.txt',
        badge: 'آموزشی دوزبانه',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300',
        icon: Layers,
        description: 'تایم‌کد دقیق YTranscript به همراه متن انگلیسی در خط اول و ترجمه فارسی در زیر آن برای یادگیری زبان و آموزش.',
        generate: (segs) => generateYTranscriptContent(segs, 'bilingual'),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_YTranscript_Bilingual.txt',
      },
      {
        key: 'obsidian_md',
        category: 'transcripts',
        title: 'یادداشت حرفه‌ای ابسیدین (Obsidian Markdown .md)',
        subtitle: 'Obsidian Note with Frontmatter & Callouts',
        ext: '.md',
        badge: 'ویژه ابسیدین (Obsidian)',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300',
        icon: Code,
        popular: true,
        description: 'سند بهینه‌شده Markdown برای ابسیدین شامل هدر متادیتا (YAML Frontmatter)، تگ‌ها، باکس‌های کال‌اوت زیبا و تفکیک تایم‌کد جهت پیوند به یادداشت‌های دیگر.',
        generate: (segs, name) => generateObsidianMarkdownContent(segs, name || baseFileName),
        mimeType: 'text/markdown;charset=utf-8',
        suffix: '_Obsidian_Note.md',
      },
      {
        key: 'obsidian_txt',
        category: 'transcripts',
        title: 'متن یادداشت ابسیدین و نوت‌ها (Obsidian Notes TXT)',
        subtitle: 'Structured Plain Text for Obsidian Vault',
        ext: '.txt',
        badge: 'یادداشت ساده متنی',
        badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
        icon: BookOpen,
        popular: true,
        description: 'قالب تمیز متنی با ساختار هدر و تایم‌کدهای استاندارد جهت ذخیره سریع در والت ابسیدین یا نرم‌افزارهای یادداشت‌برداری (Notion / Apple Notes).',
        generate: (segs, name) => generateObsidianTextContent(segs, name || baseFileName),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_Obsidian_Notes.txt',
      },
      {
        key: 'transcript_ts',
        category: 'transcripts',
        title: 'رونوشت با تایم‌کد [00:01:23] (Transcript)',
        subtitle: 'Timestamped Lecture Notes',
        ext: '.txt',
        badge: 'ساخت چپتر و جزوه',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
        icon: BookOpen,
        popular: true,
        description: 'متن منظم همراه با برچسب‌های زمانی تمیز. ایده‌آل برای ساخت بخش‌های ویدیوی یوتیوب، یادداشت‌برداری کلاسی و پرامپت هوش مصنوعی.',
        generate: (segs) => generateTranscriptWithTimestamps(segs, 'translated'),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_Transcript_Timestamps.txt',
      },
      {
        key: 'txt',
        category: 'transcripts',
        title: 'متن پیوسته بدون تایم‌کد (Plain Text)',
        subtitle: 'Clean Continuous Article',
        ext: '.txt',
        badge: 'متن خالص',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: FileText,
        description: 'متن پیوسته کتابی بدون شماره سطر و تایم‌کد؛ عالی برای تبدیل به مقاله متنی، ساخت جزوه چاپی یا ارسال به موتورهای صوتی TTS.',
        generate: (segs) => generatePlainTextContent(segs, 'translated'),
        mimeType: 'text/plain;charset=utf-8',
        suffix: '_Plain_Text.txt',
      },
      {
        key: 'markdown',
        category: 'transcripts',
        title: 'سند مارک‌داون تفکیک‌شده (Markdown .md)',
        subtitle: 'Formatted Documentation & Summary',
        ext: '.md',
        badge: 'گزارش مستندسازی',
        badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300',
        icon: Code,
        description: 'سند ساختاریافته جدول‌بندی‌شده دو زبانه با جدول تایم‌کد برای Notion، GitHub، Obsidian و گزارشات فنی.',
        generate: (segs, name) => generateMarkdownContent(segs, name || baseFileName),
        mimeType: 'text/markdown;charset=utf-8',
        suffix: '_Report.md',
      },
      {
        key: 'csv',
        category: 'transcripts',
        title: 'جدول اکسل و شیت (CSV Spreadsheet)',
        subtitle: 'Comma Separated Values',
        ext: '.csv',
        badge: 'Excel / Sheets',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
        icon: Table,
        description: 'ستون‌بندی دقیق ردیف، زمان شروع، زمان پایان، متن اصلی و ترجمه فارسی با انکودینگ UTF-8 BOM مخصوص مایکروسافت اکسل.',
        generate: (segs) => generateCSVContent(segs),
        mimeType: 'text/csv;charset=utf-8',
        suffix: '_Spreadsheet.csv',
      },
      {
        key: 'tsv',
        category: 'transcripts',
        title: 'جدول تب‌بندی شده کپی مستقیم (TSV)',
        subtitle: 'Tab Separated Values',
        ext: '.tsv',
        badge: 'پیست مستقیم در شیت',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300',
        icon: Table,
        description: 'جداکننده تب (Tab) برای کپی کردن کل محتوا و پیست بدون هیچ‌گونه خطا یا به هم ریختگی در Google Sheets.',
        generate: (segs) => generateTSVContent(segs),
        mimeType: 'text/tab-separated-values;charset=utf-8',
        suffix: '_Spreadsheet.tsv',
      },
      {
        key: 'json',
        category: 'transcripts',
        title: 'داده ساختاریافته برای توسعه‌دهندگان (JSON)',
        subtitle: 'Full Metadata JSON Export',
        ext: '.json',
        badge: 'API & Developers',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
        icon: Code,
        description: 'آبجکت کامل سطرها به همراه وضعیت ترجمه، طول زمان، مدل زبانی استفاده شده و متادیتای پروژه جهت استفاده در سیستم‌های ابری.',
        generate: (segs, name) => generateJSONContent(segs, name || baseFileName),
        mimeType: 'application/json;charset=utf-8',
        suffix: '_data.json',
      },
    ],
    [assOptions, bilingualOptions, baseFileName]
  );

  if (!isOpen) return null;

  const handleDownload = (format: FormatConfig) => {
    if (segments.length === 0) {
      onShowToast?.('هیچ زیرنویسی برای خروجی وجود ندارد.', 'error');
      return;
    }
    const content = format.generate(segments, fileName);
    const finalName = `${baseFileName}${format.suffix}`;
    downloadExportFile(content, finalName, format.mimeType);
    onShowToast?.(`فایل «${finalName}» با موفقیت دانلود شد.`, 'success');
  };

  const handleCopy = (format: FormatConfig) => {
    if (segments.length === 0) return;
    const content = format.generate(segments, fileName);
    navigator.clipboard.writeText(content).then(() => {
      setCopiedKey(format.key);
      onShowToast?.(`محتوای فایل ${format.ext} در کلیپ‌بورد کپی شد.`, 'success');
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  // Download All formats bundled as a single ZIP
  const handleDownloadAllZip = async () => {
    if (segments.length === 0) {
      onShowToast?.('هیچ زیرنویسی برای خروجی وجود ندارد.', 'error');
      return;
    }
    setIsZipping(true);
    try {
      const filesToZip = formats.map((fmt) => ({
        name: `${baseFileName}${fmt.suffix}`,
        content: fmt.generate(segments, fileName),
      }));

      await downloadZipBundle(filesToZip, `${baseFileName}_All_Formats.zip`);
      onShowToast?.(`بسته کامل تمام فرمت‌ها (${formats.length} فایل) دانلود شد.`, 'success');
    } catch (e) {
      console.error(e);
      onShowToast?.('خطا در فشرده‌سازی فایل‌های خروجی.', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const activePreviewFormat = formats.find((f) => f.key === previewKey) || formats[0];
  const activePreviewContent = activePreviewFormat
    ? activePreviewFormat.generate(segments.slice(0, 5), fileName)
    : '';

  const filteredFormats = formats.filter((f) => f.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="multi-format-export-modal"
        className="bg-white dark:bg-[#111622] rounded-2xl border border-slate-200 dark:border-[#232D3F] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-[#232D3F] flex items-center justify-between bg-slate-50 dark:bg-[#151C28]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#00A86B] dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-persian flex items-center gap-2">
                <span>خروجی و تبدیل چندگانه زیرنویس</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00A86B]/15 text-[#00A86B] dark:text-emerald-400 font-mono" dir="ltr">
                  Multi-Format Export
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-persian mt-0.5">
                تبدیل و دانلود در قالب‌های استاندارد ویدیویی، فونت استایل‌دار، دوزبانه، جزوه متنی و اکسل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Zip All Button */}
            <button
              id="export-zip-all-btn"
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isZipping || segments.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-[#00A86B] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs font-bold font-persian transition-all cursor-pointer disabled:opacity-50"
              title="دانلود همه فرمت‌ها در قالب یک فایل فشرده ZIP"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isZipping ? 'در حال آماده‌سازی...' : 'دانلود همه (ZIP)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#1E2736] transition-colors cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2.5 sm:px-6 bg-emerald-50/40 dark:bg-emerald-950/15 border-b border-emerald-100 dark:border-emerald-900/30 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-persian gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              نام فایل: <code className="font-mono text-[11px] text-[#00A86B]" dir="ltr">{baseFileName || 'subtitles'}</code>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>کل خطوط: <b className="font-mono" dir="ltr">{segments.length}</b></span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>ترجمه‌شده: <b className="font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">{translatedCount}</b></span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>انکودینگ یکپارچه UTF-8 با BOM برای عدم به‌هم‌ریختگی حروف فارسی در پلیرها.</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 sm:px-6 pt-3 border-b border-slate-200 dark:border-[#232D3F] bg-white dark:bg-[#111622] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('subtitles')}
              className={`px-3.5 py-2 rounded-t-lg font-bold text-xs sm:text-[13px] font-persian flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'subtitles'
                  ? 'border-[#00A86B] text-[#00A86B] bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>قالب‌های زیرنویس و ویدیو (۶ فرمت)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transcripts')}
              className={`px-3.5 py-2 rounded-t-lg font-bold text-xs sm:text-[13px] font-persian flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'transcripts'
                  ? 'border-[#00A86B] text-[#00A86B] bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>رونوشت، YTranscript، ابسیدین و اکسل (۱۱ فرمت)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-t-lg font-bold text-xs sm:text-[13px] font-persian flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-[#00A86B] text-[#00A86B] bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>تنظیمات استایل و دوزبانه</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadAllZip}
            className="sm:hidden text-xs text-[#00A86B] font-bold font-persian flex items-center gap-1"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>دانلود ZIP</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab !== 'settings' ? (
            /* Format Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isSelectedPreview = previewKey === fmt.key;
                const isCopied = copiedKey === fmt.key;

                return (
                  <div
                    key={fmt.key}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${
                      fmt.popular
                        ? 'border-emerald-300 dark:border-emerald-600/70 bg-emerald-50/15 dark:bg-emerald-950/15 shadow-2xs'
                        : isSelectedPreview
                        ? 'border-slate-400 dark:border-slate-600 bg-slate-50/50 dark:bg-[#151C28]'
                        : 'border-slate-200 dark:border-[#232D3F] bg-white dark:bg-[#151C28]/60 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div>
                      {/* Top Bar of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              fmt.popular
                                ? 'bg-[#00A86B] text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-[#1E2736] text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 font-persian flex items-center gap-1.5">
                              {fmt.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-sans">{fmt.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold font-persian ${fmt.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {fmt.badge}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {fmt.ext}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-persian leading-relaxed mb-3">
                        {fmt.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#1E2736]">
                      <button
                        type="button"
                        onClick={() => setPreviewKey(isSelectedPreview ? null : fmt.key)}
                        className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-persian transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isSelectedPreview ? 'بستن پیش‌نمایش' : 'مشاهده پیش‌نمایش'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(fmt)}
                          className="px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2736] border border-slate-200 dark:border-[#232D3F] rounded-lg flex items-center gap-1 font-persian transition-colors cursor-pointer"
                          title="کپی متن در کلیپ‌بورد"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>کپی</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownload(fmt)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            fmt.popular
                              ? 'bg-[#00A86B] hover:bg-[#00945E] text-white'
                              : 'bg-slate-800 hover:bg-slate-900 dark:bg-[#1E2736] dark:hover:bg-[#2A3649] text-white'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="font-persian">دانلود {fmt.ext}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Customization Tab for ASS Subtitles & Bilingual */
            <div className="space-y-6">
              {/* ASS SubStation Alpha Settings */}
              <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/15 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-purple-900/30">
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-persian">
                        تنظیمات استایل اختصاصی فرمت سینمایی ASS (.ass)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-persian">
                        فونت، رنگ، اندازه و حاشیه مشکی زیرنویس روی ویدیو را مطابق سلیقه خود تنظیم کنید.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-bold">
                    Advanced SubStation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-persian">
                  {/* Font Selection */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      فونت فارسی زیرنویس:
                    </label>
                    <select
                      value={assOptions.fontName}
                      onChange={(e) => setAssOptions({ ...assOptions, fontName: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#151C28] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      <option value="Vazirmatn">وزیرمتن (پیشنهادی - Vazirmatn)</option>
                      <option value="Shabnam">شبنم (Shabnam)</option>
                      <option value="Sahel">ساحل (Sahel)</option>
                      <option value="Tahoma">تاهما (Tahoma استاندارد ویندوز)</option>
                      <option value="Arial">Arial</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      اندازه قلم (Font Size):
                    </label>
                    <select
                      value={assOptions.fontSize}
                      onChange={(e) => setAssOptions({ ...assOptions, fontSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#151C28] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      <option value={38}>کوچک (38px)</option>
                      <option value={44}>استاندارد مانیتور (44px)</option>
                      <option value={48}>بزرگ و واضح (48px - پیشنهادی)</option>
                      <option value={54}>خیلی بزرگ برای تلویزیون (54px)</option>
                      <option value={60}>سینمایی ماکزیمم (60px)</option>
                    </select>
                  </div>

                  {/* Primary Text Color */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      رنگ متن زیرنویس:
                    </label>
                    <select
                      value={assOptions.primaryColor}
                      onChange={(e) => setAssOptions({ ...assOptions, primaryColor: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#151C28] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      <option value="&H00FFFFFF">سفید کلاسیک (White)</option>
                      <option value="&H0000FFFF">زرد درخشان (Yellow)</option>
                      <option value="&H002BF0F8">طلایی ملایم (Warm Gold)</option>
                      <option value="&H00FFFF00">فیروزه‌ای ملایم (Cyan)</option>
                      <option value="&H00E0E0E0">خاکستری روشن (Light Gray)</option>
                    </select>
                  </div>
                </div>

                {/* Outline & Shadow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-persian pt-2">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      ضخامت حاشیه مشکی (Outline Width):
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.5"
                        value={assOptions.outlineWidth}
                        onChange={(e) => setAssOptions({ ...assOptions, outlineWidth: parseFloat(e.target.value) })}
                        className="w-full accent-purple-600"
                      />
                      <span className="font-mono text-xs w-10 text-center font-bold">{assOptions.outlineWidth}px</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      حالت متن در خروجی ASS:
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="ass_mode"
                          checked={assOptions.mode === 'translated'}
                          onChange={() => setAssOptions({ ...assOptions, mode: 'translated' })}
                          className="accent-[#00A86B]"
                        />
                        <span>فقط فارسی</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="ass_mode"
                          checked={assOptions.mode === 'bilingual'}
                          onChange={() => setAssOptions({ ...assOptions, mode: 'bilingual' })}
                          className="accent-[#00A86B]"
                        />
                        <span>دوزبانه (انگلیسی بالا + فارسی پایین)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bilingual Subtitles Settings */}
              <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/15 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-blue-100 dark:border-blue-900/30">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-persian">
                      تنظیمات چیدمان زیرنویس دوزبانه (Bilingual SRT)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-persian">
                      اولویت قرارگیری زبان‌ها و نحوه تفکیک سطرها
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-persian">
                  <div>
                    <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                      ترتیب قرارگیری سطرها:
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151C28] cursor-pointer">
                        <input
                          type="radio"
                          name="bi_order"
                          checked={bilingualOptions.order === 'en_first'}
                          onChange={() => setBilingualOptions({ ...bilingualOptions, order: 'en_first' })}
                          className="accent-[#00A86B]"
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-100">سطر بالا انگلیسی، سطر پایین فارسی (پیش‌فرض پیشنهادی)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151C28] cursor-pointer">
                        <input
                          type="radio"
                          name="bi_order"
                          checked={bilingualOptions.order === 'fa_first'}
                          onChange={() => setBilingualOptions({ ...bilingualOptions, order: 'fa_first' })}
                          className="accent-[#00A86B]"
                        />
                        <span>سطر بالا فارسی، سطر پایین انگلیسی</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                      نوع جداکننده بین دو زبان:
                    </label>
                    <select
                      value={bilingualOptions.separator}
                      onChange={(e) => setBilingualOptions({ ...bilingualOptions, separator: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#151C28] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      <option value={'\n'}>دو خط مجزا (سطر جدید - پیشنهادی)</option>
                      <option value={' | '}>در همان خط با علامت پایپ ( | )</option>
                      <option value={' // '}>در همان خط با اسلش ( // )</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Box */}
          {previewKey && activePreviewFormat && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#232D3F] bg-slate-900 text-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 font-mono" dir="ltr">
                  <span className="text-emerald-400 font-bold">{activePreviewFormat.ext}</span>
                  <span className="text-slate-400">({baseFileName}{activePreviewFormat.suffix})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-persian">پیش‌نمایش زنده خروجی (۵ خط اول)</span>
                  <button
                    type="button"
                    onClick={() => setPreviewKey(null)}
                    className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    title="بستن باکس پیش‌نمایش"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre
                className="text-[11px] font-mono leading-relaxed p-2.5 max-h-44 overflow-y-auto whitespace-pre-wrap text-slate-300 select-all bg-black/40 rounded-lg"
                dir="ltr"
              >
                {activePreviewContent || '// No lines available to preview'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-slate-200 dark:border-[#232D3F] bg-slate-50 dark:bg-[#151C28] flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="text-slate-500 dark:text-slate-400 font-persian text-[11px] flex items-center gap-2">
            <span>مجموع ۱۷ قالب خروجی (شامل فرمت‌های اختصاصی YTranscript، ابسیدین MD و TXT) با تبدیل آنی و انکودینگ سالم UTF-8 BOM آماده دانلود هستند.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isZipping || segments.length === 0}
              className="px-4 py-2 bg-[#00A86B] hover:bg-[#00945E] text-white rounded-lg font-bold font-persian flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isZipping ? 'در حال تولید آرشیو...' : 'دانلود همه فرمت‌ها (ZIP Package)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-[#1E2736] hover:bg-slate-300 dark:hover:bg-[#283547] text-slate-700 dark:text-slate-200 rounded-lg font-medium font-persian transition-colors cursor-pointer"
            >
              بستن پنجره
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
