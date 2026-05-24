import React from 'react';
import { Mail, ShieldAlert, Heart } from 'lucide-react';
import '../styles/components.css';

export default function Footer() {
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

        <div className="footer-disclaimers">
          <div className="disclaimer-item">
            <span className="disclaimer-title">
              <ShieldAlert size={13} />
              <span>저작권 및 상표권 고지 (Copyright Disclaimer)</span>
            </span>
            <p className="disclaimer-text" style={{ marginBottom: '0.5rem' }}>
              본 대시보드에 사용된 모든 캐릭터 이미지, 로고, 게임 데이터 및 상표권은 각 게임 개발사 및 권리자의 공식 자산입니다. 본 대시보드는 정보 제공 및 사용자 편의 제공 목적으로 제작되었으며, 각 제조사의 지식재산권을 전적으로 존중하고 준수합니다.
            </p>
            <div className="disclaimer-copyrights" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem', color: 'var(--slate-500)', display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255, 255, 255, 0.05)' }}>
              <div>Copyright © COGNOSPHERE. All Rights Reserved.</div>
              <div>Copyright © KURO GAMES. ALL RIGHTS RESERVED.</div>
              <div>Copyright © GRYPHLINE. All Rights Reserved.</div>
            </div>
          </div>

          <div className="disclaimer-item">
            <span className="disclaimer-title">
              <ShieldAlert size={13} />
              <span>예측 알고리즘 및 정보 면책 조항 (Data Disclaimer)</span>
            </span>
            <p className="disclaimer-text">
              대시보드에 표기되는 D-Day 및 업데이트 스케줄([확정] 및 [예상])은 각 제조사의 정규 패치 주기 상수를 대입한 시스템 알고리즘 연산 결과와 관리자 검증을 기반으로 합니다. 단, 대형 명절이나 돌발 업데이트 지연, 공식 공지 번복 등으로 인해 실제 공개 스케줄과 오차가 발생할 수 있습니다. 본 사이트는 안내되는 스케줄 데이터의 정보 무결성을 보장하지 않으며 참고용 스케줄로서 어떠한 법적 책임도 지지 않습니다.
            </p>
          </div>

          <div className="disclaimer-item">
            <span className="disclaimer-title">
              <ShieldAlert size={13} />
              <span>라이선스 및 오픈소스 고지 (Open Source Licenses)</span>
            </span>
            <p className="disclaimer-text">
              본 웹사이트의 프론트엔드 소스 코드는 <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="license-link">MIT License</a> 규격을 준수합니다. 사이트에 사용된 아이콘은 Lucide React 라이선스에 준하며, 서체는 Google Fonts에서 배포하는 Outfit 폰트(OFL)를 적용했습니다. 대시보드의 원활한 트래픽 유지를 위해 동영상 콘텐츠는 유튜브 임베디드 소스를 활용하여 우회 CDN 호스팅 구조를 적용했습니다.
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
