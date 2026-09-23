import JSZip from 'jszip';
import { SubtitleSegment } from '../types';

/**
 * Downloads string content with UTF-8 BOM prepended so Persian characters never corrupt
 */
export function downloadExportFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  // Prepend UTF-8 BOM (\uFEFF)
  const blob = new Blob(['\uFEFF', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Bundles multiple export files into a single zip archive and triggers download
 */
export async function downloadZipBundle(
  files: { name: string; content: string }[],
  zipFilename: string
): Promise<void> {
  const zip = new JSZip();
  files.forEach((file) => {
    // Add UTF-8 BOM to text files in the zip for Persian character safety
    zip.file(file.name, '\uFEFF' + file.content);
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert SRT time (00:01:23,456) to ASS time (0:01:23.46)
 */
function srtTimeToAssTime(srtTime: string): string {
  const clean = srtTime.trim();
  const match = clean.match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) return clean.replace(',', '.');
  const [_, h, m, s, msStr] = match;
  const hNum = parseInt(h, 10);
  const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
  const cs = Math.floor(ms / 10).toString().padStart(2, '0');
  return `${hNum}:${m}:${s}.${cs}`;
}

/**
 * Convert SRT time (00:01:23,456) to SBV / YouTube time (0:01:23.456)
 */
function srtTimeToSbvTime(srtTime: string): string {
  const clean = srtTime.trim().replace(',', '.');
  if (clean.startsWith('0') && clean.indexOf(':') === 2) {
    return clean.slice(1);
  }
  return clean;
}

/**
 * Convert SRT time (00:01:23,456) to YouTube / YTranscript timestamp:
 * If hours == 0 -> "01:23" (mm:ss)
 * If hours > 0 -> "01:02:03" (hh:mm:ss)
 */
export function srtTimeToYTranscriptTimestamp(srtTime: string): string {
  const clean = srtTime.trim().split(/[,.]/)[0] || '00:00:00';
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const seconds = parts[2];
    if (hours === 0) {
      return `${minutes}:${seconds}`;
    }
    return `${parts[0]}:${minutes}:${seconds}`;
  }
  return clean;
}

/**
 * Generates YTranscript clean format (exact style of YTranscript YouTube transcript extractor):
 * Continuous single line per segment: "<timestamp> <sentence>" separated by blank lines.
 * Example:
 * 00:14 hi Caleb this is a 15-minute time frame on NASDAQ December contract...
 *
 * 00:28 seeing here in this light blue turquoise blue colored rectangle...
 */
export function generateYTranscriptContent(
  segments: SubtitleSegment[],
  mode: 'translated' | 'source' | 'bilingual' = 'translated'
): string {
  return segments
    .map((seg) => {
      const ts = srtTimeToYTranscriptTimestamp(seg.startTime);
      const en = seg.sourceText.replace(/\s+/g, ' ').trim();
      const fa = (seg.translatedText || '').replace(/\s+/g, ' ').trim();

      if (mode === 'bilingual') {
        const persianText = fa || en;
        return `${ts} ${en}\n   [FA] ${persianText}`;
      }

      const text = mode === 'translated' ? (fa || en) : en;
      return `${ts} ${text}`;
    })
    .join('\n\n')
    .trim() + '\n';
}

/**
 * Convert SRT time to readable short timestamp [00:01:23]
 */
function srtTimeToShortTimestamp(srtTime: string): string {
  const parts = srtTime.split(/[,.]/);
  return `[${parts[0] || srtTime}]`;
}

/**
 * Generates standard SubRip (.srt) format
 */
export function generateSRTContent(segments: SubtitleSegment[], persian: boolean = true): string {
  return segments
    .map((seg, idx) => {
      const text = persian
        ? (seg.translatedText?.trim() || seg.sourceText)
        : seg.sourceText;
      return `${idx + 1}\n${seg.startTime} --> ${seg.endTime}\n${text}\n`;
    })
    .join('\n')
    .trim() + '\n';
}

/**
 * Generates WebVTT (.vtt) format with dot separator instead of comma for milliseconds
 */
export function generateWebVTTContent(
  segments: SubtitleSegment[],
  mode: 'translated' | 'source' = 'translated'
): string {
  const header = 'WEBVTT\n\n';
  const cues = segments.map((seg, idx) => {
    const vttStart = seg.startTime.replace(',', '.');
    const vttEnd = seg.endTime.replace(',', '.');
    const text = mode === 'translated'
      ? (seg.translatedText?.trim() || seg.sourceText)
      : seg.sourceText;
    return `${idx + 1}\n${vttStart} --> ${vttEnd}\n${text}\n`;
  });

  return header + cues.join('\n').trim() + '\n';
}

export interface ASSOptions {
  fontName?: string;
  fontSize?: number;
  primaryColor?: string; // e.g. '&H00FFFFFF' (White), '&H0000FFFF' (Yellow), '&H002BF0F8' (Gold)
  outlineColor?: string; // e.g. '&H00000000' (Black)
  outlineWidth?: number;
  shadowDepth?: number;
  mode?: 'translated' | 'source' | 'bilingual';
  bilingualOrder?: 'en_top_fa_bottom' | 'fa_top_en_bottom';
}

/**
 * Generates Advanced SubStation Alpha (.ass) format with custom typography & styling
 */
export function generateASSContent(
  segments: SubtitleSegment[],
  fileName: string = 'subtitles',
  options: ASSOptions = {}
): string {
  const {
    fontName = 'Vazirmatn',
    fontSize = 46,
    primaryColor = '&H0000FFFF', // Yellow BGR (matching standard video subtitles)
    outlineColor = '&H00000000', // Black BGR
    outlineWidth = 2.5,
    shadowDepth = 1.2,
    mode = 'translated',
    bilingualOrder = 'en_top_fa_bottom',
  } = options;

  const header = `[Script Info]
; Script generated by AI Subtitle Studio
Title: ${fileName}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},${shadowDepth},2,30,30,36,1
Style: EnglishSecondary,Arial,${Math.round(fontSize * 0.72)},&H00D0D0D0,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,1.8,1.0,2,30,30,18,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = segments.map((seg) => {
    const start = srtTimeToAssTime(seg.startTime);
    const end = srtTimeToAssTime(seg.endTime);

    let text = '';
    if (mode === 'bilingual') {
      const fa = (seg.translatedText?.trim() || seg.sourceText).replace(/\n/g, '\\N');
      const en = seg.sourceText.trim().replace(/\n/g, ' ');
      // Default: English on top line, Persian on bottom line
      if (bilingualOrder === 'fa_top_en_bottom') {
        text = `${fa}\\N{\\fnArial\\fs${Math.round(fontSize * 0.85)}}${en}`;
      } else {
        text = `{\\fnArial\\fs${Math.round(fontSize * 0.95)}}${en}\\N{\\fn${fontName}\\fs${fontSize}}${fa}`;
      }
    } else if (mode === 'source') {
      text = seg.sourceText.trim().replace(/\n/g, '\\N');
    } else {
      text = (seg.translatedText?.trim() || seg.sourceText).replace(/\n/g, '\\N');
    }

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return header + events.join('\n') + '\n';
}

export interface BilingualOptions {
  order?: 'fa_first' | 'en_first';
  separator?: string;
  includeUntranslatedPlaceholder?: boolean;
}

/**
 * Generates Bilingual dual-subtitles (.srt) with configurable ordering and separator
 * Default order is 'en_first' (English on top, Persian on bottom)
 */
export function generateBilingualSRTContent(
  segments: SubtitleSegment[],
  options: BilingualOptions = {}
): string {
  const { order = 'en_first', separator = '\n', includeUntranslatedPlaceholder = false } = options;

  return segments
    .map((seg, idx) => {
      const fa = seg.translatedText?.trim() || (includeUntranslatedPlaceholder ? '(ترجمه نشده)' : seg.sourceText);
      const en = seg.sourceText.trim();
      const text = order === 'en_first' ? `${en}${separator}${fa}` : `${fa}${separator}${en}`;
      return `${idx + 1}\n${seg.startTime} --> ${seg.endTime}\n${text}\n`;
    })
    .join('\n')
    .trim() + '\n';
}

/**
 * Generates YouTube native SBV format (.sbv)
 */
export function generateSBVContent(
  segments: SubtitleSegment[],
  mode: 'translated' | 'source' = 'translated'
): string {
  return segments
    .map((seg) => {
      const sbvStart = srtTimeToSbvTime(seg.startTime);
      const sbvEnd = srtTimeToSbvTime(seg.endTime);
      const text = mode === 'translated'
        ? (seg.translatedText?.trim() || seg.sourceText)
        : seg.sourceText;
      return `${sbvStart},${sbvEnd}\n${text}\n`;
    })
    .join('\n')
    .trim() + '\n';
}

/**
 * Generates study/lecture transcript with short timestamps [00:01:23] for YouTube description or notes
 */
export function generateTranscriptWithTimestamps(
  segments: SubtitleSegment[],
  mode: 'translated' | 'source' | 'bilingual' = 'translated'
): string {
  return segments
    .map((seg) => {
      const ts = srtTimeToShortTimestamp(seg.startTime);
      if (mode === 'bilingual') {
        const fa = seg.translatedText?.trim() || '(بدون ترجمه)';
        return `${ts} ${fa}\n       [EN] ${seg.sourceText.trim()}`;
      }
      const text = mode === 'translated'
        ? (seg.translatedText?.trim() || seg.sourceText)
        : seg.sourceText;
      return `${ts} ${text.trim()}`;
    })
    .join('\n\n') + '\n';
}

/**
 * Generates clean plain text lecture transcript without numbers and timestamps
 */
export function generatePlainTextContent(
  segments: SubtitleSegment[],
  mode: 'translated' | 'source' = 'translated'
): string {
  return segments
    .map((seg) => {
      const text = mode === 'translated'
        ? (seg.translatedText?.trim() || seg.sourceText)
        : seg.sourceText;
      return text.trim();
    })
    .filter(Boolean)
    .join('\n\n') + '\n';
}

/**
 * Generates clean text notes with timestamps formatted for Obsidian & note-taking apps
 */
export function generateObsidianTextContent(
  segments: SubtitleSegment[],
  fileName: string = 'Transcript'
): string {
  const cleanTitle = fileName.replace(/\.[^.]+$/, '');
  const translatedCount = segments.filter((s) => s.translatedText?.trim()).length;

  let txt = `=================================================================\n`;
  txt += `یادداشت و رونوشت زیرنویس: ${cleanTitle}\n`;
  txt += `تاریخ: ${new Date().toLocaleDateString('fa-IR')} | سطرها: ${segments.length} | ترجمه‌شده: ${translatedCount}\n`;
  txt += `نرم‌افزار: Gabriel Subtitle Translator (Obsidian & Notes Format)\n`;
  txt += `=================================================================\n\n`;

  segments.forEach((seg, idx) => {
    const ts = srtTimeToShortTimestamp(seg.startTime);
    const fa = seg.translatedText?.trim();
    const en = seg.sourceText.trim();

    if (fa) {
      txt += `${ts} ${fa}\n`;
      txt += `   [EN] ${en}\n\n`;
    } else {
      txt += `${ts} ${en}\n\n`;
    }
  });

  return txt.trim() + '\n';
}

/**
 * Generates optimized Obsidian Markdown (.md) note with YAML frontmatter, tags, callouts, and clean layout
 */
export function generateObsidianMarkdownContent(
  segments: SubtitleSegment[],
  fileName: string = 'Transcript'
): string {
  const cleanTitle = fileName.replace(/\.[^.]+$/, '');
  const translatedCount = segments.filter((s) => s.translatedText?.trim()).length;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  // Obsidian YAML Frontmatter
  let md = `---\n`;
  md += `title: "${cleanTitle}"\n`;
  md += `type: subtitle-transcript\n`;
  md += `date: ${dateStr}\n`;
  md += `tags:\n`;
  md += `  - subtitles\n`;
  md += `  - transcript\n`;
  md += `  - obsidian-notes\n`;
  md += `total_lines: ${segments.length}\n`;
  md += `translated_lines: ${translatedCount}\n`;
  md += `---\n\n`;

  // Obsidian Title & Metadata Callout
  md += `# 🎬 ${cleanTitle}\n\n`;
  md += `> [!info] مشخصات زیرنویس و رونوشت آموزشی (Obsidian Note)\n`;
  md += `> - 📅 **تاریخ استخراج:** ${now.toLocaleDateString('fa-IR')} (${dateStr})\n`;
  md += `> - 📊 **تعداد کل سطرها:** ${segments.length} سطر\n`;
  md += `> - ✨ **سطرهای ترجمه‌شده:** ${translatedCount} سطر (${Math.round((translatedCount / (segments.length || 1)) * 100)}%)\n`;
  md += `> - 🔗 **منبع:** تولید شده توسط Gabriel Subtitle Translator\n\n`;

  md += `## 📝 یادداشت‌ها و رونوشت خط به خط\n\n`;

  // Obsidian callouts and timeline blocks
  segments.forEach((seg, idx) => {
    const ts = srtTimeToShortTimestamp(seg.startTime);
    const fullTime = `${seg.startTime} ➔ ${seg.endTime}`;
    const fa = seg.translatedText?.trim();
    const en = seg.sourceText.trim();

    md += `### ⏱️ سطر ${idx + 1} | \`${ts}\` <small>(${fullTime})</small>\n\n`;
    if (fa) {
      md += `**ترجمه فارسی:**\n${fa}\n\n`;
      md += `> [!quote]- متن زبان اصلی (English)\n`;
      md += `> ${en.replace(/\n/g, '\n> ')}\n\n`;
    } else {
      md += `> ${en.replace(/\n/g, '\n> ')}\n\n`;
    }
    md += `---\n\n`;
  });

  return md.trim() + '\n';
}

/**
 * Generates formatted Markdown (.md) document with summary and conversation blocks
 */
export function generateMarkdownContent(
  segments: SubtitleSegment[],
  fileName: string = 'Transcript'
): string {
  const title = fileName.replace(/\.[^.]+$/, '');
  const translatedCount = segments.filter((s) => s.translatedText?.trim()).length;

  let md = `# ${title} - رونوشت و زیرنویس\n\n`;
  md += `> **تاریخ استخراج:** ${new Date().toLocaleDateString('fa-IR')} | **تعداد سطرها:** ${segments.length} | **ترجمه‌شده:** ${translatedCount}\n\n`;
  md += `---\n\n`;
  md += `| # | زمان شروع | زمان پایان | متن اصلی (انگلیسی) | ترجمه فارسی |\n`;
  md += `|---|---|---|---|---|\n`;

  segments.forEach((seg, idx) => {
    const en = seg.sourceText.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    const fa = (seg.translatedText || '').replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    md += `| ${idx + 1} | \`${seg.startTime}\` | \`${seg.endTime}\` | ${en} | ${fa} |\n`;
  });

  return md + '\n';
}

/**
 * Generates CSV format with columns: Line, StartTime, EndTime, English, Persian
 */
export function generateCSVContent(segments: SubtitleSegment[]): string {
  const header = 'Line,StartTime,EndTime,English,Persian';
  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;

  const rows = segments.map((seg, idx) => {
    return [
      idx + 1,
      seg.startTime,
      seg.endTime,
      escapeCsv(seg.sourceText),
      escapeCsv(seg.translatedText || ''),
    ].join(',');
  });

  return [header, ...rows].join('\n') + '\n';
}

/**
 * Generates TSV (Tab Separated Values) format for direct copy-paste into Excel/Google Sheets
 */
export function generateTSVContent(segments: SubtitleSegment[]): string {
  const header = ['Line', 'StartTime', 'EndTime', 'English', 'Persian'].join('\t');
  const rows = segments.map((seg, idx) => {
    const cleanEn = seg.sourceText.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanFa = (seg.translatedText || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    return [idx + 1, seg.startTime, seg.endTime, cleanEn, cleanFa].join('\t');
  });

  return [header, ...rows].join('\n') + '\n';
}

/**
 * Generates structured JSON format
 */
export function generateJSONContent(segments: SubtitleSegment[], fileName?: string): string {
  const data = {
    fileName: fileName || 'subtitles.srt',
    exportDate: new Date().toISOString(),
    totalSegments: segments.length,
    translatedSegments: segments.filter((s) => s.translatedText?.trim()).length,
    segments: segments.map((seg, idx) => ({
      index: idx + 1,
      startTime: seg.startTime,
      endTime: seg.endTime,
      sourceText: seg.sourceText,
      translatedText: seg.translatedText || '',
      status: seg.status || 'untranslated',
      provider: seg.provider,
    })),
  };

  return JSON.stringify(data, null, 2);
}

