import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    globalThis.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-base)',
          color: 'var(--color-text-primary)',
          fontFamily: 'inherit',
          direction: 'rtl',
          padding: 'var(--space-6)'
        }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--color-bg-surface)',
              padding: 'var(--space-10)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border-strong)',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-6)'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-danger-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-danger)',
              marginBottom: 'var(--space-2)'
            }}>
              <AlertCircle size={40} strokeWidth={1.5} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: 0,
                color: 'var(--color-text-primary)'
              }}>
                عذراً، حدث خطأ غير متوقع
              </h1>
              <p style={{
                fontSize: '16px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6',
                margin: 0
              }}>
                واجه النظام مشكلة تقنية غير متوقعة. يرجى محاولة إعادة تحميل الصفحة. إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div style={{
                width: '100%',
                padding: 'var(--space-4)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--color-danger)',
                textAlign: 'left',
                direction: 'ltr',
                overflowX: 'auto',
                border: '1px solid var(--color-danger-muted)'
              }}>
                <code style={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={this.handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'var(--color-brand-primary)',
                color: 'var(--color-text-inverse)',
                border: 'none',
                padding: 'var(--space-3) var(--space-8)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                marginTop: 'var(--space-2)'
              }}
            >
              <RefreshCw size={18} />
              إعادة المحاولة
            </motion.button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
