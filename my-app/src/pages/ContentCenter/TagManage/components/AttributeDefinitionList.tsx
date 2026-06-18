import type { AttributeTarget, TagCategory } from '@/services/tagSystem';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Button, Empty, Segmented, Space } from 'antd';
import React, { useMemo } from 'react';
import AttributeStatusPill from './AttributeStatusPill';
import { ATTRIBUTE_TARGET_OPTIONS } from './attributeSettingsConstants';
import { sortBySort } from './attributeSettingsHelpers';

interface AttributeDefinitionListProps {
  activeTarget: AttributeTarget;
  activeCategoryId?: string;
  categories: TagCategory[];
  onActiveTargetChange: (target: AttributeTarget) => void;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: () => void;
  onEditCategory: (category: TagCategory) => void;
  onDeleteCategory: (category: TagCategory) => void;
}

const getOptionModeText = (category: TagCategory) =>
  category.target === 'question' && category.optionAddMode === 'bySubject'
    ? '按学科维护'
    : '统一维护';

const AttributeDefinitionList: React.FC<AttributeDefinitionListProps> = ({
  activeTarget,
  activeCategoryId,
  categories,
  onActiveTargetChange,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const sortedCategories = useMemo(() => sortBySort(categories), [categories]);

  return (
    <aside className="attribute-category-panel">
      <div className="attribute-panel-header">
        <div className="attribute-panel-title">属性列表</div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="attribute-header-add-button"
          onClick={onAddCategory}
        >
          新增属性
        </Button>
      </div>
      <div className="attribute-category-target-filter">
        <Segmented
          block
          aria-label="属性类型"
          value={activeTarget}
          options={ATTRIBUTE_TARGET_OPTIONS}
          onChange={(value) => {
            onActiveTargetChange(value as AttributeTarget);
          }}
        />
      </div>
      <div className="attribute-category-list">
        {sortedCategories.length ? (
          <div className="attribute-category-stack">
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
                    aria-pressed={active}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <span className="attribute-category-icon">
                      <TagsOutlined />
                    </span>
                    <span className="attribute-category-main">
                      <span className="attribute-category-name">
                        {category.name}
                      </span>
                      <span className="attribute-category-meta">
                        <span className="attribute-option-mode-pill">
                          {getOptionModeText(category)}
                        </span>
                        <AttributeStatusPill status={category.status} />
                      </span>
                    </span>
                  </button>
                  <span className="attribute-category-actions">
                    <Space size={2}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        title="编辑属性"
                        aria-label={`编辑${category.name}`}
                        className="attribute-category-action-button"
                        onClick={() => onEditCategory(category)}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        title="删除属性"
                        aria-label={`删除${category.name}`}
                        className="attribute-category-action-button attribute-category-delete-button"
                        onClick={() => onDeleteCategory(category)}
                      />
                    </Space>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="attribute-workspace-empty">
            <Empty description="暂无属性" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default AttributeDefinitionList;
