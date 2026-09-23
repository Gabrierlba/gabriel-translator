import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X,
  CaseSensitive,
  WholeWord,
  CheckCheck,
} from 'lucide-react';
import { SubtitleSegment } from '../types';

interface FindReplaceBarProps {
  segments: SubtitleSegment[];
  onUpdateSegments: (updated: SubtitleSegment[]) => void;
  onClose: () => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
  isOpen?: boolean;
}

interface MatchPosition {
  segmentId: number;
  field: 'translatedText' | 'sourceText';
  matchIndexInField: number;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  segments,
  onUpdateSegments,
  onClose,
  onShowNotification,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [targetScope, setTargetScope] = useState<'translated' | 'source' | 'both'>('translated');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 50);
  }, []);

  // Compute search regex
  const searchRegex = useMemo(() => {
    if (!findText.trim()) return null;
    const escaped = escapeRegExp(findText);
    const flags = caseSensitive ? 'g' : 'gi';
    try {
      if (matchWholeWord) {
        // Unicode boundary for words (both English and Persian)
        return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=[^\\p{L}\\p{N}_]|$)`, `${flags}u`);
      }
      return new RegExp(escaped, flags);
    } catch {
      return null;
    }
  }, [findText, caseSensitive, matchWholeWord]);

  // Find all matches across segments
  const { allMatches, matchingSegmentsCount } = useMemo(() => {
    if (!searchRegex || !findText.trim()) {
      return { allMatches: [], matchingSegmentsCount: 0 };
    }

    const matches: MatchPosition[] = [];
    const matchedSegmentIds = new Set<number>();

    for (const seg of segments) {
      let segMatched = false;

      // Check Persian translated text
      if (targetScope === 'translated' || targetScope === 'both') {
        const text = seg.translatedText || '';
        const regex = new RegExp(searchRegex.source, searchRegex.flags);
        let match;
        let indexInField = 0;
        while ((match = regex.exec(text)) !== null) {
          matches.push({ segmentId: seg.id, field: 'translatedText', matchIndexInField: indexInField++ });
          segMatched = true;
          if (regex.lastIndex === match.index) regex.lastIndex++;
        }
      }

      // Check English source text
      if (targetScope === 'source' || targetScope === 'both') {
        const text = seg.sourceText || '';
        const regex = new RegExp(searchRegex.source, searchRegex.flags);
        let match;
        let indexInField = 0;
        while ((match = regex.exec(text)) !== null) {
          matches.push({ segmentId: seg.id, field: 'sourceText', matchIndexInField: indexInField++ });
          segMatched = true;
          if (regex.lastIndex === match.index) regex.lastIndex++;
        }
      }

      if (segMatched) {
        matchedSegmentIds.add(seg.id);
      }
    }

    return { allMatches: matches, matchingSegmentsCount: matchedSegmentIds.size };
  }, [segments, searchRegex, findText, targetScope]);

  const totalMatches = allMatches.length;

  // Keep currentMatchIndex in valid range
  useEffect(() => {
    if (totalMatches === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= totalMatches) {
      setCurrentMatchIndex(totalMatches - 1);
    }
  }, [totalMatches, currentMatchIndex]);

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  };

  // Replace Single Current Match
  const handleReplaceCurrent = () => {
    if (totalMatches === 0 || !searchRegex || currentMatchIndex >= totalMatches) return;
    const match = allMatches[currentMatchIndex];
    if (!match) return;

    const targetSegment = segments.find((s) => s.id === match.segmentId);
    if (!targetSegment) return;

    const originalText = targetSegment[match.field] || '';
    const regex = new RegExp(searchRegex.source, searchRegex.flags);

    let matchCount = 0;
    let replacedText = '';

    if (matchWholeWord) {
      replacedText = originalText.replace(regex, (m, p1) => {
        if (matchCount === match.matchIndexInField) {
          matchCount++;
          return (p1 || '') + replaceText;
        }
        matchCount++;
        return m;
      });
    } else {
      replacedText = originalText.replace(regex, (m) => {
        if (matchCount === match.matchIndexInField) {
          matchCount++;
          return replaceText;
        }
        matchCount++;
        return m;
      });
    }

    const updated = segments.map((s) =>
      s.id === match.segmentId ? { ...s, [match.field]: replacedText } : s
    );

    onUpdateSegments(updated);
    onShowNotification?.('مورد انتخابی جایگزین شد', 'info');
  };

  // Replace All Matches In Entire Subtitle
  const handleReplaceAll = () => {
    if (totalMatches === 0 || !searchRegex) return;

    let totalReplacedCount = 0;
    let affectedLinesCount = 0;

    const updated = segments.map((seg) => {
      let isLineChanged = false;
      let newTrans = seg.translatedText || '';
      let newSrc = seg.sourceText || '';

      if (targetScope === 'translated' || targetScope === 'both') {
        const regex = new RegExp(searchRegex.source, searchRegex.flags);
        if (matchWholeWord) {
          const replaced = newTrans.replace(regex, (m, p1) => {
            totalReplacedCount++;
            isLineChanged = true;
            return (p1 || '') + replaceText;
          });
          newTrans = replaced;
        } else {
          const replaced = newTrans.replace(regex, () => {
            totalReplacedCount++;
            isLineChanged = true;
            return replaceText;
          });
          newTrans = replaced;
        }
      }

      if (targetScope === 'source' || targetScope === 'both') {
        const regex = new RegExp(searchRegex.source, searchRegex.flags);
        if (matchWholeWord) {
          const replaced = newSrc.replace(regex, (m, p1) => {
            totalReplacedCount++;
            isLineChanged = true;
            return (p1 || '') + replaceText;
          });
          newSrc = replaced;
        } else {
          const replaced = newSrc.replace(regex, () => {
            totalReplacedCount++;
            isLineChanged = true;
            return replaceText;
          });
          newSrc = replaced;
        }
      }

      if (isLineChanged) affectedLinesCount++;

      return {
        ...seg,
        translatedText: newTrans,
        sourceText: newSrc,
      };
    });

    onUpdateSegments(updated);
    onShowNotification?.(
      `تعداد ${totalReplacedCount} مورد با موفقیت در ${affectedLinesCount} سطر جایگزین شد`,
      'success'
    );
  };

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-[#151C28] border border-emerald-500/30 dark:border-emerald-500/40 rounded-xl transition-all shadow-md space-y-3">
      {/* Top Row: Find and Replace Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Find Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="عبارت برای جستجو... / Find text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) handlePrevMatch();
                else handleNextMatch();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            className="w-full text-xs pl-8 pr-28 py-2 bg-white dark:bg-[#1A2234] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#00A878] focus:ring-1 focus:ring-[#00A878] transition-colors"
          />

          {/* Right badge inside find input: match counter and jump arrows */}
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {findText.trim() && (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                {totalMatches > 0
                  ? `${currentMatchIndex + 1}/${totalMatches}`
                  : 'یافت نشد'}
              </span>
            )}
            <button
              type="button"
              onClick={handlePrevMatch}
              disabled={totalMatches === 0}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="مورد قبلی (Shift + Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMatch}
              disabled={totalMatches === 0}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="مورد بعدی (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {findText && (
              <button
                type="button"
                onClick={() => setFindText('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="پاک کردن"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Replace Input */}
        <div className="relative flex items-center">
          <Replace className="w-3.5 h-3.5 text-[#00A878] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="جایگزینی با... / Replace with"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleReplaceCurrent();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            className="w-full text-xs pl-8 pr-8 py-2 bg-white dark:bg-[#1A2234] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#00A878] focus:ring-1 focus:ring-[#00A878] transition-colors"
          />
          {replaceText && (
            <button
              type="button"
              onClick={() => setReplaceText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="پاک کردن"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Scope selection, Options toggles, Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
        {/* Left: Target Scope & Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Scope Pills */}
          <div className="flex items-center bg-white dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-[11px] font-persian">
            <button
              type="button"
              onClick={() => setTargetScope('translated')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                targetScope === 'translated'
                  ? 'bg-[#00A878] text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232D3F]'
              }`}
            >
              ترجمه فارسی
            </button>
            <button
              type="button"
              onClick={() => setTargetScope('source')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                targetScope === 'source'
                  ? 'bg-[#00A878] text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232D3F]'
              }`}
            >
              متن انگلیسی
            </button>
            <button
              type="button"
              onClick={() => setTargetScope('both')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                targetScope === 'both'
                  ? 'bg-[#00A878] text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232D3F]'
              }`}
            >
              هر دو ستون
            </button>
          </div>

          {/* Option: Case Sensitive */}
          <button
            type="button"
            onClick={() => setCaseSensitive((prev) => !prev)}
            className={`p-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer text-[11px] ${
              caseSensitive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'bg-white dark:bg-[#1A2234] border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="حساس به بزرگی و کوچکی حروف (Match Case)"
          >
            <CaseSensitive className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aa</span>
          </button>

          {/* Option: Match Whole Word */}
          <button
            type="button"
            onClick={() => setMatchWholeWord((prev) => !prev)}
            className={`p-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer text-[11px] ${
              matchWholeWord
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'bg-white dark:bg-[#1A2234] border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="فقط کلمه کامل (Whole Word)"
          >
            <WholeWord className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-persian">کلمه کامل</span>
          </button>

          {/* Total summary badge */}
          {totalMatches > 0 && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-persian pr-1">
              ({totalMatches} مورد در {matchingSegmentsCount} خط)
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Replace Current Single Match */}
          <button
            type="button"
            onClick={handleReplaceCurrent}
            disabled={totalMatches === 0 || !findText.trim()}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1A2234] hover:bg-slate-100 dark:hover:bg-[#242F44] border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 font-persian transition-colors cursor-pointer"
            title="جایگزین کردن این مورد انتخاب شده"
          >
            <Replace className="w-3 h-3 text-[#00A878]" />
            <span>جایگزینی تکی</span>
          </button>

          {/* Replace All In Entire Subtitle */}
          <button
            id="replace-all-btn"
            type="button"
            onClick={handleReplaceAll}
            disabled={totalMatches === 0 || !findText.trim()}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#00A878] hover:bg-[#009667] active:bg-[#008259] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 font-persian transition-all shadow-2xs cursor-pointer"
            title="جایگزینی تمام موارد در کل زیرنویس با یک کلیک"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>جایگزینی در کل زیرنویس (Replace All)</span>
          </button>

          {/* Close Bar */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#1E2736] transition-colors cursor-pointer"
            title="بستن پنل جستجو و جایگزینی (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
