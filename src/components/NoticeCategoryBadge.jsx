import React, { memo } from 'react';
import { Flame, Sparkles } from 'lucide-react';

// 지원 카테고리 3종: 패치, 일반, 홍보
export const NOTICE_CATEGORIES = {
  패치: { label: '패치', className: 'notice-category-badge--패치' },
  일반: { label: '일반', className: 'notice-category-badge--일반' },
  홍보: { label: '홍보', className: 'notice-category-badge--홍보' },
};

function NoticeCategoryBadge({ category = '일반', isImportant = false, className = '' }) {
  const catConfig = NOTICE_CATEGORIES[category] || NOTICE_CATEGORIES['일반'];

  return (
    <span className={`notice-category-badge ${catConfig.className} ${isImportant ? 'notice-category-badge--important' : ''} ${className}`}>
      {isImportant && (
        <Flame size={11} className="notice-category-badge__important-icon" />
      )}
      <span>{catConfig.label}</span>
    </span>
  );
}

export default memo(NoticeCategoryBadge);
