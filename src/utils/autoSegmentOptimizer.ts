import { SubtitleSegment } from '../types';
import { timestampToSeconds, secondsToTimestamp } from './timeSync';
import { splitTextAtNaturalBoundary, mergeSegmentWithNext, splitSegmentAtTime } from './segmentOperations';

export interface AutoOptimizeConfig {
  maxLineLength: number;
  maxMergeGapSeconds: number;
  maxMergedDurationSeconds: number;
  minSplitChars: number;
}

export const defaultAutoOptimizeConfig: AutoOptimizeConfig = {
  maxLineLength: 75,
  maxMergeGapSeconds: 1.0,
  maxMergedDurationSeconds: 6.5,
  minSplitChars: 80,
};

export type AutoProposal =
  | {
      id: string;
      type: 'merge';
      firstSegmentId: number;
      secondSegmentId: number;
      firstSource: string;
      secondSource: string;
      combinedSource: string;
      gapSeconds: number;
      combinedDuration: number;
      reason: string;
    }
  | {
      id: string;
      type: 'split';
      segmentId: number;
      originalSourceLength: number;
      splitTimestamp: string;
      part1Source: string;
      part2Source: string;
      part1Translated?: string;
      part2Translated?: string;
      reason: string;
    };

export function analyzeSegmentsForAutoOptimization(
  segments: SubtitleSegment[] = [],
  config: AutoOptimizeConfig = defaultAutoOptimizeConfig
): { proposals: AutoProposal[]; mergeCount: number; splitCount: number } {
  const proposals: AutoProposal[] = [];
  let mergeCount = 0;
  let splitCount = 0;

  if (!Array.isArray(segments) || segments.length === 0) {
    return { proposals, mergeCount, splitCount };
  }

  for (let i = 0; i < segments.length; i++) {
    const current = segments[i];
    if (!current) continue;

    const next = segments[i + 1];

    const currentStart = timestampToSeconds(current.startTime || '00:00:00,000');
    const currentEnd = timestampToSeconds(current.endTime || '00:00:01,000');
    const currentDuration = Math.max(0.1, currentEnd - currentStart);
    const currentSource = (current.sourceText || '').trim();

    // Check for Merge with next:
    if (next) {
      const nextStart = timestampToSeconds(next.startTime || '00:00:00,000');
      const nextEnd = timestampToSeconds(next.endTime || '00:00:01,000');
      const gap = nextStart - currentEnd;
      const combinedDuration = nextEnd - currentStart;
      const nextSource = (next.sourceText || '').trim();
      const combinedLength = currentSource.length + nextSource.length;

      const isBrokenSentence = !/[.!?]$/.test(currentSource);
      const isShortLine = currentSource.length < 42 || currentDuration < 1.8;

      if (
        gap >= 0 &&
        gap <= config.maxMergeGapSeconds &&
        combinedDuration <= config.maxMergedDurationSeconds &&
        combinedLength <= config.maxLineLength &&
        (isBrokenSentence || isShortLine)
      ) {
        proposals.push({
          id: `prop-merge-${current.id ?? i}-${next.id ?? (i + 1)}`,
          type: 'merge',
          firstSegmentId: current.id ?? (i + 1),
          secondSegmentId: next.id ?? (i + 2),
          firstSource: currentSource,
          secondSource: nextSource,
          combinedSource: `${currentSource} ${nextSource}`.trim(),
          gapSeconds: gap,
          combinedDuration,
          reason: isBrokenSentence
            ? 'جمله در انتهای خط اول شکسته شده و بدون وقفه در خط بعد ادامه یافته است.'
            : 'مدت سطر اول بسیار کوتاه است و ادغام آن خوانایی بهتری ایجاد می‌کند.',
        });
        mergeCount++;
        // Skip proposing merge for the next item as first to avoid chaining conflicts
        i++;
        continue;
      }
    }

    // Check for Split:
    // If current line is longer than minSplitChars and duration > 3.0 seconds
    if (currentSource.length >= config.minSplitChars && currentDuration >= 3.0) {
      const splitTime = currentStart + currentDuration * 0.5;
      const srcSplit = splitTextAtNaturalBoundary(currentSource, 0.5);

      let part1Trans = '';
      let part2Trans = '';
      const translated = (current.translatedText || '').trim();
      if (translated) {
        const transSplit = splitTextAtNaturalBoundary(translated, 0.5);
        part1Trans = transSplit.part1;
        part2Trans = transSplit.part2;
      }

      proposals.push({
        id: `prop-split-${current.id ?? i}`,
        type: 'split',
        segmentId: current.id ?? (i + 1),
        originalSourceLength: currentSource.length,
        splitTimestamp: secondsToTimestamp(splitTime),
        part1Source: srcSplit.part1,
        part2Source: srcSplit.part2,
        part1Translated: part1Trans,
        part2Translated: part2Trans,
        reason: `طول متن (${currentSource.length} حرف) بالاتر از آستانه مجاز است و برای خوانایی آسان به دو سطر تقسیم می‌گردد.`,
      });
      splitCount++;
    }
  }

  return { proposals, mergeCount, splitCount };
}

export function applyAutoProposals(
  segments: SubtitleSegment[],
  selectedIds: string[],
  proposals: AutoProposal[]
): { updatedSegments: SubtitleSegment[]; description: string } {
  const selectedSet = new Set(selectedIds);
  const toApply = proposals.filter((p) => selectedSet.has(p.id));

  let currentList = [...segments];
  let appliedMerge = 0;
  let appliedSplit = 0;

  // Process proposals sequentially
  for (const prop of toApply) {
    if (prop.type === 'merge') {
      const res = mergeSegmentWithNext(currentList, prop.firstSegmentId);
      if (res) {
        currentList = res.updatedSegments;
        appliedMerge++;
      }
    } else if (prop.type === 'split') {
      const currentSeg = currentList.find((s) => s.id === prop.segmentId);
      if (currentSeg) {
        const start = timestampToSeconds(currentSeg.startTime);
        const end = timestampToSeconds(currentSeg.endTime);
        const splitSec = start + (end - start) * 0.5;

        const res = splitSegmentAtTime(currentList, {
          segmentId: currentSeg.id,
          splitTimeSeconds: splitSec,
          part1Source: prop.part1Source,
          part2Source: prop.part2Source,
          part1Translated: prop.part1Translated || '',
          part2Translated: prop.part2Translated || '',
        });
        if (res) {
          currentList = res.updatedSegments;
          appliedSplit++;
        }
      }
    }
  }

  return {
    updatedSegments: currentList,
    description: `بهینه‌سازی خودکار انجام شد: ${appliedMerge} مورد ادغام و ${appliedSplit} مورد شکستن خطوط.`,
  };
}
