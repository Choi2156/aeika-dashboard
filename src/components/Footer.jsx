import React from 'react';
import { Mail, ShieldAlert, Heart, Info } from 'lucide-react';
import '../styles/components.css';

/**
 * Footer Component
 * 
 * Props:
 *   onOpenLicense - Callback to open the copyright & disclaimer details modal
 */
export default function Footer({ onOpenLicense }) {
  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="footer-brand__logo">🗓️ AEIKA ARCHIVE</span>
            <p className="footer-brand__sub">서브컬처 게임 일정 대시보드 (비공식 팬 사이트)</p>
          </div>
          <div className="footer-contact">
            <a href="mailto:choi21mg@gmail.com" className="footer-email-link" title="관리자에게 문의/제보 메일 보내기">
              <Mail size={14} />
              <span>choi21mg@gmail.com</span>
            </a>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-disclaimers" style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '1rem' }}>
          <div className="disclaimer-item" style={{ padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}>
            <span className="disclaimer-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              <ShieldAlert size={12} style={{ color: 'var(--accent-indigo-light)' }} />
              <span>저작권 고지</span>
            </span>
            <p className="disclaimer-text" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              본 사이트에 수납된 모든 캐릭터 이미지, 공식 로고 및 상표권은 각 게임 개발사에 귀속됩니다. 
              <button onClick={onOpenLicense} className="footer-detail-trigger-btn" style={{ background: 'none', border: 'none', color: 'var(--accent-indigo-light)', fontWeight: 700, padding: '0 4px', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.68rem' }}>
                [상세 보기]
              </button>
            </p>
          </div>

          <div className="disclaimer-item" style={{ padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}>
            <span className="disclaimer-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              <ShieldAlert size={12} style={{ color: 'var(--accent-indigo-light)' }} />
              <span>일정 면책 조항</span>
            </span>
            <p className="disclaimer-text" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              공지되지 않은 [예상] 배너 일정 및 D-Day 타이머는 시스템 주기 연산 기반 수치이므로 오차가 있을 수 있습니다. 
              <button onClick={onOpenLicense} className="footer-detail-trigger-btn" style={{ background: 'none', border: 'none', color: 'var(--accent-indigo-light)', fontWeight: 700, padding: '0 4px', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.68rem' }}>
                [상세 보기]
              </button>
            </p>
          </div>

          <div className="disclaimer-item" style={{ padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}>
            <span className="disclaimer-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              <Info size={12} style={{ color: 'var(--accent-indigo-light)' }} />
              <span>라이선스 안내</span>
            </span>
            <p className="disclaimer-text" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              본 웹사이트 소스코드는 MIT 규격을 준수하며, 유튜브 우회 CDN 임베딩 호스팅 구조를 적용했습니다. 
              <button onClick={onOpenLicense} className="footer-detail-trigger-btn" style={{ background: 'none', border: 'none', color: 'var(--accent-indigo-light)', fontWeight: 700, padding: '0 4px', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.68rem' }}>
                [상세 보기]
              </button>
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright-line">
            &copy; 2026 AEIKA ARCHIVE. Developed with <Heart size={10} className="heart-icon" /> for subculture gaming community.
          </p>
        </div>
      </div>
    </footer>
  );
}
