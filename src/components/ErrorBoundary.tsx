import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { safeStorage } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    try {
      safeStorage.removeItem('gabriel_subtitles_v1');
      safeStorage.removeItem('gabriel_profiles_v1');
      safeStorage.removeItem('gabriel_filename_v1');
      safeStorage.removeItem('gabriel_settings_v1');
      safeStorage.removeItem('pst_segments');
      safeStorage.removeItem('pst_active_filename');
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0B0F17] flex items-center justify-center p-4 font-persian" dir="rtl">
          <div className="max-w-md w-full bg-white dark:bg-[#111622] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              خطایی در بارگذاری برنامه رخ داد
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              یک خطای غیرمنتظره در پردازش رابط رخ داده است. می‌توانید با بارگذاری مجدد یا پاک‌سازی حافظه موقت مشکل را برطرف نمایید.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-left font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto max-h-24 border border-slate-200 dark:border-slate-800" dir="ltr">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-[#00A878] hover:bg-[#009667] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد صفحه (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearAndReset}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-[#1E2736] hover:bg-slate-200 dark:hover:bg-[#253246] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>پاکسازی حافظه موقت و بارگذاری مجدد</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
