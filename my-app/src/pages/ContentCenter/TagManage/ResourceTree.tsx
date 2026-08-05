import { PageContainer } from '@ant-design/pro-components';
import React, { useState } from 'react';
import TagSystemTreePanel from './components/TagSystemTreePanel';
import {
  SUBJECT_OPTIONS,
  TREE_CONTEXT_OPTIONS,
} from './components/treeFilterConstants';

const ResourceTreePage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  return (
    <PageContainer>
      <TagSystemTreePanel
        targetType="review"
        contextOptions={TREE_CONTEXT_OPTIONS}
        enableAttributeTags={false}
        searchPlaceholder="搜索资源树节点…"
        nodeNamePlaceholder="请输入资源树节点名称…"
        deleteTargetName="资源树节点"
        selectedSubject={selectedSubject}
        subjectOptions={SUBJECT_OPTIONS}
        onSubjectChange={setSelectedSubject}
      />
    </PageContainer>
  );
};

export default ResourceTreePage;
