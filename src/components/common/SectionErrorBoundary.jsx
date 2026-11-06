import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * SectionErrorBoundary — 개별 뷰·섹션 단위 에러 격리 컴포넌트
 * 특정 탭이나 위젯에서 예외가 발생해도 상단 네비게이션 및 타 뷰는 정상 동작하도록 보장합니다.
 */
export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || '알 수 없는 렌더링 오류',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectionErrorBoundary: ${this.props.sectionName || 'View'}]`, error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="section-error-fallback" role="alert">
          <div className="section-error-fallback__icon">
            <AlertTriangle size={20} />
          </div>
          <div className="section-error-fallback__body">
            <h3 className="section-error-fallback__title">
              {this.props.sectionTitle || '해당 영역을 표시하는 중 일시적인 문제가 발생했습니다.'}
            </h3>
            <p className="section-error-fallback__desc">
              데이터 갱신 또는 일시적인 스크립트 오류일 수 있습니다. 다른 메뉴와 탭은 정상적으로 이용 가능합니다.
            </p>
            {this.state.errorMessage && (
              <code className="section-error-fallback__code">{this.state.errorMessage}</code>
            )}
          </div>
          <button
            type="button"
            className="section-error-fallback__btn"
            onClick={this.handleRetry}
          >
            <RotateCcw size={14} />
            <span>다시 시도</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
