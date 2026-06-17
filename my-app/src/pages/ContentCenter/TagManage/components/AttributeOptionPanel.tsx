import type { TagCategory } from '@/services/tagSystem';
import React from 'react';
import { SUBJECT_LABELS } from './attributeSettingsConstants';

interface AttributeOptionPanelProps {
  category?: TagCategory;
  selectedSubject: string;
  onSelectedSubjectChange: (subject: string) => void;
  onEditCategory: (category: TagCategory) => void;
}

const AttributeOptionPanel: React.FC<AttributeOptionPanelProps> = ({
  category,
  selectedSubject,
  onSelectedSubjectChange,
  onEditCategory,
}) => {
  void onSelectedSubjectChange;
  void onEditCategory;

  const subjectLabel = SUBJECT_LABELS[selectedSubject] || selectedSubject;

  return (
    <main className="attribute-option-panel">
      <div className="attribute-panel-header">
        <div>
          <div className="attribute-panel-title">选项值</div>
          <div className="attribute-panel-meta">
            {category ? `${category.name} / ${subjectLabel}` : '请选择属性'}
          </div>
        </div>
      </div>
      <div className="attribute-workspace-empty">
        <div>选项值</div>
      </div>
    </main>
  );
};

export default AttributeOptionPanel;
