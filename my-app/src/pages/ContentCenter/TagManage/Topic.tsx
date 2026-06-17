import type { KnowledgeNode } from '@/services/tagSystem';
import { getKnowledgeTree } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import TopicTreePanel from './components/TopicTreePanel';

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

const TopicTagPage: React.FC = () => {
  const [topicTree, setTopicTree] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getKnowledgeTree({
        subject: selectedSubject,
      });
      if (res.success) {
        setTopicTree(res.data);
      }
    } catch {
      message.error('获取专题体系失败');
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <Spin spinning={loading}>
        <TopicTreePanel
          topicTree={topicTree}
          selectedSubject={selectedSubject}
          subjectOptions={SUBJECT_OPTIONS}
          onSubjectChange={setSelectedSubject}
          onRefresh={fetchData}
        />
      </Spin>
    </PageContainer>
  );
};

export default TopicTagPage;
