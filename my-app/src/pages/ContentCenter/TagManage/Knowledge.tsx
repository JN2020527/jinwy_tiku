import { PageContainer } from '@ant-design/pro-components';
import React, { useState } from 'react';
import TagSystemTreePanel from './components/TagSystemTreePanel';
import {
  KNOWLEDGE_TREE_CONTEXT_OPTIONS,
  SUBJECT_OPTIONS,
} from './components/treeFilterConstants';

const KnowledgeTagPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  return (
    <PageContainer>
      <TagSystemTreePanel
        targetType="knowledge"
        contextOptions={KNOWLEDGE_TREE_CONTEXT_OPTIONS}
        supportsSyncContext
        searchPlaceholder="搜索知识节点…"
        nodeNamePlaceholder="请输入知识节点名称…"
        deleteTargetName="知识节点"
        selectedSubject={selectedSubject}
        subjectOptions={SUBJECT_OPTIONS}
        onSubjectChange={setSelectedSubject}
      />
    </PageContainer>
  );
};

export default KnowledgeTagPage;
