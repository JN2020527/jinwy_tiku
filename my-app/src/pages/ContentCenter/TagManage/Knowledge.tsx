import type { KnowledgeNode } from '@/services/tagSystem';
import { getKnowledgeTree } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Select, Space, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import KnowledgeTreePanel from './components/KnowledgeTreePanel';

const KnowledgeTagPage: React.FC = () => {
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('grade-7');
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getKnowledgeTree({
        grade: selectedGrade,
        subject: selectedSubject,
      });
      if (res.success) {
        setKnowledgeTree(res.data);
      }
    } catch {
      message.error('获取知识体系失败');
    } finally {
      setLoading(false);
    }
  }, [selectedGrade, selectedSubject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Space size="large">
          <Space>
            <span>年级：</span>
            <Select
              value={selectedGrade}
              onChange={setSelectedGrade}
              style={{ width: 120 }}
              options={[
                { label: '七年级', value: 'grade-7' },
                { label: '八年级', value: 'grade-8' },
                { label: '九年级', value: 'grade-9' },
                { label: '高一', value: 'grade-10' },
                { label: '高二', value: 'grade-11' },
                { label: '高三', value: 'grade-12' },
              ]}
            />
          </Space>
          <Space>
            <span>学科：</span>
            <Select
              value={selectedSubject}
              onChange={setSelectedSubject}
              style={{ width: 120 }}
              options={[
                { label: '语文', value: 'chinese' },
                { label: '数学', value: 'math' },
                { label: '英语', value: 'english' },
                { label: '物理', value: 'physics' },
                { label: '化学', value: 'chemistry' },
                { label: '生物', value: 'biology' },
                { label: '历史', value: 'history' },
                { label: '地理', value: 'geography' },
                { label: '道德与法治', value: 'politics' },
              ]}
            />
          </Space>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card>
          <KnowledgeTreePanel
            knowledgeTree={knowledgeTree}
            selectedGrade={selectedGrade}
            selectedSubject={selectedSubject}
            onRefresh={fetchData}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
};

export default KnowledgeTagPage;
