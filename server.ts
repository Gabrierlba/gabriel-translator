import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Track temporary cooldowns for models experiencing rate limits (429) or high demand (503)
const modelCooldowns = new Map<string, number>();

function isModelCoolingDown(modelName: string): boolean {
  const expiry = modelCooldowns.get(modelName);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    modelCooldowns.delete(modelName);
    return false;
  }
  return true;
}

function setModelCooldown(modelName: string, durationMs: number = 60000) {
  modelCooldowns.set(modelName, Date.now() + durationMs);
}

// Fallback translation engine using direct Persian translation + terminology mapping
async function fallbackTranslateToPersian(
  text: string,
  terminology: { english: string; persian: string }[] = []
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  let preprocessed = trimmed;
  const sortedTerms = [...terminology].sort((a, b) => b.english.length - a.english.length);
  const placeholders: { ph: string; persian: string }[] = [];

  sortedTerms.forEach((term, idx) => {
    const escaped = term.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (regex.test(preprocessed)) {
      const ph = `__TERM_${idx}__`;
      preprocessed = preprocessed.replace(regex, ph);
      placeholders.push({ ph, persian: term.persian });
    }
  });

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(preprocessed)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      throw new Error(`Fallback HTTP ${res.status}`);
    }
    const data: any = await res.json();
    let translated = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translated = data[0].map((item: any) => item[0] || '').join('');
    }

    if (!translated || translated.trim() === '') {
      throw new Error('Empty fallback translation');
    }

    // Restore terminology placeholders
    placeholders.forEach(({ ph, persian }) => {
      translated = translated.split(ph).join(persian);
      const regexPh = new RegExp(ph.replace(/_/g, '[\\s_]*'), 'gi');
      translated = translated.replace(regexPh, persian);
    });

    // Enforce terminology replacement on the final text as well
    translated = enforceTerminology(translated, terminology);

    const cleanResult = translated.trim();
    return cleanResult.length > 0 ? cleanResult : null;
  } catch (err) {
    console.log('[Fallback] Translation service notice:', (err as any)?.message || err);
    return null;
  }
}

/**
 * Cleans up unwanted English annotations, parentheses with Latin tickers/acronyms,
 * and converts isolated financial tickers into clean Persian script.
 */
function cleanFarsiSubtitleArtifacts(text: string): string {
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
 * Ensures any lingering English terms or acronyms that exist in the user's terminology database
 * are strictly replaced by their defined Persian equivalents.
 * Also cleans up parentheses like "افویجی (Fair Value Gap)" -> "افویجی" and removes English artifacts.
 */
function enforceTerminology(
  text: string,
  terminology: { english: string; persian: string }[] = []
): string {
  if (!text) return '';
  let result = text;

  // First clean general English artifacts (such as "(NASDAQ)", "(Dow)", "(S&P)")
  result = cleanFarsiSubtitleArtifacts(result);

  if (terminology.length > 0) {
    const sortedTerms = [...terminology].sort((a, b) => b.english.length - a.english.length);

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
  result = cleanFarsiSubtitleArtifacts(result);

  return result.trim();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Translation proxy endpoint with multi-tier fallback
app.post('/api/translate', async (req, res) => {
  try {
    const { segments, tone = 'spoken', context = '', terminology = [], model = 'gemini-3.6-flash' } = req.body;

    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'segments array is required and must not be empty.' });
    }

    const termList = Array.isArray(terminology)
      ? terminology.map((t: { english: string; persian: string }) => `- "${t.english}" => "${t.persian}"`).join('\n')
      : '';

    const segmentsPayload = segments.map((s: { id: number; text: string }) => ({
      id: s.id,
      text: s.text,
    }));

    // If Gemini key is available, try Gemini models with fallbacks
    if (process.env.GEMINI_API_KEY) {
      // Prioritize Gemini 3.8 Flash as the primary model, followed by smooth flash-series fallbacks
      const preferredModels = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
      ];
      const candidateModels = preferredModels.filter((m) => !isModelCoolingDown(m));
      if (candidateModels.length === 0) {
        candidateModels.push('gemini-3.8-flash');
      }

      const toneInstruction =
        tone === 'formal'
          ? 'فارسی رسمی، کتابی و شیوا (مناسب مستند، سخنرانی و متون آکادمیک؛ ساختار گرامری دقیق بدون اصطلاحات کوچه بازاری)'
          : tone === 'minimal'
          ? 'فارسی موجز، مختصر و مینیمال (ویژه سرعت خوانش بالای بیننده در زیرنویس، بدون حشو و کلمات زائد)'
          : 'فارسی محاوره‌ای معیار، صمیمی، طبیعی و بسیار روان (دقیقاً مانند لحن گفتگوی طبیعی مدرسین باسابقه و دیالوگ روزمره، بدون ترجمه کلمه به کلمه)';

      const prompt = `شما یک مترجم، ویراستار و بومی‌ساز (Localizer) ارشد و متخصص زیرنویس به زبان فارسی اصیل، شیوا، شسته و رفته و کاملاً طبیعی هستید.
وظیفه شما ترجمه حرفه‌ای، تمیز، خوش‌خوان و با بالاترین استاندارد کیفی از سطرهای زیرنویس انگلیسی به فارسی است.

اصول بنیادین برای یک ترجمه کاملاً «شسته و رفته، قشنگ و حرفه‌ای»:
۱. بازآفرینی طبیعی و دوری مطلق از ترجمه مکانیکی (Fluent Idiomatic Natural Farsi):
   - هرگز و تحت هیچ شرایطی کلمه به کلمه ترجمه نکنید. جملات باید به گونه‌ای با واژگان شایسته فارسی بیان شوند که بیننده حس کند ویدیو از ابتدا با زبان فارسی تولید شده است.
   - جملات باید صیقل‌خورده، روان و خوش‌آهنگ باشند.
   - ترتیب ارکان جمله فارسی رعایت شود: فعل همواره در انتهای جمله قرار گیرد و ساختارهای مجهول غربی به معلوم روان تبدیل شوند.
   - مثال برای دوری از ترجمه مکانیکی:
     * غلط و ماشینی: "چیزی که شما نیاز دارید انجام دهید این است که به چارت نگاه کنید"
     * شسته و رفته و حرفه‌ای: "کافیه نگاهی به نمودار بندازید" یا "باید روی چارت دقت کنید"

۲. واژه‌نامه تخصصی و اصطلاحات موضوعی (Terminology Adherence):
   - برای مفاهیم آمده در واژه‌نامه تخصصی، دقیقاً و انحصاراً معادل فارسی داده‌شده را درج کنید.
   - به هیچ وجه معادل دیگری خلق نکنید و کلمات تخصصی انگلیسی را به خط لاتین ننویسید.

۳. خط و نگارش خالص فارسی و ممنوعیت مطلق درج انگلیسی در پرانتز (Zero English in Parentheses / Pure Persian):
   - تمام واژه‌ها باید ۱۰۰٪ با رسم‌الخط تمیز فارسی نوشته شوند. حتی یک حرف یا کلمه انگلیسی (A-Z) نباید در متن خروجی باقی بماند.
   - اکیداً و مطلقاً هیچ نام انگلیسی، نماد، تیکر یا مخففی را داخل پرانتز کنار واژه فارسی درج نکنید!
   - نمونه‌های اکیداً ممنوع در بازارهای مالی و معادل تمیز آنها:
     * غلط و ممنوع: "نزدک (NASDAQ)" ➔ کاملاً تمیز و صحیح: "نزدک"
     * غلط و ممنوع: "داو (Dow)" ➔ کاملاً تمیز و صحیح: "داو" یا "داوجونز"
     * غلط و ممنوع: "اسانپی (S&P)" یا "اس‌ان‌پی (S&P 500)" ➔ کاملاً تمیز و صحیح: "اس‌ان‌پی"
     * غلط و ممنوع: "اوردر بلاک (Order Block)" ➔ کاملاً تمیز و صحیح: "اوردر بلاک"
     * غلط و ممنوع: "افویجی (FVG)" یا "افویجی (Fair Value Gap)" ➔ کاملاً تمیز و صحیح: "افویجی"
     * غلط و ممنوع: "شاخص دلار (DXY)" ➔ کاملاً تمیز و صحیح: "شاخص دلار"
     * غلط و ممنوع: "طلا (Gold)" ➔ کاملاً تمیز و صحیح: "طلا"
     * غلط و ممنوع: "بیت کوین (BTC)" ➔ کاملاً تمیز و صحیح: "بیت‌کوین"
   - هرگز انگلیسی را کنار فارسی در پرانتز ننویسید؛ فقط واژه صیقل‌خورده فارسی درج شود.

۴. سبک و لحن درخواستی:
   - لحن: ${toneInstruction}
   - زمینه موضوعی: ${context || 'آموزش‌های تخصصی بازارهای مالی، تحلیل تکنیکال، سبک معاملاتی ICT اسمارت مانی و ترید'}

واژه‌نامه تخصصی الزامی:
${termList || 'اصطلاحات استاندارد بازارهای مالی به زبان فارسی.'}

خروجی باید منحصراً یک JSON معتبر باشد:
{
  "translations": [
    {
      "id": 1,
      "text": "ترجمه شسته، رفته، خوش‌ساخت و دقیق سطر به فارسی"
    }
  ]
}

سطرهای زیرنویس برای ترجمه:
${JSON.stringify(segmentsPayload, null, 2)}`;

      for (const candidateModel of candidateModels) {
        try {
          const ai = getGemini();
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  translations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.INTEGER },
                        text: { type: Type.STRING },
                      },
                      required: ['id', 'text'],
                    },
                  },
                },
                required: ['translations'],
              },
              temperature: 0.3,
            },
          });

          const responseText = (response.text || '').trim();
          let parsed: any = null;
          try {
            parsed = JSON.parse(responseText);
          } catch {
            const arrMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrMatch) {
              try {
                parsed = JSON.parse(arrMatch[0]);
              } catch {}
            }
            if (!parsed) {
              const objMatch = responseText.match(/\{[\s\S]*\}/);
              if (objMatch) {
                try {
                  parsed = JSON.parse(objMatch[0]);
                } catch {}
              }
            }
          }

          const rawList: any[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.translations)
            ? parsed.translations
            : [];

          if (rawList.length > 0) {
            // Verify that every segment gets a non-empty Persian translation
            const translations = await Promise.all(
              segmentsPayload.map(async (s: { id: number; text: string }) => {
                const found = rawList.find((t: any) => t.id === s.id);
                let text = (found?.text || '').trim();

                const isRawEnglishOrEmpty =
                  !text ||
                  text.toLowerCase() === s.text.trim().toLowerCase() ||
                  !/[\u0600-\u06FF]/.test(text);

                if (isRawEnglishOrEmpty) {
                  const fallbackText = await fallbackTranslateToPersian(s.text, terminology);
                  if (fallbackText && fallbackText.trim()) {
                    text = fallbackText;
                  }
                } else {
                  // Run through enforceTerminology to guarantee no English words or FVG/MSS remain
                  text = enforceTerminology(text, terminology);
                }

                // If text is STILL empty or English, try one more direct fallback attempt
                if (!text || !/[\u0600-\u06FF]/.test(text)) {
                  const directFallback = await fallbackTranslateToPersian(s.text, terminology);
                  if (directFallback && directFallback.trim()) {
                    text = directFallback;
                  }
                }

                return {
                  id: s.id,
                  text: text || '',
                  provider: candidateModel,
                };
              })
            );

            return res.json({
              translations,
              provider: candidateModel,
              count: translations.length,
            });
          }
        } catch (modelErr: any) {
          const errMsg = modelErr?.message || String(modelErr);
          if (
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE')
          ) {
            console.log(`[Translate] Model ${candidateModel} quota or high demand (cooling down 60s)`);
            setModelCooldown(candidateModel, 60000);
          } else {
            console.log(`[Translate] Model ${candidateModel} unavailable:`, errMsg.slice(0, 80));
          }
        }
      }
    }

    // If Gemini models are unavailable or quota is exceeded, use the reliable Persian translation engine
    console.log('Using Persian translation engine fallback for', segments.length, 'segments');
    const fallbackResults = await Promise.all(
      segments.map(async (s: { id: number; text: string }) => {
        const persian = await fallbackTranslateToPersian(s.text, terminology);
        return {
          id: s.id,
          text: persian || '',
          provider: 'موتور ترجمه پیشرفته (پشتیبان)',
        };
      })
    );

    return res.json({
      translations: fallbackResults,
      provider: 'موتور ترجمه هوشمند فارسی',
      count: fallbackResults.length,
    });
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(500).json({
      error: err.message || 'Internal translation error',
    });
  }
});

// Vite middleware in development vs static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gabriel Subtitle Translator server running on port ${PORT}`);
  });
}

startServer();
