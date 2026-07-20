import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an uncaught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '2rem',
          color: '#f8fafc',
          backgroundColor: '#0f172a',
          textAlign: 'center',
          fontFamily: 'Noto Sans KR, sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444' }}>
            대시보드 로딩 중 일시적인 오류가 발생했습니다.
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '500px', lineHeight: 1.6, marginBottom: '2rem' }}>
            일정 예측 엔진 또는 데이터 가공 과정에서 충돌이 감지되었습니다. 브라우저를 새로 고침하거나 로컬 저장소 캐시를 초기화해 보세요.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              새로고침
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#475569',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              캐시 초기화 후 새로고침
            </button>
          </div>
          {this.state.error && (
            <details style={{
              marginTop: '2rem',
              textAlign: 'left',
              backgroundColor: '#1e293b',
              padding: '1rem',
              borderRadius: '6px',
              maxWidth: '600px',
              width: '100%'
            }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>오류 로그 세부사항</summary>
              <pre style={{
                marginTop: '0.5rem',
                color: '#f1f5f9',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
