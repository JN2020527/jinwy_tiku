import { PageContainer } from '@ant-design/pro-components';
import React, { useState } from 'react';
import KnowledgeTreePanel from './components/KnowledgeTreePanel';

const SUBJECT_OPTIONS = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
  { label: '生物', value: 'biology' },
  { label: '历史', value: 'history' },
  { label: '地理', value: 'geography' },
  { label: '道德与法治', value: 'politics' },
];

const KnowledgeTagPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  return (
    <PageContainer>
      <KnowledgeTreePanel
        selectedSubject={selectedSubject}
        subjectOptions={SUBJECT_OPTIONS}
        onSubjectChange={setSelectedSubject}
      />
    </PageContainer>
  );
};

export default KnowledgeTagPage;
