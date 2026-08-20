import { getSystemSubjects } from '@/services/subjects';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import TagSystemTreePanel from './components/TagSystemTreePanel';

const KnowledgeTreePage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectOptions, setSubjectOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectLoadError, setSubjectLoadError] = useState(false);

  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    setSubjectLoadError(false);
    try {
      const response = await getSystemSubjects();
      if (!response.success) {
        throw new Error(response.message || '学科目录加载失败');
      }
      const options = [...response.data]
        .sort((left, right) => left.sort - right.sort)
        .map((subject) => ({ label: subject.name, value: subject.code }));
      setSubjectOptions(options);
      setSelectedSubject((current) =>
        current && options.some((option) => option.value === current)
          ? current
          : options.find((option) => option.value === 'math')?.value ||
            options[0]?.value ||
            '',
      );
    } catch {
      setSubjectLoadError(true);
      message.error('学科目录加载失败');
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  return (
    <PageContainer>
      <Spin spinning={loadingSubjects}>
        {subjectLoadError ? (
          <Alert
            type="error"
            showIcon
            message="学科目录加载失败"
            description="知识树未加载，请重新读取系统学科目录。"
            action={
              <Button onClick={() => void loadSubjects()}>重新加载</Button>
            }
          />
        ) : selectedSubject ? (
          <TagSystemTreePanel
            key={selectedSubject}
            targetType="knowledgeTree"
            structureOnly
            enableAttributeTags={false}
            searchPlaceholder="搜索知识树节点…"
            nodeNamePlaceholder="请输入知识树节点名称…"
            deleteTargetName="知识树节点"
            selectedSubject={selectedSubject}
            subjectOptions={subjectOptions}
            onSubjectChange={setSelectedSubject}
          />
        ) : null}
      </Spin>
    </PageContainer>
  );
};

export default KnowledgeTreePage;
