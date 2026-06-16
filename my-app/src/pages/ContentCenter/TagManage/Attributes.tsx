import type { TagCategory } from '@/services/tagSystem';
import { getTagCategories } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import AttributeTagsPanel from './components/AttributeTagsPanel';

const AttributeTagPage: React.FC = () => {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTagCategories();
      if (res.success) {
        setTagCategories(res.data);
      }
    } catch {
      message.error('获取属性标签失败');
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
          <AttributeTagsPanel
            tagCategories={tagCategories}
            onRefresh={fetchData}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
};

export default AttributeTagPage;
