import { PageContainer } from '@ant-design/pro-components';
import React, { useState } from 'react';
import TagSystemTreePanel from './components/TagSystemTreePanel';
import {
  SUBJECT_OPTIONS,
  TREE_CONTEXT_OPTIONS,
} from './components/treeFilterConstants';

const ReviewTagPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  return (
    <PageContainer>
      <TagSystemTreePanel
        targetType="review"
        contextOptions={TREE_CONTEXT_OPTIONS}
        enableAttributeTags={false}
        searchPlaceholder="搜索复习节点…"
        nodeNamePlaceholder="请输入复习节点名称…"
        deleteTargetName="复习节点"
        selectedSubject={selectedSubject}
        subjectOptions={SUBJECT_OPTIONS}
        onSubjectChange={setSelectedSubject}
      />
    </PageContainer>
  );
};

export default ReviewTagPage;
