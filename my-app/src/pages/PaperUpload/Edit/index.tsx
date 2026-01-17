import { ArrowLeftOutlined } from '@ant-design/icons';
import { getParseResult, QuestionItem, submitPaper } from '@/services/paperUpload';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import { Button, Card, Col, Empty, message, Row, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import AttributePanel from './components/AttributePanel';
import QuestionCard from './components/QuestionCard';

const PaperEdit: React.FC = () => {
    const [searchParams] = useSearchParams();
    const taskId = searchParams.get('taskId');

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [metadata, setMetadata] = useState<any>(null);

    useEffect(() => {
        if (taskId) {
            loadData(taskId);
        }
    }, [taskId]);

    const loadData = async (id: string) => {
        try {
            const result = await getParseResult(id);
            if (result.success) {
                setQuestions(result.data.questions);
                setMetadata(result.data.metadata);
                if (result.data.questions.length > 0) {
                    setSelectedId(result.data.questions[0].id);
                }
            }
        } catch (error) {
            message.error('加载失败');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (id: string, values: Partial<QuestionItem>) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === id ? { ...q, ...values } : q))
        );
    };

    const handleSubmit = async () => {
        if (!taskId) return;
        const hide = message.loading('正在提交...');
        try {
            await submitPaper(taskId, questions);
            hide();
            message.success('入库成功');
            history.push('/question-bank/task'); // Redirect to task list or somewhere else
        } catch (error) {
            hide();
            message.error('提交失败');
        }
    };

    if (!taskId) {
        return <PageContainer><Empty description="参数错误" /></PageContainer>;
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
            {/* Header */}
            <div style={{
                height: 56,
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => history.back()}
                        style={{ fontSize: '16px' }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 500 }}>
                        {`校对：${metadata?.name || '未命名试卷'}`}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button key="save">保存草稿</Button>
                    <Button key="submit" type="primary" onClick={handleSubmit}>确认入库</Button>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
                <Spin spinning={loading} wrapperClassName="h-full">
                    <Row gutter={0} style={{ height: '100%' }}>
                        {/* Left: Source Preview */}
                        <Col span={6} style={{ height: '100%', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
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
                                原件预览
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', color: '#999' }}>
                                Word原件预览区域 (Mock)
                            </div>
                        </Col>

                        {/* Middle: Question List */}
                        <Col span={12} style={{ height: '100%', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
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
                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                                <div style={{ paddingBottom: 20 }}>
                                    {questions.map((q) => (
                                        <QuestionCard
                                            key={q.id}
                                            question={q}
                                            selected={selectedId === q.id}
                                            onClick={() => setSelectedId(q.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </Col>

                        {/* Right: Attribute Panel */}
                        <Col span={6} style={{ height: '100%', background: '#fff' }}>
                            <AttributePanel
                                question={questions.find((q) => q.id === selectedId) || null}
                                onUpdate={handleUpdate}
                            />
                        </Col>
                    </Row>
                </Spin>
            </div>

            <style>{`
                .ant-spin-nested-loading { height: 100%; }
                .ant-spin-container { height: 100%; }
                .question-stem img {
                    max-width: 90%;
                    max-height: 220px;
                    height: auto;
                    display: block;
                    object-fit: contain;
                    margin: 8px auto;
                }
                .question-stem img.question-img.inline {
                    max-width: none;
                    max-height: none;
                    height: 3em;
                    width: auto;
                    display: inline-block;
                    margin: 0 4px;
                    vertical-align: middle;
                }
                .option-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 6px 16px;
                    margin: 8px 0 12px;
                    font-size: 14px;
                }
                .option-item {
                    padding: 4px 0;
                    word-break: break-word;
                }
                @media (max-width: 1200px) {
                    .option-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #999;
                }
            `}</style>
        </div >
    );
};

export default PaperEdit;
