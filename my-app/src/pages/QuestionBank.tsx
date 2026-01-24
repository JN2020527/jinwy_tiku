import { PageContainer } from '@ant-design/pro-components';
import { Card, Result } from 'antd';
import React from 'react';

const Placeholder: React.FC = () => {
  return (
    <PageContainer>
      <Card>
        <Result
          status="404"
          title="功能开发中"
          subTitle="该页面尚未实现，请先查看【欢迎页】和【内容中心管理 -> 产品列表】。"
        />
      </Card>
    </PageContainer>
  );
};

export default Placeholder;
