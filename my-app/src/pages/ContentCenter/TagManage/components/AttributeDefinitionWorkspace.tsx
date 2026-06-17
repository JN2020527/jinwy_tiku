import type { TagCategory } from '@/services/tagSystem';
import React from 'react';

interface AttributeDefinitionWorkspaceProps {
  tagCategories: TagCategory[];
  onRefresh: () => void | Promise<void>;
}

const AttributeDefinitionWorkspace: React.FC<
  AttributeDefinitionWorkspaceProps
> = () => (
  <div className="attribute-settings-stub">属性定义</div>
);

export default AttributeDefinitionWorkspace;
