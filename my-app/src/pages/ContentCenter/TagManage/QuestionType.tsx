import type { QuestionTypeNode } from '@/services/tagSystem';
import { getQuestionTypeTree } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Select, Space, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import QuestionTypeTreePanel from './components/QuestionTypeTreePanel';

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

const QuestionTypeTagPage: React.FC = () => {
  const [questionTypeTree, setQuestionTypeTree] = useState<QuestionTypeNode[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQuestionTypeTree({
        subject: selectedSubject,
      });
      if (res.success) {
        setQuestionTypeTree(res.data);
      }
    } catch {
      message.error('获取题型失败');
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedSubjectLabel =
    SUBJECT_OPTIONS.find((item) => item.value === selectedSubject)?.label ||
    selectedSubject;

  return (
    <PageContainer>
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Space size="large" wrap>
          <Space>
            <span>学科：</span>
            <Select
              value={selectedSubject}
              onChange={setSelectedSubject}
              style={{ width: 120 }}
              options={SUBJECT_OPTIONS}
            />
          </Space>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <QuestionTypeTreePanel
          questionTypeTree={questionTypeTree}
          selectedSubject={selectedSubject}
          selectedSubjectLabel={selectedSubjectLabel}
          onRefresh={fetchData}
        />
      </Spin>
    </PageContainer>
  );
};

export default QuestionTypeTagPage;
