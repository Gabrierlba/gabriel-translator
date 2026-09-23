import { SubtitleSegment } from '../types';

/**
 * Parses an SRT string into an array of SubtitleSegment objects.
 * Handles CRLF, LF, extra blank lines, and strip UTF-8 BOM if present.
 */
export function parseSRT(srtContent: string): SubtitleSegment[] {
  // Strip BOM if present
  let cleanContent = srtContent.replace(/^\uFEFF/, '').trim();
  // Normalize newlines to \n
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split by double newlines or lines containing only numbers followed by timing
  const blocks = cleanContent.split(/\n\s*\n+/);
  const segments: SubtitleSegment[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) continue;

    let id = i + 1;
    let timeLineIndex = 0;

    // Check if line 0 is numeric index
    if (/^\d+$/.test(lines[0])) {
      id = parseInt(lines[0], 10);
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const timeParts = timeLine.split('-->').map((s) => s.trim());
    const startTime = timeParts[0] || '00:00:00,000';
    const endTime = timeParts[1]?.split(' ')[0] || '00:00:00,000';

    const textLines = lines.slice(timeLineIndex + 1);
    const fullText = textLines.join('\n');

    segments.push({
      id: segments.length + 1,
      startTime,
      endTime,
      rawTimestamp: `${startTime} --> ${endTime}`,
      sourceText: fullText,
      translatedText: '',
      status: 'untranslated',
    });
  }

  return segments;
}

/**
 * Generates an SRT file content from segments.
 * If persian is true, uses translatedText if available, else sourceText.
 */
export function generateSRT(segments: SubtitleSegment[], persian: boolean = true): string {
  const blocks = (segments || []).map((seg, index) => {
    const text = persian
      ? (seg.translatedText || '').trim() || (seg.sourceText || '')
      : (seg.sourceText || '');

    return `${index + 1}\n${seg.startTime || '00:00:00,000'} --> ${seg.endTime || '00:00:01,000'}\n${text}\n`;
  });

  return blocks.join('\n').trim() + '\n';
}

/**
 * Downloads a string content as an SRT file with UTF-8 BOM so Persian letters never corrupt.
 */
export function downloadSRTFile(content: string, filename: string): void {
  // Prepend UTF-8 BOM (\uFEFF)
  const blob = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
