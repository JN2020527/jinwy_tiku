import type { AttributeUsageRule, TagCategory } from '@/services/tagSystem';
import {
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Empty, Space, Tag } from 'antd';
import React, { useMemo } from 'react';
import AttributeStatusPill from './AttributeStatusPill';
import {
  SUBJECT_LABELS,
  USAGE_SCENE_LABELS,
} from './attributeSettingsConstants';
import { sortBySort } from './attributeSettingsHelpers';

interface AttributeSummaryPanelProps {
  category?: TagCategory;
  selectedSubject: string;
  usageRules: AttributeUsageRule[];
  onOpenUsageDrawer: () => void;
  onEditCategory?: (category: TagCategory) => void;
  onDeleteCategory?: (category: TagCategory) => void;
}

const AttributeSummaryPanel: React.FC<AttributeSummaryPanelProps> = ({
  category,
  selectedSubject,
  usageRules,
  onOpenUsageDrawer,
  onEditCategory,
  onDeleteCategory,
}) => {
  const enabledUsageRules = useMemo(
    () =>
      category
        ? sortBySort(
            usageRules.filter(
              (rule) => rule.attributeId === category.id && rule.enabled,
            ),
          )
        : [],
    [category, usageRules],
  );

  const getUsageRuleSummary = (rule: AttributeUsageRule) => {
    if (rule.required) {
      return '启用 / 必填';
    }

    if (rule.filterArea === 'primary') {
      return '主筛选区';
    }

    if (rule.filterArea === 'more') {
      return '更多筛选区';
    }

    return '启用';
  };

  return (
    <aside className="attribute-rule-panel">
      <div className="attribute-panel-header">
        <div>
          <div className="attribute-panel-title">属性摘要</div>
          <div className="attribute-panel-meta">
            {category ? category.name : '选择一个属性后查看摘要'}
          </div>
        </div>
        {category && (
          <Space size={4}>
            <Button
              icon={<EditOutlined />}
              onClick={() => onEditCategory?.(category)}
            >
              编辑属性
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteCategory?.(category)}
            >
              删除属性
            </Button>
          </Space>
        )}
      </div>

      {category ? (
        <div className="attribute-rule-content">
          <section className="attribute-rule-section">
            <h3>基础信息</h3>
            <dl className="attribute-rule-list">
              <dt>属性名称</dt>
              <dd>{category.name}</dd>
              <dt>状态</dt>
              <dd>
                <AttributeStatusPill status={category.status} />
              </dd>
              <dt>选项维护</dt>
              <dd>
                {category.target === 'question' &&
                category.optionAddMode === 'bySubject'
                  ? '按学科维护'
                  : '统一维护'}
              </dd>
              {category.target === 'question' &&
                category.optionAddMode === 'bySubject' && (
                  <>
                    <dt>当前学科</dt>
                    <dd>
                      {SUBJECT_LABELS[selectedSubject] || selectedSubject}
                    </dd>
                  </>
                )}
              <dt>说明</dt>
              <dd>{category.description || '暂无说明'}</dd>
            </dl>
          </section>

          <section className="attribute-rule-section">
            <h3>使用设置</h3>
            {enabledUsageRules.length ? (
              <div className="attribute-scene-list">
                {enabledUsageRules.map((rule) => (
                  <div key={rule.id} className="attribute-scene-item">
                    <span>{USAGE_SCENE_LABELS[rule.scene]}</span>
                    <Tag color={rule.required ? 'red' : 'blue'}>
                      {getUsageRuleSummary(rule)}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div className="attribute-rule-empty">未配置使用场景</div>
            )}
          </section>

          <Button icon={<SettingOutlined />} onClick={onOpenUsageDrawer}>
            配置使用规则
          </Button>
        </div>
      ) : (
        <div className="attribute-workspace-empty">
          <Empty description="暂无属性摘要" />
        </div>
      )}
    </aside>
  );
};

export default AttributeSummaryPanel;
