import { PageContainer } from '@ant-design/pro-components';
import { Card, Select, Space } from 'antd';
import React, { useState } from 'react';
import KnowledgeTreePanel from './components/KnowledgeTreePanel';

const KnowledgeTagPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('math');

  return (
    <PageContainer>
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Space size="large">
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

      <Card>
        <KnowledgeTreePanel selectedSubject={selectedSubject} />
      </Card>
    </PageContainer>
  );
};

export default KnowledgeTagPage;
