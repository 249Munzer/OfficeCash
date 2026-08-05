/**
 * Error Boundary Component
 * يلتقط الأخطاء في المكونات الفرعية ويعرض رسائل خطأ صديقة للمستخدم
 * بدلاً من انهيار التطبيق بالكامل
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // تسجيل الخطأ في console للتصحيح
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // إذا كان هناك fallback مخصص، استخدمه
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // عرض رسالة الخطأ الافتراضية
      return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">حدث خطأ غير متوقع</h2>
                <p className="text-xs text-slate-500">يبدو أن هناك مشكلة في تحميل هذه الصفحة</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-600 font-mono break-all">
                {this.state.error?.message || 'خطأ غير معروف'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg text-sm hover:bg-slate-300 transition-colors"
              >
                إعادة تحميل الصفحة
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              إذا استمرت المشكلة، يرجى إعادة تشغيل التطبيق
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;