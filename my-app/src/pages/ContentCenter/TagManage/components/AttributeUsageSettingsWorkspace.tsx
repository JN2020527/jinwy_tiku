import type { AttributeUsageRule, TagCategory } from '@/services/tagSystem';
import React from 'react';

interface AttributeUsageSettingsWorkspaceProps {
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onSaveUsageRules: (rules: AttributeUsageRule[]) => Promise<boolean>;
}

const AttributeUsageSettingsWorkspace: React.FC<
  AttributeUsageSettingsWorkspaceProps
> = ({ tagCategories, usageRules, onSaveUsageRules }) => {
  return (
    <div
      className="attribute-settings-stub"
      data-category-count={tagCategories.length}
      data-usage-rule-count={usageRules.length}
      data-save-ready={String(Boolean(onSaveUsageRules))}
    >
      使用设置
    </div>
  );
};

export default AttributeUsageSettingsWorkspace;
