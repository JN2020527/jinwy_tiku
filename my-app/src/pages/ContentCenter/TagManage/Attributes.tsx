import type { TagCategory } from '@/services/tagSystem';
import { getTagCategories } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import './Attributes.less';
import AttributeTagsPanel from './components/AttributeTagsPanel';

const AttributeTagPage: React.FC = () => {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const categoryRes = await getTagCategories();
      if (categoryRes.success) {
        setTagCategories(categoryRes.data);
      }
    } catch {
      message.error('获取属性设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer className="attribute-tag-page">
      <Spin spinning={loading}>
        <AttributeTagsPanel
          tagCategories={tagCategories}
          onRefresh={fetchData}
        />
      </Spin>
    </PageContainer>
  );
};

export default AttributeTagPage;
