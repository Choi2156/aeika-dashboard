import React, { memo } from 'react';

// 지원 카테고리: 중요, 패치, 일반, 홍보
export const NOTICE_CATEGORIES = {
  중요: { label: '중요', className: 'notice-category-badge--중요' },
  패치: { label: '패치', className: 'notice-category-badge--패치' },
  일반: { label: '일반', className: 'notice-category-badge--일반' },
  홍보: { label: '홍보', className: 'notice-category-badge--홍보' },
};

function NoticeCategoryBadge({ category = '일반', isImportant = false, className = '' }) {
  // is_important가 true이면 category와 무관하게 '중요' 배지 우선 부여 가능
  const resolvedCat = isImportant ? '중요' : (category || '일반');
  const catConfig = NOTICE_CATEGORIES[resolvedCat] || NOTICE_CATEGORIES['일반'];

  return (
    <span className={`notice-category-badge ${catConfig.className} ${className}`}>
      {catConfig.label}
    </span>
  );
}

export default memo(NoticeCategoryBadge);
