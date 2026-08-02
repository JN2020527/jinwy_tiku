import { PageContainer } from '@ant-design/pro-components';
import React, { useState } from 'react';
import TagSystemTreePanel from './components/TagSystemTreePanel';
import {
  SUBJECT_OPTIONS,
  TREE_CONTEXT_OPTIONS,
} from './components/treeFilterConstants';

const TopicTagPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  return (
    <PageContainer>
      <TagSystemTreePanel
        targetType="topic"
        contextOptions={TREE_CONTEXT_OPTIONS}
        searchPlaceholder="搜索专题…"
        nodeNamePlaceholder="请输入专题名称…"
        deleteTargetName="节点"
        selectedSubject={selectedSubject}
        subjectOptions={SUBJECT_OPTIONS}
        onSubjectChange={setSelectedSubject}
      />
    </PageContainer>
  );
};

export default TopicTagPage;
