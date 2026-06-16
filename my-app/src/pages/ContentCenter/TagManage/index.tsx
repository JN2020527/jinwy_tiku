import type {
  KnowledgeNode,
  QuestionTypeNode,
  TagCategory,
} from '@/services/tagSystem';
import {
  getKnowledgeTree,
  getQuestionTypeTree,
  getTagCategories,
} from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Select, Space, Spin, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import AttributeTagsPanel from './components/AttributeTagsPanel';
import KnowledgeTreePanel from './components/KnowledgeTreePanel';
import QuestionTypeTreePanel from './components/QuestionTypeTreePanel';

const TagManage: React.FC = () => {
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeNode[]>([]);
  const [questionTypeTree, setQuestionTypeTree] = useState<QuestionTypeNode[]>(
    [],
  );
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Global Filters State
  const [selectedStage, setSelectedStage] = useState<string>('junior');
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, qtRes, catRes] = await Promise.all([
        getKnowledgeTree(),
        getQuestionTypeTree(),
        getTagCategories(),
      ]);

      if (treeRes.success) {
        setKnowledgeTree(treeRes.data);
      }
      if (qtRes.success) {
        setQuestionTypeTree(qtRes.data);
      }
      if (catRes.success) {
        setTagCategories(catRes.data);
      }
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedStage, selectedSubject]);

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
            <span>学段：</span>
            <Select
              value={selectedStage}
              onChange={setSelectedStage}
              style={{ width: 120 }}
              options={[
                { label: '初中', value: 'junior' },
                { label: '高中', value: 'senior' },
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
          <Tabs
            items={[
              {
                label: '知识体系管理',
                key: 'knowledge-system',
                children: (
                  <KnowledgeTreePanel
                    knowledgeTree={knowledgeTree}
                    selectedStage={selectedStage}
                    selectedSubject={selectedSubject}
                    onRefresh={fetchData}
                  />
                ),
              },
              {
                label: '题型管理',
                key: 'questionType',
                children: (
                  <QuestionTypeTreePanel
                    questionTypeTree={questionTypeTree}
                    onRefresh={fetchData}
                  />
                ),
              },
              {
                label: '属性标签管理',
                key: 'attributes',
                children: (
                  <AttributeTagsPanel
                    tagCategories={tagCategories}
                    onRefresh={fetchData}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
};

export default TagManage;
