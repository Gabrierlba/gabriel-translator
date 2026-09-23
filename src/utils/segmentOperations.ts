import { SubtitleSegment } from '../types';
import { timestampToSeconds, secondsToTimestamp } from './timeSync';

export interface SplitSegmentParams {
  segmentId: number;
  splitTimeSeconds: number;
  part1Source: string;
  part2Source: string;
  part1Translated: string;
  part2Translated: string;
}

/**
 * Splits text around a ratio (e.g. 0.5) at the nearest whitespace, comma, or punctuation boundary.
 */
export function splitTextAtNaturalBoundary(
  text: string,
  targetRatio: number = 0.5
): { part1: string; part2: string } {
  const trimmed = text.trim();
  if (!trimmed) return { part1: '', part2: '' };

  const targetIndex = Math.floor(trimmed.length * targetRatio);
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    return { part1: trimmed, part2: '' };
  }

  // Find word boundary closest to targetIndex
  let currentLength = 0;
  let splitWordIndex = 0;
  let minDiff = Infinity;

  for (let i = 0; i < words.length; i++) {
    currentLength += words[i].length + 1;
    const diff = Math.abs(currentLength - targetIndex);
    if (diff < minDiff) {
      minDiff = diff;
      splitWordIndex = i + 1;
    }
  }

  if (splitWordIndex <= 0) splitWordIndex = 1;
  if (splitWordIndex >= words.length) splitWordIndex = words.length - 1;

  const part1 = words.slice(0, splitWordIndex).join(' ');
  const part2 = words.slice(splitWordIndex).join(' ');
  return { part1, part2 };
}

/**
 * Merges a segment with the next segment into a single unified segment
 */
export function mergeSegmentWithNext(
  segments: SubtitleSegment[],
  segmentId: number
): { updatedSegments: SubtitleSegment[]; mergedIndex: number; description: string } | null {
  const index = segments.findIndex((s) => s.id === segmentId);
  if (index === -1 || index >= segments.length - 1) return null;

  const current = segments[index];
  const next = segments[index + 1];

  const mergedSource = `${current.sourceText} ${next.sourceText}`.replace(/\s+/g, ' ').trim();
  const mergedTranslated = current.translatedText.trim() && next.translatedText.trim()
    ? `${current.translatedText} ${next.translatedText}`.replace(/\s+/g, ' ').trim()
    : current.translatedText.trim() || next.translatedText.trim() || '';

  const mergedSegment: SubtitleSegment = {
    id: current.id,
    startTime: current.startTime,
    endTime: next.endTime,
    rawTimestamp: `${current.startTime} --> ${next.endTime}`,
    sourceText: mergedSource,
    translatedText: mergedTranslated,
    status: mergedTranslated ? 'done' : 'untranslated',
    provider: current.provider || next.provider,
  };

  const updatedSegments: SubtitleSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (i === index) {
      updatedSegments.push(mergedSegment);
      i++; // skip next
    } else {
      updatedSegments.push(segments[i]);
    }
  }

  // Renumber IDs sequentially
  const renumbered = updatedSegments.map((s, idx) => ({ ...s, id: idx + 1 }));

  return {
    updatedSegments: renumbered,
    mergedIndex: index,
    description: `سطر ${current.id} و ${next.id} با موفقیت ادغام شدند.`,
  };
}

/**
 * Splits a segment into two segments at a specified time point
 */
export function splitSegmentAtTime(
  segments: SubtitleSegment[],
  params: SplitSegmentParams
): { updatedSegments: SubtitleSegment[]; newSegmentId: number; description: string } | null {
  const index = segments.findIndex((s) => s.id === params.segmentId);
  if (index === -1) return null;

  const original = segments[index];
  const splitTimeStr = secondsToTimestamp(params.splitTimeSeconds);

  const part1: SubtitleSegment = {
    id: original.id,
    startTime: original.startTime,
    endTime: splitTimeStr,
    rawTimestamp: `${original.startTime} --> ${splitTimeStr}`,
    sourceText: params.part1Source.trim(),
    translatedText: params.part1Translated.trim(),
    status: params.part1Translated.trim() ? 'done' : 'untranslated',
    provider: original.provider,
  };

  const part2: SubtitleSegment = {
    id: original.id + 1,
    startTime: splitTimeStr,
    endTime: original.endTime,
    rawTimestamp: `${splitTimeStr} --> ${original.endTime}`,
    sourceText: params.part2Source.trim(),
    translatedText: params.part2Translated.trim(),
    status: params.part2Translated.trim() ? 'done' : 'untranslated',
    provider: original.provider,
  };

  const updatedSegments: SubtitleSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (i === index) {
      updatedSegments.push(part1);
      updatedSegments.push(part2);
    } else {
      updatedSegments.push(segments[i]);
    }
  }

  // Renumber IDs sequentially
  const renumbered = updatedSegments.map((s, idx) => ({ ...s, id: idx + 1 }));

  return {
    updatedSegments: renumbered,
    newSegmentId: index + 2,
    description: `سطر #${original.id} به دو سطر با موفقیت تقسیم شد.`,
  };
}

export function splitSegment(segments: SubtitleSegment[], params: SplitSegmentParams): SubtitleSegment[] {
  const res = splitSegmentAtTime(segments, params);
  return res ? res.updatedSegments : segments;
}

export function mergeSegments(segments: SubtitleSegment[], segmentId: number): SubtitleSegment[] {
  const res = mergeSegmentWithNext(segments, segmentId);
  return res ? res.updatedSegments : segments;
}

