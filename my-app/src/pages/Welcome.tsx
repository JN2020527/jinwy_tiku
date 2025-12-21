import { PageContainer } from '@ant-design/pro-components';
import { Card, Alert, Typography } from 'antd';
import React from 'react';

const Welcome: React.FC = () => {
    return (
        <PageContainer>
            <Card>
                <div style={{ marginBottom: 24 }}>
                    <Typography.Title level={4} style={{ marginBottom: 16 }}>
                        欢迎
                    </Typography.Title>
                    <Typography.Paragraph>
                        欢迎使用晋文源试卷管理系统业务系统后台。
                    </Typography.Paragraph>
                    <div
                        style={{
                            background: '#fafafa', // 浅灰色背景
                            padding: '16px',
                            borderRadius: '4px',
                            border: '1px solid #f0f0f0',
                            marginBottom: 24,
                        }}
                    >
                        当前主要支撑两个业务：试卷业务，660冲刺卷
                    </div>
                    <Alert
                        message="超管权限由客服部主管负责，需要相关权限，请联系客服部。"
                        type="error"
                        showIcon
                    />
                </div>
            </Card>
            <div
                style={{
                    textAlign: 'center',
                    marginTop: 48,
                    marginBottom: 24,
                    color: 'rgba(0, 0, 0, 0.45)',
                }}
            >
                Copyright © 2025 晋文源试卷管理系统
            </div>
        </PageContainer>
    );
};

export default Welcome;
