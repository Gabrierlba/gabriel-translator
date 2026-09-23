import { SubtitleSegment } from '../types';

/**
 * Converts "00:01:23,450" or "00:01:23.450" into total seconds (float)
 */
export function timestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseFloat(clean) || 0;
}

/**
 * Converts total seconds (float) back into SRT standard timestamp: "00:01:23,450"
 */
export function secondsToTimestamp(seconds: number): string {
  const safeTotalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(safeTotalMs / 3600000);
  const remMsAfterHours = safeTotalMs % 3600000;
  const minutes = Math.floor(remMsAfterHours / 60000);
  const remMsAfterMin = remMsAfterHours % 60000;
  const sec = Math.floor(remMsAfterMin / 1000);
  const millis = remMsAfterMin % 1000;

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(sec)},${pad(millis, 3)}`;
}

/**
 * Shifts segments forward or backward by deltaSeconds.
 */
export function shiftSegments(
  segments: SubtitleSegment[],
  deltaSeconds: number,
  scope: 'all' | 'from_selected' | 'selected_only' = 'all',
  selectedId?: number | null
): SubtitleSegment[] {
  let targetIndex = -1;
  if (selectedId != null) {
    targetIndex = segments.findIndex((s) => s.id === selectedId);
  }

  return segments.map((seg, idx) => {
    let shouldShift = false;
    if (scope === 'all') {
      shouldShift = true;
    } else if (scope === 'from_selected' && targetIndex !== -1 && idx >= targetIndex) {
      shouldShift = true;
    } else if (scope === 'selected_only' && seg.id === selectedId) {
      shouldShift = true;
    }

    if (!shouldShift) return seg;

    const start = Math.max(0, timestampToSeconds(seg.startTime) + deltaSeconds);
    const end = Math.max(start + 0.1, timestampToSeconds(seg.endTime) + deltaSeconds);
    const newStart = secondsToTimestamp(start);
    const newEnd = secondsToTimestamp(end);

    return {
      ...seg,
      startTime: newStart,
      endTime: newEnd,
      rawTimestamp: `${newStart} --> ${newEnd}`,
    };
  });
}

/**
 * Stretches or shrinks all timestamps by a factor (e.g. framerate drift fix: 23.976 / 25).
 */
export function stretchSegments(
  segments: SubtitleSegment[],
  factor: number
): SubtitleSegment[] {
  if (factor <= 0) return segments;

  return segments.map((seg) => {
    const start = timestampToSeconds(seg.startTime) * factor;
    const end = timestampToSeconds(seg.endTime) * factor;
    const newStart = secondsToTimestamp(start);
    const newEnd = secondsToTimestamp(end);

    return {
      ...seg,
      startTime: newStart,
      endTime: newEnd,
      rawTimestamp: `${newStart} --> ${newEnd}`,
    };
  });
}

/**
 * Aligns a specific segment's start time to a target timestamp in seconds,
 * shifting segments by the exact calculated difference according to scope ('all' | 'from_selected').
 */
export function alignToTimestamp(
  segments: SubtitleSegment[],
  segmentId: number,
  targetTimeSeconds: number,
  scope: 'all' | 'from_selected' | 'selected_only' = 'all'
): SubtitleSegment[] {
  const targetSeg = segments.find((s) => s.id === segmentId);
  if (!targetSeg) return segments;

  const currentStart = timestampToSeconds(targetSeg.startTime);
  const delta = targetTimeSeconds - currentStart;

  return shiftSegments(segments, delta, scope, segmentId);
}
