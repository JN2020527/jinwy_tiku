import type { AttributeTarget, TagCategory } from '@/services/tagSystem';
import React, { useState } from 'react';
import AttributeDefinitionWorkspace from './AttributeDefinitionWorkspace';
import './AttributeTagsPanel.less';
import './TagSystemTreePanel.less';

interface AttributeTagsPanelProps {
  tagCategories: TagCategory[];
  onRefresh: () => void | Promise<void>;
}

const AttributeTagsPanel: React.FC<AttributeTagsPanelProps> = ({
  tagCategories,
  onRefresh,
}) => {
  const [activeTarget, setActiveTarget] = useState<AttributeTarget>('question');

  return (
    <div className="attribute-settings-shell">
      <AttributeDefinitionWorkspace
        activeTarget={activeTarget}
        tagCategories={tagCategories}
        onActiveTargetChange={setActiveTarget}
        onRefresh={onRefresh}
      />
    </div>
  );
};

export default AttributeTagsPanel;
