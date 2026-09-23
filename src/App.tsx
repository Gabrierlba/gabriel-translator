import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Download,
  Upload,
  Sparkles,
  Sliders,
  Search,
  Clock,
  RotateCcw,
  RotateCw,
  FileText,
  FileDown,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Menu,
  ChevronRight,
  Layers,
  Save,
  BookOpen
} from 'lucide-react';
import {
  SubtitleSegment,
  TranslationTone,
  TerminologyProfile,
  TerminologyItem,
  TranslationStats,
  AIProviderStatus
} from './types';
import { DEFAULT_TERMINOLOGY_PROFILES } from './data/defaultTerminology';
import { DEFAULT_SUBTITLES, DEFAULT_FILENAME, generateDefaultSubtitles } from './data/defaultSubtitles';
import { parseSRT, generateSRT, downloadSRTFile } from './utils/srtParser';
import { timestampToSeconds, secondsToTimestamp } from './utils/timeSync';
import { translateSegments, getTranslationMemory, TranslationService } from './services/translationService';
import { safeStorage } from './utils/storage';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { SubtitleTable } from './components/SubtitleTable';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { NewStyleModal } from './components/NewStyleModal';
import { TerminologyDatabaseModal } from './components/TerminologyDatabaseModal';
import { SubtitleSyncModal } from './components/SubtitleSyncModal';
import { FindReplaceBar } from './components/FindReplaceBar';
import {
  initializeCloudProfiles,
  subscribeToCloudProfiles,
  saveProfileToCloud,
  saveAllProfilesToCloud,
} from './services/terminologyCloudService';

// Local storage keys
const STORAGE_KEY_SEGMENTS = 'gabriel_subtitles_v1';
const STORAGE_KEY_PROFILES = 'gabriel_profiles_v1';
const STORAGE_KEY_DELETED_TERMS = 'gabriel_deleted_terms_v1';
const STORAGE_KEY_FILE_NAME = 'gabriel_filename_v1';
const STORAGE_KEY_SETTINGS = 'gabriel_settings_v1';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        safeStorage.setItem('pst_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        safeStorage.setItem('pst_theme', 'light');
      }
      return next;
    });
  };

  // Subtitle Data & File Name - Defaults to empty until user selects/uploads an SRT file
  const [fileName, setFileName] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY_FILE_NAME);
      if (saved && saved !== 'ICT_Mentorship_Ep01_MarketStructure.srt') {
        return saved;
      }
      return '';
    } catch {
      return '';
    }
  });

  const [segments, setSegments] = useState<SubtitleSegment[]>(() => {
    try {
      const savedFileName = safeStorage.getItem(STORAGE_KEY_FILE_NAME);
      if (!savedFileName || savedFileName === 'ICT_Mentorship_Ep01_MarketStructure.srt') {
        try {
          safeStorage.removeItem(STORAGE_KEY_SEGMENTS);
          safeStorage.removeItem(STORAGE_KEY_FILE_NAME);
        } catch {}
        return [];
      }
      const saved = safeStorage.getItem(STORAGE_KEY_SEGMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(Boolean).map((s, idx) => ({
            id: s.id ?? idx + 1,
            startTime: s.startTime || '00:00:00,000',
            endTime: s.endTime || '00:00:01,000',
            rawTimestamp: s.rawTimestamp || `${s.startTime || '00:00:00,000'} --> ${s.endTime || '00:00:01,000'}`,
            sourceText: s.sourceText || '',
            translatedText: s.translatedText || '',
            status: s.status || (s.translatedText?.trim() ? 'done' : 'pending'),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load saved segments:', e);
    }
    return [];
  });

  // Undo / Redo History for segments
  const [history, setHistory] = useState<SubtitleSegment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pushToHistory = useCallback((newSegments: SubtitleSegment[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newSegments];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Terminology Profiles
  const [profiles, setProfiles] = useState<TerminologyProfile[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY_PROFILES);
      if (saved) {
        const parsed: TerminologyProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly load the user's saved profiles as they left them,
          // but clean any legacy English parentheses like "افویجی (Fair Value Gap)" -> "افویجی"
          return parsed.map((prof) => ({
            ...prof,
            items: prof.items.map((item) => ({
              ...item,
              persian: item.persian
                .replace(/\s*\([A-Za-z\s]+\)\s*/g, '')
                .trim(),
            })),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load profiles:', e);
    }
    return DEFAULT_TERMINOLOGY_PROFILES;
  });

  // Storage key for user batch size preference
  const STORAGE_KEY_BATCH_SIZE = 'gabriel_batch_size_v1';

  // Settings State
  const [selectedProfileId, setSelectedProfileId] = useState<string>('ict');
  const [tone, setTone] = useState<TranslationTone>('spoken');
  const [videoContext, setVideoContext] = useState<string>('ICT Smart Money Concepts Trading Mentorship');
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const [aiModel, setAiModel] = useState<string>('moe');
  const [batchSize, setBatchSize] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY_BATCH_SIZE);
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch {}
    return 10; // Default priority: 10 lines (Ultra-fast preview & quick test)
  });

  // Selection & Active Item
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(1);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNewStyleOpen, setIsNewStyleOpen] = useState(false);
  const [isTerminologyOpen, setIsTerminologyOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [highlightSearch, setHighlightSearch] = useState('');

  // Status notifications & toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Provider statuses
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus>({
    gemini: 'active',
    chatgpt: 'idle',
    claude: 'idle',
    grok: 'idle',
  });

  // Check Gemini connectivity to server
  const [geminiConnected, setGeminiConnected] = useState(false);
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setGeminiConnected(true);
        }
      })
      .catch(() => {
        setGeminiConnected(false);
      });
  }, []);

  // Save segments to storage
  useEffect(() => {
    try {
      if (segments.length > 0 && fileName) {
        safeStorage.setItem(STORAGE_KEY_SEGMENTS, JSON.stringify(segments));
        safeStorage.setItem(STORAGE_KEY_FILE_NAME, fileName);
      } else {
        safeStorage.removeItem(STORAGE_KEY_SEGMENTS);
        safeStorage.removeItem(STORAGE_KEY_FILE_NAME);
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [segments, fileName]);

  // Save profiles to storage
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [profiles]);

  // Cloud database synchronization for Terminology Profiles (Firestore)
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'syncing' | 'synced' | 'offline'>('syncing');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Load any blacklisted deleted terms so cloud can be cleansed permanently
    let deletedBlacklist: string[] = [];
    try {
      const savedDeletedRaw = safeStorage.getItem(STORAGE_KEY_DELETED_TERMS);
      if (savedDeletedRaw) {
        deletedBlacklist = JSON.parse(savedDeletedRaw);
      }
    } catch {}

    initializeCloudProfiles(profiles, deletedBlacklist)
      .then((cloudProfiles) => {
        if (cloudProfiles && cloudProfiles.length > 0) {
          setProfiles(cloudProfiles);
          try {
            safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(cloudProfiles));
          } catch {}
        }
        setCloudSyncStatus('synced');

        // Subscribe to real-time updates from cloud
        unsubscribe = subscribeToCloudProfiles((updatedProfiles) => {
          if (updatedProfiles && updatedProfiles.length > 0) {
            setProfiles(updatedProfiles);
            try {
              safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updatedProfiles));
            } catch {}
          }
          setCloudSyncStatus('synced');
        });
      })
      .catch((err) => {
        console.warn('Firestore cloud sync init:', err);
        setCloudSyncStatus('offline');
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Keyboard shortcut listener (Ctrl+H for Find & Replace, Ctrl+Z for Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+H or Cmd+H for Find & Replace
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsFindReplaceOpen((prev) => !prev);
      }
      // Ctrl+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (historyIndex > 0) {
          e.preventDefault();
          const prev = history[historyIndex - 1];
          setHistoryIndex(historyIndex - 1);
          setSegments(prev);
          showNotification('عملیات قبلی لغو شد (Undo)', 'info');
        }
      }
      // Ctrl+Y or Ctrl+Shift+Z for Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')
      ) {
        if (historyIndex < history.length - 1 && history.length > 0) {
          e.preventDefault();
          const next = history[historyIndex + 1];
          setHistoryIndex(historyIndex + 1);
          setSegments(next);
          showNotification('عملیات مجدداً اعمال شد (Redo)', 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  // Active terminology profile
  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.id === selectedProfileId) || profiles[0] || DEFAULT_TERMINOLOGY_PROFILES[0];
  }, [profiles, selectedProfileId]);

  // Statistics calculation
  const stats: TranslationStats = useMemo(() => {
    const total = segments.length;
    let done = 0;
    let active = 0;
    let error = 0;

    for (const seg of segments) {
      if (!seg) continue;
      if (seg.status === 'done' || (seg.translatedText && seg.translatedText.trim())) done++;
      if (seg.status === 'translating') active++;
      if (seg.status === 'error') error++;
    }

    return { total, done, active, error };
  }, [segments]);

  // Update a single segment
  const handleUpdateSegment = (id: number, updates: Partial<SubtitleSegment>) => {
    setSegments((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      return next;
    });
  };

  // Add a new empty segment at end
  const handleAddNewSegmentAtEnd = () => {
    const lastSeg = segments[segments.length - 1];
    let startTime = '00:00:00,000';
    let endTime = '00:00:03,000';

    if (lastSeg) {
      startTime = lastSeg.endTime;
      endTime = lastSeg.endTime; // Can be adjusted by user
    }

    const newSeg: SubtitleSegment = {
      id: segments.length + 1,
      startTime,
      endTime,
      rawTimestamp: `${startTime} --> ${endTime}`,
      sourceText: '',
      translatedText: '',
      status: 'pending',
    };

    const next = [...segments, newSeg];
    pushToHistory(next);
    setSegments(next);
    setSelectedSegmentId(newSeg.id);
    showNotification(`سطر شماره ${newSeg.id} اضافه شد`, 'success');
  };

  // Delete segment
  const handleDeleteSegment = (id: number) => {
    const next = segments
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, id: idx + 1 }));
    pushToHistory(next);
    setSegments(next);
    if (selectedSegmentId === id) {
      setSelectedSegmentId(next[0]?.id || null);
    }
    showNotification(`سطر شماره ${id} حذف شد`, 'info');
  };

  // File Upload (.srt)
  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseSRT(content);
        if (parsed.length > 0) {
          pushToHistory(parsed);
          setSegments(parsed);
          setFileName(file.name);
          setSelectedSegmentId(parsed[0].id);
          showNotification(`فایل "${file.name}" با ${parsed.length} سطر با موفقیت بارگذاری شد`, 'success');
        } else {
          showNotification('فایل انتخاب شده معتبر نیست یا سطری در آن یافت نشد.', 'error');
        }
      } catch (err) {
        showNotification('خطا در پردازش فایل SRT.', 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Load Sample SRT File for Testing
  const handleLoadSample = () => {
    const sample = generateDefaultSubtitles();
    pushToHistory(sample);
    setSegments(sample);
    setFileName(DEFAULT_FILENAME);
    setSelectedSegmentId(sample[0]?.id || null);
    try {
      safeStorage.setItem(STORAGE_KEY_SEGMENTS, JSON.stringify(sample));
      safeStorage.setItem(STORAGE_KEY_FILE_NAME, DEFAULT_FILENAME);
    } catch {}
    showNotification(`فایل نمونه "${DEFAULT_FILENAME}" بارگذاری شد`, 'success');
  };

  // Translate Single Line
  const handleTranslateSingle = async (id: number) => {
    // If entire batch is running, alert the user
    if (isTranslating) {
      showNotification('فرآیند ترجمه خودکار سراسری در حال اجراست؛ لطفاً تا پایان آن صبر کنید یا آن را متوقف نمایید.', 'info');
      return;
    }

    const targetSeg = segments.find((s) => s.id === id);
    if (!targetSeg || !targetSeg.sourceText.trim()) {
      showNotification(`سطر #${id} فاقد متن انگلیسی است!`, 'info');
      return;
    }

    // Mark as translating immediately
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'translating' } : s))
    );

    try {
      // Use TranslationService.translateSingle directly for dedicated single-segment translation
      const result = await TranslationService.translateSingle(
        targetSeg,
        {
          tone,
          context: videoContext,
          terminology: currentProfile?.items || [],
          model: aiModel,
          translationMemoryEnabled: memoryEnabled,
        },
        getTranslationMemory()
      );

      if (result && result.text && result.text.trim()) {
        const cleanText = result.text.trim();
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  translatedText: cleanText,
                  status: 'done',
                  provider: result.provider,
                }
              : s
          )
        );
        showNotification(`سطر #${id} با موفقیت ترجمه شد.`, 'success');
      } else {
        throw new Error('متن ترجمه‌شده خالی دریافت شد.');
      }
    } catch (e: any) {
      console.error(`Error translating single line #${id}:`, e);
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'error' } : s))
      );
      showNotification(`خطا در ترجمه سطر #${id}: ${e?.message || 'پاسخی از سرور دریافت نشد'}`, 'error');
    }
  };

  // Batch Translation Loop
  const handleStartTranslation = async () => {
    if (isTranslating) return;

    // Filter segments that need translation
    const pendingSegments = segments.filter(
      (s) => !s.translatedText.trim() || s.status === 'error'
    );

    if (pendingSegments.length === 0) {
      showNotification('تمام خطوط زیرنویس ترجمه شده‌اند.', 'info');
      return;
    }

    setIsTranslating(true);
    isCancelledRef.current = false;
    showNotification(`شروع ترجمه هوشمند ${pendingSegments.length} سطر با مدل ${aiModel}...`, 'info');

    // Run in chunks
    for (let i = 0; i < pendingSegments.length; i += batchSize) {
      if (isCancelledRef.current) {
        break;
      }

      const chunk = pendingSegments.slice(i, i + batchSize);
      const chunkIds = chunk.map((c) => c.id);

      // Mark this batch as translating
      setSegments((prev) =>
        prev.map((s) => (chunkIds.includes(s.id) ? { ...s, status: 'translating' } : s))
      );

      try {
        const translatedBatch = await translateSegments({
          segments: chunk,
          tone,
          videoContext,
          profile: currentProfile,
          memoryEnabled,
          aiModel,
        });

        // Update segments with returned translations
        setSegments((prev) => {
          const map = new Map(translatedBatch.map((t) => [t.id, t]));
          return prev.map((s) => {
            const match = map.get(s.id);
            if (match) {
              const hasText = Boolean(match.translatedText && match.translatedText.trim().length > 0);
              return {
                ...s,
                translatedText: match.translatedText || '',
                status: hasText && match.status !== 'error' ? 'done' : 'error',
                provider: match.provider || s.provider,
              };
            }
            return s;
          });
        });
      } catch (err) {
        console.error('Batch translation error:', err);
        // Mark chunk with error
        setSegments((prev) =>
          prev.map((s) => (chunkIds.includes(s.id) ? { ...s, status: 'error' } : s))
        );
      }
    }

    setIsTranslating(false);
    showNotification('فرآیند ترجمه هوشمند به پایان رسید.', 'success');
  };

  const handlePauseTranslation = () => {
    isCancelledRef.current = true;
    setIsTranslating(false);
    showNotification('ترجمه متوقف شد.', 'info');
  };

  const handleRetryErrors = () => {
    const errorIds = segments.filter((s) => s.status === 'error').map((s) => s.id);
    if (errorIds.length === 0) return;
    handleBatchTranslate(errorIds);
  };

  const handleClearTranslations = () => {
    if (confirm('آیا از پاک کردن تمام ترجمه‌های فارسی اطمینان دارید؟')) {
      const next = segments.map((s) => ({
        ...s,
        translatedText: '',
        status: 'pending' as const,
      }));
      pushToHistory(next);
      setSegments(next);
      showNotification('تمام ترجمه‌های فارسی ریست شدند.', 'info');
    }
  };

  // Instant cleaner to remove parenthetical English artifacts, NASDAQ/Dow tickers, etc.
  const handleCleanEnglishArtifacts = () => {
    let changedCount = 0;
    const next = segments.map((s) => {
      if (!s.translatedText) return s;
      const cleaned = TranslationService.enforceTerminology(
        s.translatedText,
        currentProfile?.items || []
      );
      if (cleaned !== s.translatedText) {
        changedCount++;
        return { ...s, translatedText: cleaned };
      }
      return s;
    });

    if (changedCount > 0) {
      pushToHistory(next);
      setSegments(next);
      showNotification(`${changedCount} سطر زیرنویس از پرانتزها و کلمات انگلیسی پاکسازی و اصلاح شدند.`, 'success');
    } else {
      showNotification('همه سطرهای ترجمه شده از قبل تمیز و بدون پرانتز یا کلمات انگلیسی هستند.', 'info');
    }
  };

  // Batch translate arbitrary set of IDs
  const handleBatchTranslate = async (ids: number[]) => {
    const targets = segments.filter((s) => ids.includes(s.id));
    if (targets.length === 0) return;

    setSegments((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'translating' } : s))
    );

    try {
      const translatedBatch = await translateSegments({
        segments: targets,
        tone,
        videoContext,
        profile: currentProfile,
        memoryEnabled,
        aiModel,
      });

      setSegments((prev) => {
        const map = new Map(translatedBatch.map((t) => [t.id, t]));
        return prev.map((s) => {
          const match = map.get(s.id);
          if (match) {
            const hasText = Boolean(match.translatedText && match.translatedText.trim().length > 0);
            return {
              ...s,
              translatedText: match.translatedText || '',
              status: hasText && match.status !== 'error' ? 'done' : 'error',
              provider: match.provider || s.provider,
            };
          }
          return s;
        });
      });

      showNotification(`${targets.length} سطر با موفقیت ترجمه شدند`, 'success');
    } catch (e) {
      setSegments((prev) =>
        prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'error' } : s))
      );
      showNotification('خطا در پردازش ترجمه گروهی', 'error');
    }
  };

  // Batch Delete
  const handleBatchDelete = (ids: number[]) => {
    const next = segments
      .filter((s) => !ids.includes(s.id))
      .map((s, idx) => ({ ...s, id: idx + 1 }));
    pushToHistory(next);
    setSegments(next);
    showNotification(`${ids.length} سطر با موفقیت حذف شد`, 'info');
  };

  // Terminology profile actions
  const handleAddTerm = (profileId: string, english: string, persian: string) => {
    // If the user explicitly re-adds a term, remove it from the permanently deleted blacklist
    try {
      const savedDeletedRaw = safeStorage.getItem(STORAGE_KEY_DELETED_TERMS);
      if (savedDeletedRaw) {
        const parsedDeleted: string[] = JSON.parse(savedDeletedRaw);
        if (Array.isArray(parsedDeleted)) {
          const key = english.toLowerCase().trim();
          const filtered = parsedDeleted.filter((k) => k !== key);
          safeStorage.setItem(STORAGE_KEY_DELETED_TERMS, JSON.stringify(filtered));
        }
      }
    } catch {}

    setProfiles((prev) => {
      let updatedProfileToSave: TerminologyProfile | null = null;
      const next = prev.map((p) => {
        if (p.id !== profileId) return p;
        const updated = {
          ...p,
          items: [
            ...p.items,
            { id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, english, persian },
          ],
        };
        updatedProfileToSave = updated;
        return updated;
      });
      try {
        safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {}
      if (updatedProfileToSave) {
        saveProfileToCloud(updatedProfileToSave).catch((err) =>
          console.error('Failed to save added term to cloud:', err)
        );
      }
      return next;
    });
  };

  const handleDeleteTerm = (profileId: string, termId: string, englishText?: string) => {
    // Find the English term being deleted to blacklist it from ever being auto-reseeded
    let termToDelete = englishText;
    if (!termToDelete) {
      const targetProf = profiles.find((p) => p.id === profileId);
      const foundItem = targetProf?.items.find((item) => item.id === termId);
      termToDelete = foundItem?.english;
    }

    if (termToDelete) {
      try {
        const savedDeletedRaw = safeStorage.getItem(STORAGE_KEY_DELETED_TERMS);
        const list: string[] = savedDeletedRaw ? JSON.parse(savedDeletedRaw) : [];
        const normKey = termToDelete.toLowerCase().trim();
        if (!list.includes(normKey)) {
          list.push(normKey);
          safeStorage.setItem(STORAGE_KEY_DELETED_TERMS, JSON.stringify(list));
        }
      } catch (e) {
        console.warn('Failed to record deleted term:', e);
      }
    }

    setProfiles((prev) => {
      let updatedProfileToSave: TerminologyProfile | null = null;
      const next = prev.map((p) => {
        if (p.id !== profileId) return p;
        const updated = {
          ...p,
          items: p.items.filter((item) => item.id !== termId),
        };
        updatedProfileToSave = updated;
        return updated;
      });
      try {
        safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {}
      if (updatedProfileToSave) {
        // Persist immediately to Firestore cloud so deleted word NEVER comes back on refresh!
        saveProfileToCloud(updatedProfileToSave).catch((err) =>
          console.error('Failed to sync deletion to cloud:', err)
        );
      }
      return next;
    });
  };

  const handleEditTerm = (
    profileId: string,
    termId: string,
    english: string,
    persian: string
  ) => {
    setProfiles((prev) => {
      let updatedProfileToSave: TerminologyProfile | null = null;
      const next = prev.map((p) => {
        if (p.id !== profileId) return p;
        const updated = {
          ...p,
          items: p.items.map((item) =>
            item.id === termId ? { ...item, english, persian } : item
          ),
        };
        updatedProfileToSave = updated;
        return updated;
      });
      try {
        safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {}
      if (updatedProfileToSave) {
        saveProfileToCloud(updatedProfileToSave).catch((err) =>
          console.error('Failed to sync edited term to cloud:', err)
        );
      }
      return next;
    });
  };

  const handleResetProfileToDefault = (profileId: string) => {
    const def = DEFAULT_TERMINOLOGY_PROFILES.find((p) => p.id === profileId);
    if (def) {
      // Clear blacklisted deleted terms for this profile
      try {
        const defKeys = new Set(def.items.map((i) => i.english.toLowerCase().trim()));
        const savedDeletedRaw = safeStorage.getItem(STORAGE_KEY_DELETED_TERMS);
        if (savedDeletedRaw) {
          const list: string[] = JSON.parse(savedDeletedRaw);
          const filtered = list.filter((k) => !defKeys.has(k));
          safeStorage.setItem(STORAGE_KEY_DELETED_TERMS, JSON.stringify(filtered));
        }
      } catch {}

      setProfiles((prev) => {
        const next = prev.map((p) => (p.id === profileId ? def : p));
        try {
          safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
        } catch {}
        saveProfileToCloud(def).catch((err) =>
          console.error('Failed to reset profile in cloud:', err)
        );
        return next;
      });
      showNotification('سبک اصطلاحات به حالت پیش‌فرض بازگردانی شد', 'info');
    }
  };

  const handleCreateProfile = (profile: TerminologyProfile) => {
    setProfiles((prev) => {
      const next = [...prev, profile];
      try {
        safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {}
      return next;
    });
    saveProfileToCloud(profile).catch((err) =>
      console.error('Failed to save new profile to cloud:', err)
    );
    setSelectedProfileId(profile.id);
    showNotification(`سبک جدید "${profile.persianName}" اضافه شد`, 'success');
  };

  const handleImportProfileItems = (profileId: string, items: TerminologyItem[]) => {
    setProfiles((prev) => {
      let updatedProfileToSave: TerminologyProfile | null = null;
      const next = prev.map((p) => {
        if (p.id !== profileId) return p;
        const updated = { ...p, items };
        updatedProfileToSave = updated;
        return updated;
      });
      try {
        safeStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {}
      if (updatedProfileToSave) {
        saveProfileToCloud(updatedProfileToSave).catch((err) =>
          console.error('Failed to save imported items to cloud:', err)
        );
      }
      return next;
    });
  };

  // Direct SRT download
  const handleDownloadSRT = () => {
    if (segments.length === 0) {
      showNotification('هیچ زیرنویسی برای دانلود وجود ندارد', 'error');
      return;
    }
    const base = (fileName || 'subtitles').replace(/\.(srt|vtt|txt|ass|sbv)$/i, '');
    const outName = `${base}_Persian_translated.srt`;
    const srtContent = generateSRT(segments, true);
    downloadSRTFile(srtContent, outName);
    showNotification(`فایل «${outName}» با موفقیت دانلود شد`, 'success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F1F5F9] font-sans transition-colors">
      {/* 1. APP HEADER */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        geminiConnected={geminiConnected}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onToggleFindReplace={() => setIsFindReplaceOpen((prev) => !prev)}
      />

      {/* 2. TOP ACTION & SUB-HEADER TOOLBAR */}
      <div className="w-full bg-white dark:bg-[#111622] border-b border-[#E1E7EE] dark:border-[#232D3F] px-4 sm:px-6 lg:px-8 py-2.5 transition-colors">
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Quick Actions & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct SRT Download Button */}
            <button
              id="download-srt-direct-btn"
              type="button"
              onClick={handleDownloadSRT}
              className="px-3.5 py-2 bg-[#00A86B] hover:bg-[#00945E] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="font-persian">دانلود فایل / Download SRT</span>
            </button>

            {/* Other Formats Modal Button */}
            <button
              id="export-modal-trigger-btn"
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-2 bg-white dark:bg-[#151C28] hover:bg-slate-50 dark:hover:bg-[#1E2736] border border-slate-200 dark:border-[#232D3F] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#00A86B]" />
              <span className="font-persian">سایر قالب‌ها (Export)</span>
            </button>

            <button
              id="find-replace-trigger-btn"
              type="button"
              onClick={() => setIsFindReplaceOpen((prev) => !prev)}
              className={`px-3 py-2 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFindReplaceOpen
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-[#00A878] font-bold'
                  : 'bg-slate-50 dark:bg-[#151C28] hover:bg-slate-100 dark:hover:bg-[#1E2736] border-[#E1E7EE] dark:border-[#232D3F] text-slate-700 dark:text-slate-300'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-[#00A878]" />
              <span className="font-persian">جستجو و جایگزینی (Find & Replace)</span>
              <kbd className="hidden sm:inline-block text-[10px] px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono">
                Ctrl+H
              </kbd>
            </button>
          </div>

          {/* Right: Quick File Info & Undo/Redo */}
          <div className="flex items-center gap-1.5">
            {historyIndex > 0 && (
              <button
                type="button"
                onClick={() => {
                  const prev = history[historyIndex - 1];
                  setHistoryIndex(historyIndex - 1);
                  setSegments(prev);
                  showNotification('عملیات قبلی لغو شد (Undo)', 'info');
                }}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2736] transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {historyIndex < history.length - 1 && history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const next = history[historyIndex + 1];
                  setHistoryIndex(historyIndex + 1);
                  setSegments(next);
                  showNotification('عملیات مجدداً اعمال شد (Redo)', 'info');
                }}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2736] transition-colors cursor-pointer"
                title="Redo (Ctrl+Y یا Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3 mr-1">
              <span>فایل فعال:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                {fileName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FIND & REPLACE FLOATING / ATTACHED BAR */}
      {isFindReplaceOpen && (
        <div className="w-full bg-slate-50 dark:bg-[#151C28] border-b border-[#E1E7EE] dark:border-[#232D3F] px-4 sm:px-6 lg:px-8 py-2 animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-[1520px] mx-auto">
            <FindReplaceBar
              segments={segments}
              onUpdateSegments={(updated) => {
                pushToHistory(updated);
                setSegments(updated);
              }}
              onClose={() => setIsFindReplaceOpen(false)}
              onShowNotification={showNotification}
            />
          </div>
        </div>
      )}

      {/* 4. TOAST NOTIFICATION POPUP */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-persian font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-slate-900 dark:bg-slate-800 border-slate-700 text-white'
            }`}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 5. MAIN WORKSPACE (SIDEBAR + TABLE) */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Settings Sidebar */}
        <LeftSidebar
          fileName={fileName}
          totalLines={segments.length}
          stats={stats}
          tone={tone}
          onToneChange={setTone}
          videoContext={videoContext}
          onContextChange={setVideoContext}
          memoryEnabled={memoryEnabled}
          onToggleMemory={setMemoryEnabled}
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          onOpenNewStyle={() => setIsNewStyleOpen(true)}
          onOpenTerminologyModal={() => setIsTerminologyOpen(true)}
          aiModel={aiModel}
          onAiModelChange={setAiModel}
          batchSize={batchSize}
          onBatchSizeChange={(newSize) => {
            setBatchSize(newSize);
            try {
              safeStorage.setItem(STORAGE_KEY_BATCH_SIZE, String(newSize));
            } catch {}
          }}
          isTranslating={isTranslating}
          onStartTranslation={handleStartTranslation}
          onPauseTranslation={handlePauseTranslation}
          onRetryErrors={handleRetryErrors}
          onClearTranslations={handleClearTranslations}
          onClearFile={() => {
            setSegments([]);
            setFileName('');
            try {
              safeStorage.removeItem(STORAGE_KEY_SEGMENTS);
              safeStorage.removeItem(STORAGE_KEY_FILE_NAME);
            } catch {}
            showNotification('فایل جاری بسته شد', 'info');
          }}
          onDownloadSRT={handleDownloadSRT}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenExportModal={() => setIsExportOpen(true)}
          onFileSelect={handleFileSelect}
          providerStatus={providerStatus}
        />

        {/* Right Interactive Subtitle Table */}
        <SubtitleTable
          segments={segments}
          onUpdateSegment={handleUpdateSegment}
          onTranslateSingle={handleTranslateSingle}
          onDeleteSegment={handleDeleteSegment}
          onAddNewSegmentAtEnd={handleAddNewSegmentAtEnd}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          isTranslating={isTranslating}
          highlightSearch={highlightSearch}
          onBatchTranslate={handleBatchTranslate}
          onBatchDelete={handleBatchDelete}
          onFileSelect={handleFileSelect}
          onLoadSample={handleLoadSample}
          tone={tone}
          onToneChange={setTone}
          onTranslateRemaining={handleStartTranslation}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenFindReplace={() => setIsFindReplaceOpen(true)}
          onCleanEnglishArtifacts={handleCleanEnglishArtifacts}
        />
      </main>

      {/* 6. MODALS */}
      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        segments={segments}
        fileName={fileName}
        onShowToast={showNotification}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* New Style Modal */}
      <NewStyleModal
        isOpen={isNewStyleOpen}
        onClose={() => setIsNewStyleOpen(false)}
        onCreateProfile={handleCreateProfile}
      />

      {/* Terminology Database Modal */}
      <TerminologyDatabaseModal
        isOpen={isTerminologyOpen}
        onClose={() => setIsTerminologyOpen(false)}
        currentProfile={currentProfile}
        onAddTerm={handleAddTerm}
        onDeleteTerm={handleDeleteTerm}
        onEditTerm={handleEditTerm}
        onResetProfileToDefault={handleResetProfileToDefault}
        onImportProfileItems={handleImportProfileItems}
        cloudSyncStatus={cloudSyncStatus}
      />

      {/* Subtitle Sync Modal (with video player) */}
      <SubtitleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        segments={segments}
        onSaveSegments={(updated) => {
          pushToHistory(updated);
          setSegments(updated);
          showNotification('زمان‌بندی زیرنویس‌ها با موفقیت ذخیره و اعمال شد', 'success');
        }}
        selectedSegmentId={selectedSegmentId}
        fileName={fileName}
      />
    </div>
  );
}
