import type {
  AttributeUsageRule,
  KnowledgeNode,
  NodeAttributeRelation,
  TagCategory,
} from '@/services/tagSystem';
import {
  getAttributeUsageRules,
  getKnowledgeTree,
  getNodeAttributeRelations,
  getTagCategories,
} from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
  const [nodeRelations, setNodeRelations] = useState<NodeAttributeRelation[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const fetchRequestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = (fetchRequestIdRef.current += 1);

    setLoading(true);
    try {
      const [treeRes, categoryRes, usageRuleRes, relationRes] =
        await Promise.all([
          getKnowledgeTree({
            subject: selectedSubject,
          }),
          getTagCategories(),
          getAttributeUsageRules(),
          getNodeAttributeRelations({
            targetType: 'topic',
            subject: selectedSubject,
          }),
        ]);

      if (fetchRequestIdRef.current !== requestId) {
        return;
      }

      if (treeRes.success) {
        setTopicTree(treeRes.data);
      }
      if (categoryRes.success) {
        setTagCategories(categoryRes.data);
      }
      if (usageRuleRes.success) {
        setUsageRules(usageRuleRes.data);
      }
      if (relationRes.success) {
        setNodeRelations(relationRes.data);
      }
    } catch {
      if (fetchRequestIdRef.current === requestId) {
        message.error('获取专题体系失败');
      }
    } finally {
      if (fetchRequestIdRef.current === requestId) {
        setLoading(false);
      }
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
          tagCategories={tagCategories}
          usageRules={usageRules}
          nodeRelations={nodeRelations}
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
