import type { TagCategory } from '@/services/tagSystem';
import { getTagCategories } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Select, Space, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import './Attributes.less';
import AttributeTagsPanel from './components/AttributeTagsPanel';

const GRADE_OPTIONS = [
  { label: '七年级', value: 'grade-7' },
  { label: '八年级', value: 'grade-8' },
  { label: '九年级', value: 'grade-9' },
  { label: '高一', value: 'grade-10' },
  { label: '高二', value: 'grade-11' },
  { label: '高三', value: 'grade-12' },
];

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

const AttributeTagPage: React.FC = () => {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('grade-7');
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTagCategories({
        grade: selectedGrade,
        subject: selectedSubject,
      });
      if (res.success) {
        setTagCategories(res.data);
      }
    } catch {
      message.error('获取属性设置失败');
    } finally {
      setLoading(false);
    }
  }, [selectedGrade, selectedSubject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer className="attribute-tag-page">
      <div className="attribute-context-toolbar">
        <Space size={24} wrap>
          <Space>
            <span className="attribute-context-label">年级</span>
            <Select
              aria-label="选择年级"
              value={selectedGrade}
              onChange={setSelectedGrade}
              style={{ width: 120 }}
              options={GRADE_OPTIONS}
            />
          </Space>
          <Space>
            <span className="attribute-context-label">学科</span>
            <Select
              aria-label="选择学科"
              value={selectedSubject}
              onChange={setSelectedSubject}
              style={{ width: 120 }}
              options={SUBJECT_OPTIONS}
            />
          </Space>
        </Space>
      </div>

      <Spin spinning={loading}>
        <AttributeTagsPanel
          tagCategories={tagCategories}
          selectedGrade={selectedGrade}
          selectedSubject={selectedSubject}
          onRefresh={fetchData}
        />
      </Spin>
    </PageContainer>
  );
};

export default AttributeTagPage;
