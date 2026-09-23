import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Clock,
  Video,
  Upload,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Check,
  Download,
  AlertTriangle,
  Layers,
  ChevronRight,
  Sliders,
  X,
  Volume2,
  BookOpen
} from 'lucide-react';
import { SubtitleSegment } from '../types';
import {
  timestampToSeconds,
  secondsToTimestamp,
  shiftSegments,
  stretchSegments,
  alignToTimestamp,
} from '../utils/timeSync';
import { downloadSRTFile, generateSRT } from '../utils/srtParser';

interface SubtitleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  onSaveSegments: (updated: SubtitleSegment[]) => void;
  selectedSegmentId: number | null;
  fileName?: string;
}

export const SubtitleSyncModal: React.FC<SubtitleSyncModalProps> = ({
  isOpen,
  onClose,
  segments,
  onSaveSegments,
  selectedSegmentId,
  fileName = '',
}) => {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const [activeTab, setActiveTab] = useState<'quick' | 'video' | 'vocal_rules'>('quick');
  const [currentSegments, setCurrentSegments] = useState<SubtitleSegment[]>(safeSegments);
  const [history, setHistory] = useState<SubtitleSegment[][]>([safeSegments]);
  const [scope, setScope] = useState<'all' | 'from_selected' | 'selected_only'>('all');
  const [customOffset, setCustomOffset] = useState<string>('');
  const [offsetUnit, setOffsetUnit] = useState<'seconds' | 'milliseconds'>('seconds');

  // Video Player state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync state notification
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Keep internal segments synced when prop updates
  useEffect(() => {
    const safe = Array.isArray(segments) ? segments : [];
    setCurrentSegments(safe);
    setHistory([safe]);
  }, [segments, isOpen]);

  // Clean up object URL when closing or changing video
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const showToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const applyNewSegments = (newSegs: SubtitleSegment[], description: string) => {
    setHistory((prev) => [...prev, newSegs]);
    setCurrentSegments(newSegs);
    showToast(description);
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
      setHistory((h) => h.slice(0, h.length - 1));
      setCurrentSegments(prev);
      showToast('تغییرات به مرحله قبل بازگردانده شد.');
    }
  };

  // Quick shift handler
  const handleShift = (deltaSeconds: number, label?: string) => {
    const updated = shiftSegments(currentSegments, deltaSeconds, scope, selectedSegmentId);
    const sign = deltaSeconds > 0 ? `+${deltaSeconds}` : `${deltaSeconds}`;
    applyNewSegments(updated, label || `زمان زیرنویس‌ها ${sign} ثانیه جابجا شد.`);
  };

  // Custom shift submit
  const handleCustomShift = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customOffset);
    if (isNaN(val) || val === 0) return;

    const deltaSec = offsetUnit === 'milliseconds' ? val / 1000 : val;
    handleShift(deltaSec, `جابجایی ${val} ${offsetUnit === 'milliseconds' ? 'میلی‌ثانیه' : 'ثانیه'} اعمال شد.`);
    setCustomOffset('');
  };

  // Align starting timestamp to zero (00:00:00)
  const handleAlignToZero = () => {
    if (currentSegments.length === 0) return;
    const firstSec = timestampToSeconds(currentSegments[0].startTime);
    if (firstSec === 0) {
      showToast('زیرنویس هم‌اکنون از ابتدای ثانیه صفر شروع می‌شود.');
      return;
    }
    const updated = shiftSegments(currentSegments, -firstSec, 'all');
    applyNewSegments(updated, 'تمام زیرنویس‌ها به ابتدای ویدیو (00:00:00) تراز شدند.');
  };

  // Video file selection
  const handleVideoFileChange = (file: File) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setIsPlaying(false);
    showToast(`ویدیو "${file.name}" با موفقیت بارگذاری شد.`);
  };

  // Video time update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Sync selected line to current video playback time
  const handleSyncToCurrentVideoTime = () => {
    const targetId = selectedSegmentId || (currentSegments.length > 0 ? currentSegments[0].id : null);
    if (!targetId) return;

    const updated = alignToTimestamp(currentSegments, targetId, currentTime, scope);
    applyNewSegments(
      updated,
      `خط شماره ${targetId} با زمان دقیق ویدیو (${secondsToTimestamp(currentTime)}) هماهنگ شد.`
    );
  };

  // Find active subtitle to display on video preview
  const activeSubtitle = useMemo(() => {
    return currentSegments.find((seg) => {
      const start = timestampToSeconds(seg.startTime);
      const end = timestampToSeconds(seg.endTime);
      return currentTime >= start && currentTime <= end;
    });
  }, [currentSegments, currentTime]);

  // First and last segment timings for summary
  const firstSeg = currentSegments[0];
  const lastSeg = currentSegments[currentSegments.length - 1];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="bg-white dark:bg-[#111622] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232D3F] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 transition-colors"
        dir="rtl"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#232D3F] flex items-center justify-between bg-slate-50/80 dark:bg-[#151C28]/80 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] font-persian">
                هماهنگ‌سازی و رفع تاخیر زیرنویس (Subtitle Sync & Delay Fix)
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-persian">
                تنظیم دقیق زمان‌بندی، رفع دیلی و تست زنده روی ویدیو با زیرنویس فارسی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" dir="ltr">
            {history.length > 1 && (
              <button
                onClick={handleUndo}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232D3F] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2736] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="بازگشت به تغییر قبلی"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo / لغو تغییر</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1E2736] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        {syncToast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900/60 px-6 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{syncToast}</span>
          </div>
        )}

        {/* TABS SELECTOR */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-[#232D3F] bg-white dark:bg-[#111622] flex items-center gap-4 flex-wrap transition-colors">
          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'quick'
                ? 'border-[#00A878] text-[#00A878]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>تنظیم سریع دیلی و جابجایی زمان (Shift Timings)</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'border-[#00A878] text-[#00A878]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>پلیر و تست زنده روی ویدیو (Live Video Sync)</span>
          </button>

          <button
            onClick={() => setActiveTab('vocal_rules')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'vocal_rules'
                ? 'border-[#00A878] text-[#00A878]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>قوانین هماهنگ‌سازی با وکال و سرعت خواندن (Vocal Sync Rules)</span>
          </button>
        </div>

        {/* TAB 1: QUICK SHIFT CONTROLS */}
        {activeTab === 'quick' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-[#0B0F17]">
            {/* CURRENT TIMING STATUS CARD */}
            <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] shadow-2xs transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">وضعیت زمان‌بندی فعلی:</span>
                  <div className="flex items-center gap-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                    <span className="bg-slate-100 dark:bg-[#1E2736] px-2.5 py-1 rounded-md">
                      شروع خط اول: <strong className="text-emerald-700 dark:text-emerald-400">{firstSeg?.startTime || '00:00:00,000'}</strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className="bg-slate-100 dark:bg-[#1E2736] px-2.5 py-1 rounded-md">
                      پایان کل زیرنویس: <strong className="text-slate-900 dark:text-slate-100">{lastSeg?.endTime || '00:00:00,000'}</strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span>تعداد کل خطوط: {currentSegments.length}</span>
                  </div>
                </div>

                {/* Start from 00:00:00 Quick Preset */}
                {firstSeg && timestampToSeconds(firstSeg.startTime) > 5 && (
                  <button
                    onClick={handleAlignToZero}
                    className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FastForward className="w-4 h-4 text-amber-700 dark:text-amber-400 rotate-180" />
                    <span>تراز خط اول به ثانیه ۰۰:۰۰:۰۰ (شروع از ابتدای ویدیو)</span>
                  </button>
                )}
              </div>
            </div>

            {/* SCOPE SELECTION */}
            <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] space-y-2 transition-colors">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                دامنه اعمال تغییرات زمانی (Scope):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer ${
                    scope === 'all'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-[#232D3F] hover:bg-slate-50 dark:hover:bg-[#1E2736] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  تمام خطوط زیرنویس (کل فایل)
                </button>

                <button
                  type="button"
                  onClick={() => setScope('from_selected')}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer ${
                    scope === 'from_selected'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-[#232D3F] hover:bg-slate-50 dark:hover:bg-[#1E2736] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  از خط انتخابی فعلی ({selectedSegmentId || 1}) تا انتها
                </button>

                <button
                  type="button"
                  onClick={() => setScope('selected_only')}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer ${
                    scope === 'selected_only'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-[#232D3F] hover:bg-slate-50 dark:hover:bg-[#1E2736] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  فقط خط انتخابی فعلی ({selectedSegmentId || 1})
                </button>
              </div>
            </div>

            {/* QUICK OFFSET BUTTONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Backward / Advance (Earlier) */}
              <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-rose-100 dark:border-rose-900/40 space-y-3 transition-colors">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                  <Rewind className="w-4 h-4" />
                  <span>زیرنویس عقب است؟ (زودتر ظاهر شود / Shift Backward)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  اگر صدای گوینده را زودتر می‌شنوید و زیرنویس دیر می‌آید، زمان را کم کنید:
                </p>
                <div className="grid grid-cols-4 gap-2" dir="ltr">
                  {[-0.5, -1.0, -2.0, -5.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleShift(sec)}
                      className="py-2 px-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Forward / Delay (Later) */}
              <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-blue-100 dark:border-blue-900/40 space-y-3 transition-colors">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                  <FastForward className="w-4 h-4" />
                  <span>زیرنویس جلوتر است؟ (دیرتر ظاهر شود / Shift Forward)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  اگر متن زیرنویس قبل از صحبت گوینده روی تصویر می‌آید، زمان را اضافه کنید:
                </p>
                <div className="grid grid-cols-4 gap-2" dir="ltr">
                  {[0.5, 1.0, 2.0, 5.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleShift(sec)}
                      className="py-2 px-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      +{sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CUSTOM EXACT OFFSET INPUT */}
            <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] space-y-3 transition-colors">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">تنظیم دستی مقدار دیلی دقیق:</h3>
              <form onSubmit={handleCustomShift} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#232D3F] rounded-lg px-3 py-1.5">
                  <input
                    type="number"
                    step="any"
                    placeholder="مثلاً 1.5 یا -2.3"
                    value={customOffset}
                    onChange={(e) => setCustomOffset(e.target.value)}
                    className="w-36 text-xs bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                  <select
                    value={offsetUnit}
                    onChange={(e) => setOffsetUnit(e.target.value as any)}
                    className="text-xs bg-transparent text-slate-600 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="seconds" className="dark:bg-[#151C28]">ثانیه (Seconds)</option>
                    <option value="milliseconds" className="dark:bg-[#151C28]">میلی‌ثانیه (ms)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!customOffset || isNaN(parseFloat(customOffset))}
                  className="px-4 py-2 bg-[#00A878] hover:bg-[#009667] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  اعمال جابجایی دقیق
                </button>
              </form>
            </div>

            {/* SPEED / FRAMERATE CONVERSION (DRIFT FIX) */}
            <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    رفع ناهماهنگی فریم‌ریت (Framerate Drift / کشش زمانی):
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    اگر زیرنویس در ابتدا هماهنگ است ولی به مرور زمان دیلی آن بیشتر می‌شود:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={() => {
                    const factor = 25 / 23.976;
                    const updated = stretchSegments(currentSegments, factor);
                    applyNewSegments(updated, 'تبدیل فریم‌ریت 23.976 به 25 فریم در ثانیه اعمال شد.');
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E2736] hover:bg-slate-100 dark:hover:bg-[#253248] border border-slate-200 dark:border-[#232D3F] rounded-lg text-xs text-slate-700 dark:text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  23.976 fps → 25 fps (+4.27%)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const factor = 23.976 / 25;
                    const updated = stretchSegments(currentSegments, factor);
                    applyNewSegments(updated, 'تبدیل فریم‌ریت 25 به 23.976 فریم در ثانیه اعمال شد.');
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E2736] hover:bg-slate-100 dark:hover:bg-[#253248] border border-slate-200 dark:border-[#232D3F] rounded-lg text-xs text-slate-700 dark:text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  25 fps → 23.976 fps (-4.09%)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const factor = 24 / 25;
                    const updated = stretchSegments(currentSegments, factor);
                    applyNewSegments(updated, 'تبدیل فریم‌ریت 25 به 24 فریم در ثانیه اعمال شد.');
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E2736] hover:bg-slate-100 dark:hover:bg-[#253248] border border-slate-200 dark:border-[#232D3F] rounded-lg text-xs text-slate-700 dark:text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  25 fps → 24 fps
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE VIDEO PLAYER SYNC */}
        {activeTab === 'video' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-900 text-white">
            {/* VIDEO DRAG & DROP / SELECTOR IF NO VIDEO */}
            {!videoUrl ? (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center bg-slate-800/50 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                  <Upload className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    فایل ویدیوی خود را اینجا رها کنید یا انتخاب کنید
                  </h3>
                  <p className="text-xs text-slate-400">
                    ویدیو به طور کامل در مرورگر شما پخش می‌شود و جایی آپلود نخواهد شد (پشتیبانی از MP4، WebM، MKV).
                  </p>
                </div>
                <label className="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-lg shadow-emerald-500/30">
                  انتخاب فایل ویدیو از سیستم
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleVideoFileChange(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {/* VIDEO CANVAS WITH SUBTITLE OVERLAY */}
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video max-h-[380px] mx-auto flex items-center justify-center shadow-xl border border-slate-800">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setVideoDuration(videoRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls
                    className="w-full h-full object-contain"
                  />

                  {/* SUBTITLE OVERLAY */}
                  {activeSubtitle && (
                    <div className="absolute bottom-12 left-4 right-4 text-center pointer-events-none select-none z-10">
                      <div className="inline-block px-4 py-1.5 rounded-lg bg-black/85 backdrop-blur-xs border border-white/15 max-w-2xl text-yellow-300 font-persian text-sm sm:text-base font-bold shadow-lg leading-relaxed">
                        {activeSubtitle.translatedText || activeSubtitle.sourceText}
                      </div>
                      {activeSubtitle.translatedText && (
                        <div className="text-[11px] text-slate-300 mt-1 font-sans opacity-90 drop-shadow">
                          {activeSubtitle.sourceText}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* VIDEO SYNC CONTROLS BAR */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 font-mono">
                      زمان فعلی ویدیو: <strong className="text-emerald-400">{secondsToTimestamp(currentTime)}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-xs text-slate-300">
                      {activeSubtitle ? (
                        <span className="text-yellow-300 font-mono">
                          خط فعلی ({activeSubtitle.id}): {activeSubtitle.startTime} → {activeSubtitle.endTime}
                        </span>
                      ) : (
                        <span className="text-slate-500">زیرنویسی در این لحظه وجود ندارد</span>
                      )}
                    </span>
                  </div>

                  {/* ONE-CLICK SYNC CURRENT LINE TO THIS TIME */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncToCurrentVideoTime}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-4 h-4" />
                      <span>سینک خط {selectedSegmentId || 1} با همین ثانیه ویدیو</span>
                    </button>

                    {/* Quick Live +/- 0.5s buttons */}
                    <button
                      onClick={() => handleShift(-0.5)}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                      title="زیرنویس ۰.۵ ثانیه زودتر بیاید"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => handleShift(0.5)}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                      title="زیرنویس ۰.۵ ثانیه دیرتر بیاید"
                    >
                      +0.5s
                    </button>

                    <label className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors">
                      تعویض ویدیو
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleVideoFileChange(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VOCAL SYNC RULES & READING SPEED GUIDE */}
        {activeTab === 'vocal_rules' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-[#0B0F17] font-persian text-right text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                قانون اصلی هماهنگ‌سازی زیرنویس با وکال و تایم‌لاین ویدیو
              </h3>
              <p className="text-emerald-900 dark:text-emerald-300">
                ترجمهٔ SRT مستقیماً روی ویدیو نمایش داده می‌شود؛ بنابراین فقط ترجمه معنایی کافی نیست. هدف نهایی:{' '}
                <strong>«شنیدن وکال + خواندن زیرنویس + دنبال کردن چارت»</strong> به‌صورت همزمان و بدون نیاز به توقف ویدیو است.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] shadow-2xs space-y-2 transition-colors">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">۱. هماهنگی طول متن با زمان موجود</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  اگر مدت زمان زیرنویس کوتاه است، ترجمه باید <strong>فشرده، طبیعی و سریع‌خوان</strong> باشد. برای زیرنویس‌های طولانی‌تر نیز از اضافه کردن کلمات حشو برای پر کردن زمان خودداری شود.
                </p>
              </div>

              <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] shadow-2xs space-y-2 transition-colors">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">۲. سرعت استاندارد مطالعه (Reading Speed / CPS)</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  استاندارد سرعت خواندن زیرنویس فارسی بین <strong>۱۲ تا ۱۷ کاراکتر در ثانیه (c/s)</strong> است. مقادیر بالای ۲۲ کاراکتر نیازمند فشرده‌سازی هستند و در ادیتور با برچسب هشدار نمایش داده می‌شوند.
                </p>
              </div>

              <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] shadow-2xs space-y-2 transition-colors">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">۳. تقسیم‌بندی طبیعی و دستوری</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  شکستن جملات بین خطوط باید در پایان بندها و عبارات معنایی باشد. هرگز ترکیبات تخصصی واحد مثل «افویجی» یا «اوردر بلاک» نباید بین دو زیرنویس نصف شوند.
                </p>
              </div>

              <div className="bg-white dark:bg-[#151C28] rounded-xl p-4 border border-slate-200 dark:border-[#232D3F] shadow-2xs space-y-2 transition-colors">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">۴. اولویت‌بندی کیفی ترجمه</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  <strong>دقت مفهومی و تخصصی ICT &gt; هماهنگی با وکال &gt; طبیعی بودن فارسی &gt; خوانایی زیرنویس</strong>. هرگز نباید مفاهیم تخصصی یا شرایط ستاپ معاملاتی به بهانه کوتاه کردن حذف شوند.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                خط قرمزهای ترجمه فشرده (مواردی که هرگز نباید حذف شوند):
              </h4>
              <p className="text-amber-900 dark:text-amber-300">
                جهت بازار، زمان، قیمت‌ها، High/Low، BSL/SSL، DOL، Bias، Narrative، PD Array، Entry، Stop Loss، Target، روابط علت و معلولی و اصطلاحات پایه‌ای ICT همواره باید دقیق و شفاف باقی بمانند.
              </p>
            </div>
          </div>
        )}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#232D3F] bg-white dark:bg-[#151C28] flex flex-wrap items-center justify-between gap-3 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-persian">
            تغییرات بلافاصله روی تمام خطوط محاسبه و قابل دانلود هستند.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const srtContent = generateSRT(currentSegments, true);
                const base = (fileName || 'subtitles').replace(/\.srt$/i, '');
                downloadSRTFile(srtContent, `${base}_synced.srt`);
                showToast('فایل زیرنویس سینک شده با موفقیت دانلود شد.');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-[#1E2736] hover:bg-slate-200 dark:hover:bg-[#253248] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>دانلود مستقیم فایل سینک شده (SRT)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveSegments(currentSegments);
                onClose();
              }}
              className="px-5 py-2 bg-[#00A878] hover:bg-[#009667] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00A878]/20 transition-colors cursor-pointer"
            >
              ذخیره و اعمال در ادیتور
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
