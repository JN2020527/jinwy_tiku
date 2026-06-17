import type {
  AttributeTarget,
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import { updateAttributeUsageRules } from '@/services/tagSystem';
import { message, Tabs } from 'antd';
import React, { useState } from 'react';
import AttributeDefinitionWorkspace from './AttributeDefinitionWorkspace';
import './AttributeTagsPanel.less';
import AttributeUsageSettingsWorkspace from './AttributeUsageSettingsWorkspace';

interface AttributeTagsPanelProps {
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onRefresh: () => void | Promise<void>;
}

const AttributeTagsPanel: React.FC<AttributeTagsPanelProps> = ({
  tagCategories,
  usageRules,
  onRefresh,
}) => {
  const [activeTarget, setActiveTarget] = useState<AttributeTarget>('question');

  const handleSaveUsageRules = async (rules: AttributeUsageRule[]) => {
    try {
      const res = await updateAttributeUsageRules({ rules });
      if (res.success) {
        message.success('使用设置已保存');
        await onRefresh();
        return true;
      }

      message.error(res.message || '使用设置保存失败');
      return false;
    } catch {
      message.error('使用设置保存失败');
      return false;
    }
  };

  return (
    <div className="attribute-settings-shell">
      <Tabs
        items={[
          {
            key: 'definitions',
            label: '属性定义',
            children: (
              <AttributeDefinitionWorkspace
                activeTarget={activeTarget}
                tagCategories={tagCategories}
                usageRules={usageRules}
                onActiveTargetChange={setActiveTarget}
                onRefresh={onRefresh}
                onSaveUsageRules={handleSaveUsageRules}
              />
            ),
          },
          {
            key: 'usage',
            label: '使用设置',
            children: (
              <AttributeUsageSettingsWorkspace
                tagCategories={tagCategories}
                usageRules={usageRules}
                onSaveUsageRules={handleSaveUsageRules}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default AttributeTagsPanel;
