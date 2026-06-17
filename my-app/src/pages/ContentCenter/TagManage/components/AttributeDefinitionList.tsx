import type { AttributeTarget, TagCategory } from '@/services/tagSystem';
import { PlusOutlined, TagsOutlined } from '@ant-design/icons';
import { Button, Empty, Segmented } from 'antd';
import React, { useMemo } from 'react';
import AttributeStatusPill from './AttributeStatusPill';
import {
  ATTRIBUTE_TARGET_OPTIONS,
  SUBJECT_LABELS,
} from './attributeSettingsConstants';
import { getOptionList, sortBySort } from './attributeSettingsHelpers';

interface AttributeDefinitionListProps {
  activeTarget: AttributeTarget;
  activeCategoryId?: string;
  categories: TagCategory[];
  selectedSubject: string;
  onActiveTargetChange: (target: AttributeTarget) => void;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: () => void;
}

const getTargetLabel = (target: AttributeTarget) =>
  ATTRIBUTE_TARGET_OPTIONS.find((option) => option.value === target)?.label ||
  '属性';

const getCategoryMeta = (category: TagCategory, selectedSubject: string) => {
  const optionCount = getOptionList(category, selectedSubject).length;

  if (
    category.target === 'question' &&
    category.optionAddMode === 'bySubject'
  ) {
    return `按学科添加 / ${
      SUBJECT_LABELS[selectedSubject] || selectedSubject
    } ${optionCount} 个选项`;
  }

  return `统一添加 / ${optionCount} 个选项`;
};

const AttributeDefinitionList: React.FC<AttributeDefinitionListProps> = ({
  activeTarget,
  activeCategoryId,
  categories,
  selectedSubject,
  onActiveTargetChange,
  onSelectCategory,
  onAddCategory,
}) => {
  const sortedCategories = useMemo(() => sortBySort(categories), [categories]);
  const targetLabel = getTargetLabel(activeTarget);

  return (
    <aside className="attribute-category-panel">
      <div className="attribute-panel-header">
        <div>
          <div className="attribute-panel-title">属性定义</div>
          <div className="attribute-panel-meta">
            {targetLabel} / {sortedCategories.length} 个定义
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddCategory}>
          新增属性
        </Button>
      </div>

      <div className="attribute-category-list">
        <Segmented
          block
          value={activeTarget}
          options={ATTRIBUTE_TARGET_OPTIONS}
          onChange={(value) => {
            onActiveTargetChange(value as AttributeTarget);
          }}
        />

        {sortedCategories.length ? (
          <div style={{ marginTop: 12 }}>
            {sortedCategories.map((category) => {
              const active = category.id === activeCategoryId;

              return (
                <div
                  key={category.id}
                  className={
                    active
                      ? 'attribute-category-item active'
                      : 'attribute-category-item'
                  }
                >
                  <button
                    type="button"
                    className="attribute-category-trigger"
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <span className="attribute-category-icon">
                      <TagsOutlined />
                    </span>
                    <span className="attribute-category-main">
                      <span className="attribute-category-name">
                        {category.name}
                      </span>
                      <span className="attribute-category-count">
                        {getCategoryMeta(category, selectedSubject)}
                      </span>
                    </span>
                  </button>
                  <span className="attribute-category-actions">
                    <AttributeStatusPill status={category.status} />
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="attribute-workspace-empty">
            <Empty description={`暂无${targetLabel}定义`} />
          </div>
        )}
      </div>
    </aside>
  );
};

export default AttributeDefinitionList;
