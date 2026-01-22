import { PageContainer } from '@ant-design/pro-components';
import { Col, Row } from 'antd';
import React, { useState } from 'react';

const QuestionTagging: React.FC = () => {
    const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

    // 判断是否为批量模式
    const isBatchMode = selectedQuestionIds.length > 1;

    return (
        <PageContainer title="试题打标">
            <div style={{ height: 'calc(100vh - 200px)', background: '#fff' }}>
                <Row style={{ height: '100%' }} gutter={0}>
                    {/* 左侧栏：筛选面板 + 试题列表 */}
                    <Col
                        span={6}
                        style={{
                            height: '100%',
                            borderRight: '1px solid #f0f0f0',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 16px',
                            background: '#fafafa',
                            borderBottom: '1px solid #f0f0f0',
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#333'
                        }}>
                            试题列表
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {/* 筛选面板组件将放在这里 */}
                            <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                                筛选面板 (待实现)
                            </div>

                            {/* 试题列表组件将放在这里 */}
                            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                                试题列表 (待实现)
                            </div>
                        </div>
                    </Col>

                    {/* 中间栏：试题详情 */}
                    <Col
                        span={12}
                        style={{
                            height: '100%',
                            borderRight: '1px solid #f0f0f0',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 16px',
                            background: '#fafafa',
                            borderBottom: '1px solid #f0f0f0',
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#333'
                        }}>
                            {isBatchMode ? `已选择 ${selectedQuestionIds.length} 道试题` : '试题详情'}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {/* 试题详情组件将放在这里 */}
                            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                                试题详情 (待实现)
                            </div>
                        </div>
                    </Col>

                    {/* 右侧栏：标签表单 */}
                    <Col
                        span={6}
                        style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 16px',
                            background: '#fafafa',
                            borderBottom: '1px solid #f0f0f0',
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#333'
                        }}>
                            {isBatchMode ? '批量打标' : '标签标注'}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {/* 标签表单组件将放在这里 */}
                            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                                标签表单 (待实现)
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </PageContainer>
    );
};

export default QuestionTagging;
