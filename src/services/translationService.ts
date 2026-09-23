import {
  SubtitleSegment,
  TranslationMemoryItem,
  TranslationRequestOptions,
  TerminologyItem,
} from '../types';
import { safeStorage } from '../utils/storage';

export class TranslationService {
  /**
   * Translates a single segment using the server API or smart fallback.
   */
  public static async translateSingle(
    segment: SubtitleSegment,
    options: TranslationRequestOptions,
    memory: TranslationMemoryItem[] = []
  ): Promise<{ text: string; provider: string }> {
    // 1. Check translation memory if enabled
    if (options.translationMemoryEnabled && memory.length > 0) {
      const match = this.lookupMemory(segment.sourceText, memory);
      if (match) {
        return {
          text: match.translatedText,
          provider: 'Memory Cache',
        };
      }
    }

    // 2. Attempt server API call
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segments: [
            {
              id: segment.id,
              text: segment.sourceText,
            },
          ],
          tone: options.tone,
          context: options.context,
          terminology: options.terminology,
          model: options.model,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.translations) && data.translations.length > 0) {
          const item = data.translations[0];
          const cleanText = this.enforceTerminology(item.text, options.terminology);
          return {
            text: cleanText,
            provider: item.provider || data.provider || 'Gemini 3.8 Flash',
          };
        }
      }
    } catch (err) {
      console.warn('Server API call failed, falling back to local engine:', err);
    }

    // 3. Fallback translator using direct client-side translation
    const localText = await this.clientFallbackTranslate(segment.sourceText, options);
    if (localText) {
      return {
        text: localText,
        provider: 'موتور ترجمه هوشمند فارسی',
      };
    }

    throw new Error('ترجمه با خطا مواجه شد. هیچ متنی ترجمه نشد.');
  }

  /**
   * Translates a batch of segments together for high throughput and context awareness.
   */
  public static async translateBatch(
    batch: SubtitleSegment[],
    options: TranslationRequestOptions,
    memory: TranslationMemoryItem[] = []
  ): Promise<{
    translations: Map<number, { text: string; provider: string }>;
    newMemoryEntries: TranslationMemoryItem[];
    errors: number[];
  }> {
    const translations = new Map<number, { text: string; provider: string }>();
    const newMemoryEntries: TranslationMemoryItem[] = [];
    const errors: number[] = [];

    const needed: SubtitleSegment[] = [];

    // 1. Check memory for each segment in the batch
    for (const seg of batch) {
      if (options.translationMemoryEnabled && memory.length > 0) {
        const match = this.lookupMemory(seg.sourceText, memory);
        if (match) {
          translations.set(seg.id, {
            text: match.translatedText,
            provider: 'Memory Cache',
          });
          continue;
        }
      }
      needed.push(seg);
    }

    if (needed.length === 0) {
      return { translations, newMemoryEntries, errors };
    }

    // 2. Call backend server API
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segments: needed.map((s) => ({
            id: s.id,
            text: s.sourceText,
          })),
          tone: options.tone,
          context: options.context,
          terminology: options.terminology,
          model: options.model,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const serverTranslations = data.translations || [];

        for (const item of serverTranslations) {
          if (item && item.id != null) {
            const rawItemText = (item.text || '').trim();
            if (rawItemText.length > 0) {
              const providerName = item.provider || data.provider || 'Gemini';
              const cleanText = this.enforceTerminology(rawItemText, options.terminology);
              if (cleanText.trim().length > 0) {
                translations.set(item.id, {
                  text: cleanText,
                  provider: providerName,
                });

                // Add to translation memory if informative sentence
                const originalSeg = needed.find((s) => s.id === item.id);
                if (originalSeg && originalSeg.sourceText.length > 20) {
                  newMemoryEntries.push({
                    id: `tm-${Date.now()}-${item.id}`,
                    sourceText: originalSeg.sourceText,
                    translatedText: cleanText,
                    context: options.context || 'General',
                    terminologyProfile: 'Auto',
                    usageCount: 1,
                    lastUsed: 'Just now',
                  });
                }
              }
            }
          }
        }

        // Check if any in this batch failed or came back empty from server
        for (const seg of needed) {
          const currentTranslation = translations.get(seg.id);
          if (!currentTranslation || !currentTranslation.text || !currentTranslation.text.trim()) {
            const fallbackText = await this.clientFallbackTranslate(seg.sourceText, options);
            if (fallbackText && fallbackText.trim()) {
              translations.set(seg.id, {
                text: fallbackText.trim(),
                provider: 'موتور ترجمه هوشمند فارسی',
              });
            } else {
              translations.delete(seg.id);
              errors.push(seg.id);
            }
          }
        }

        return { translations, newMemoryEntries, errors };
      }
    } catch (err) {
      console.warn('Batch API call error, applying client fallback translator:', err);
    }

    // 3. Fallback for all needed items
    for (const seg of needed) {
      try {
        const fallbackText = await this.clientFallbackTranslate(seg.sourceText, options);
        if (fallbackText) {
          translations.set(seg.id, {
            text: fallbackText,
            provider: 'موتور ترجمه هوشمند فارسی',
          });
        } else {
          errors.push(seg.id);
        }
      } catch {
        errors.push(seg.id);
      }
    }

    return { translations, newMemoryEntries, errors };
  }

  /**
   * Checks for an exact or fuzzy normalized match in the translation memory
   */
  private static lookupMemory(
    sourceText: string,
    memory: TranslationMemoryItem[]
  ): TranslationMemoryItem | null {
    const norm = this.normalize(sourceText);
    for (const item of memory) {
      if (this.normalize(item.sourceText) === norm) {
        return item;
      }
    }
    return null;
  }

  private static normalize(str: string): string {
    return str.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
  }

  /**
   * Direct fallback translation that accurately translates English to Persian and applies custom terminology.
   * Under NO circumstances will it return raw English text.
   */
  private static async clientFallbackTranslate(
    sourceText: string,
    options: TranslationRequestOptions
  ): Promise<string> {
    const text = sourceText.trim();
    if (!text) return '';

    // Sort terminology by length descending so multi-word terms replace first
    const sortedTerms = [...options.terminology].sort(
      (a, b) => b.english.length - a.english.length
    );

    // Replace known terminology items with placeholders
    const replacements: { placeholder: string; persian: string }[] = [];
    let tempText = text;

    sortedTerms.forEach((term, index) => {
      const escaped = term.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      if (regex.test(tempText)) {
        const placeholder = `__TERM_${index}__`;
        tempText = tempText.replace(regex, placeholder);
        replacements.push({ placeholder, persian: term.persian });
      }
    });

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(tempText)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let translated = '';
      if (Array.isArray(data) && Array.isArray(data[0])) {
        translated = data[0].map((item: any) => item[0] || '').join('');
      }

      if (!translated || !translated.trim()) {
        throw new Error('Empty translated response');
      }

      // Restore terminology placeholders
      replacements.forEach(({ placeholder, persian }) => {
        translated = translated.split(placeholder).join(persian);
        const regexPh = new RegExp(placeholder.replace(/_/g, '[\\s_]*'), 'gi');
        translated = translated.replace(regexPh, persian);
      });

      // Post-process to ensure all terminology items are replaced and no English remains
      translated = this.enforceTerminology(translated, options.terminology);

      return translated.trim();
    } catch (err) {
      console.warn('Client fallback translation failed:', err);
      // NEVER output raw English text into the Persian field!
      return '';
    }
  }

  /**
   * Cleans up unwanted English annotations, parentheses with Latin tickers/acronyms,
   * and converts isolated financial tickers into clean Persian script.
   */
  public static cleanFarsiSubtitleArtifacts(text: string): string {
    if (!text) return '';
    let cleaned = text;

    // 1. Remove all parentheses and brackets containing only English/Latin characters, numbers, and symbols
    // e.g. "نزدک (NASDAQ)" -> "نزدک", "داو (Dow)" -> "داو", "اسانپی (S&P)" -> "اسانپی"
    cleaned = cleaned.replace(/\s*\([A-Za-z0-9\s.,&_\-/'"\\$%#@!?:;]+\)/g, '');
    cleaned = cleaned.replace(/\s*\[[A-Za-z0-9\s.,&_\-/'"\\$%#@!?:;]+\]/g, '');

    // 2. Also remove parentheses that include common Persian marker words with English tickers
    // e.g. "(نماد NASDAQ)" or "(شاخص S&P)" or "(ارز BTC)"
    cleaned = cleaned.replace(/\s*\((?:نماد|شاخص|ارز|سهم|معادل|تیکر)?\s*[A-Za-z0-9\s.,&_\-/'"\\$%#@!?:;]+\)/g, '');

    // 3. Translate common financial indices, tickers, and ICT terms that models might leave in Latin
    const commonFinancialTickers: [RegExp, string][] = [
      [/\bNASDAQ\s*100\b/gi, 'نزدک ۱۰۰'],
      [/\bNASDAQ\b/gi, 'نزدک'],
      [/\bDow\s*Jones\b/gi, 'داوجونز'],
      [/\bDow\b/gi, 'داو'],
      [/\bS&P\s*500\b/gi, 'اس‌ان‌پی ۵۰۰'],
      [/\bS&P\b/gi, 'اس‌ان‌پی'],
      [/\bSPX\b/gi, 'اس‌پی‌ایکس'],
      [/\bNDX\b/gi, 'نزدک ۱۰۰'],
      [/\bNAS100\b/gi, 'نزدک ۱۰۰'],
      [/\bUS30\b/gi, 'یو‌اس ۳۰'],
      [/\bDXY\b/gi, 'شاخص دلار'],
      [/\bDollar\s*Index\b/gi, 'شاخص دلار'],
      [/\bNQ\b/gi, 'ان‌کیو'],
      [/\bES\b/gi, 'ای‌اس'],
      [/\bYM\b/gi, 'وای‌ام'],
      [/\bBTC\b/gi, 'بیت‌کوین'],
      [/\bETH\b/gi, 'اتریوم'],
      [/\bUSDT\b/gi, 'تتر'],
      [/\bGold\b/gi, 'طلا'],
      [/\bOil\b/gi, 'نفت'],
      [/\bFVG\b/gi, 'افویجی'],
      [/\bMSS\b/gi, 'ام اس اس'],
      [/\bBOS\b/gi, 'بی او اس'],
      [/\bOB\b/gi, 'اوردر بلاک'],
      [/\bOrder\s*Block\b/gi, 'اوردر بلاک'],
      [/\bFair\s*Value\s*Gap\b/gi, 'افویجی'],
      [/\bMarket\s*Structure\s*Shift\b/gi, 'مارکت استراکچر شیفت'],
      [/\bBreak\s*of\s*Structure\b/gi, 'شکست ساختار'],
      [/\bLiquidity\b/gi, 'نقدینگی'],
      [/\bPremium\b/gi, 'پرمیوم'],
      [/\bDiscount\b/gi, 'دیسکانت'],
    ];

    for (const [regex, fa] of commonFinancialTickers) {
      cleaned = cleaned.replace(regex, fa);
    }

    // 4. Normalize spacing around punctuation and Persian commas
    cleaned = cleaned
      .replace(/\s+([،؛.؟!])/g, '$1')
      .replace(/([،؛.؟!])\s*/g, '$1 ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Enforces that words present in the terminology database are strictly translated to Persian,
   * removing lingering parenthetical English terms like "(FVG)", "(NASDAQ)" or "(Fair Value Gap)".
   */
  public static enforceTerminology(
    text: string,
    terminology: TerminologyItem[] = []
  ): string {
    if (!text) return '';
    let result = text;

    // First clean general English artifacts (such as "(NASDAQ)", "(Dow)", "(S&P)")
    result = this.cleanFarsiSubtitleArtifacts(result);

    if (terminology.length > 0) {
      const sortedTerms = [...terminology].sort(
        (a, b) => b.english.length - a.english.length
      );

      for (const term of sortedTerms) {
        if (!term.english || !term.persian) continue;
        const escaped = term.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 1. Match occurrences inside parentheses like "(FVG)", "(Fair Value Gap)", etc.
        const parenRegex = new RegExp(`\\s*\\([\\s]*${escaped}[\\s]*\\)`, 'gi');
        result = result.replace(parenRegex, '');

        // 2. Match standalone occurrences
        const wordRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
        result = result.replace(wordRegex, term.persian);
      }
    }

    // Run final artifact cleaner
    result = this.cleanFarsiSubtitleArtifacts(result);

    return result.trim();
  }
}

export async function translateSegments(params: {
  segments: SubtitleSegment[];
  tone: any;
  videoContext: string;
  profile: any;
  memoryEnabled: boolean;
  aiModel?: string;
}): Promise<SubtitleSegment[]> {
  const memory = getTranslationMemory();
  const options: TranslationRequestOptions = {
    tone: params.tone,
    context: params.videoContext,
    terminology: params.profile?.items || [],
    model: params.aiModel,
    translationMemoryEnabled: params.memoryEnabled,
  };

  const result = await TranslationService.translateBatch(params.segments, options, memory);

  return params.segments.map((seg) => {
    const res = result.translations.get(seg.id);
    if (res && res.text && res.text.trim().length > 0) {
      return {
        ...seg,
        translatedText: res.text.trim(),
        status: 'done',
        provider: res.provider,
      };
    }
    return {
      ...seg,
      status: 'error',
    };
  });
}

export function getTranslationMemory(): TranslationMemoryItem[] {
  try {
    const saved = safeStorage.getItem('gabriel_tm_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

