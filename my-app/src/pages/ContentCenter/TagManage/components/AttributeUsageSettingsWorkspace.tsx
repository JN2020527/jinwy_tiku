import type {
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import React from 'react';

interface AttributeUsageSettingsWorkspaceProps {
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onChange: (rules: AttributeUsageRule[]) => void;
  onRefresh: () => void | Promise<void>;
}

const AttributeUsageSettingsWorkspace: React.FC<
  AttributeUsageSettingsWorkspaceProps
> = () => (
  <div className="attribute-settings-stub">使用设置</div>
);

export default AttributeUsageSettingsWorkspace;
