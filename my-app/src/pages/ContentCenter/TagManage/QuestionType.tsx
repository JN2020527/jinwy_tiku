import type { QuestionTypeNode } from '@/services/tagSystem';
import { getQuestionTypeTree } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import QuestionTypeTreePanel from './components/QuestionTypeTreePanel';

const QuestionTypeTagPage: React.FC = () => {
  const [questionTypeTree, setQuestionTypeTree] = useState<QuestionTypeNode[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQuestionTypeTree();
      if (res.success) {
        setQuestionTypeTree(res.data);
      }
    } catch {
      message.error('获取题型失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <Spin spinning={loading}>
        <Card>
          <QuestionTypeTreePanel
            questionTypeTree={questionTypeTree}
            onRefresh={fetchData}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
};

export default QuestionTypeTagPage;
