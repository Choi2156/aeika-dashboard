import React, { memo } from 'react';
import { Flame } from 'lucide-react';

// 지원 카테고리 3종: 패치, 일반, 홍보
export const NOTICE_CATEGORIES = {
  패치: { label: '패치', className: 'notice-category-badge--패치' },
  일반: { label: '일반', className: 'notice-category-badge--일반' },
  홍보: { label: '홍보', className: 'notice-category-badge--홍보' },
};

function NoticeCategoryBadge({ category = '일반', isImportant = false, className = '' }) {
  const catConfig = NOTICE_CATEGORIES[category] || NOTICE_CATEGORIES['일반'];

  return (
    <div className={`notice-badge-group ${className}`}>
      {/* 1. 중요 공지일 때만 태그 박스 바깥 왼쪽에 불꽃 아이콘 배치 */}
      {isImportant && (
        <Flame
          size={13}
          className="notice-important-flame-icon"
          title="중요 공지"
        />
      )}
      {/* 2. 순수한 카테고리 태그 박스 */}
      <span className={`notice-category-badge ${catConfig.className}`}>
        {catConfig.label}
      </span>
    </div>
  );
}

export default memo(NoticeCategoryBadge);
