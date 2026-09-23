export type TranslationTone = 'spoken' | 'formal' | 'minimal';

export interface SubtitleSegment {
  id: number;
  startTime: string; // "00:01:23,450"
  endTime: string;   // "00:01:26,800"
  rawTimestamp: string;
  sourceText: string;
  translatedText: string;
  status?: 'done' | 'active' | 'error' | 'untranslated' | 'pending' | 'translating';
  provider?: string;
}

export interface TerminologyItem {
  id: string;
  english: string;
  persian: string;
  category?: string;
}

export interface TerminologyProfile {
  id: string;
  name: string;
  persianName: string;
  items: TerminologyItem[];
}

export interface TranslationMemoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  context: string;
  terminologyProfile?: string;
  usageCount: number;
  lastUsed: string;
}

export interface TranslationStats {
  total: number;
  done: number;
  active: number;
  error: number;
}

export interface AIProviderStatus {
  gemini: 'active' | 'ready' | 'error';
  chatgpt: 'active' | 'ready' | 'error';
  claude: 'active' | 'ready' | 'error';
  grok: 'active' | 'ready' | 'error';
}

export interface TranslationRequestOptions {
  tone: TranslationTone;
  context: string;
  terminology: TerminologyItem[];
  model?: string;
  translationMemoryEnabled?: boolean;
}
