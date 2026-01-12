import { batchTagQuestions, deleteQuestion, getQuestions, Question } from '@/services/questionEntry';
import { PlusOutlined, TagOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { ActionType, ProList } from '@ant-design/pro-components';
import { Button, message, Modal, Space, Tag, Typography, Divider, Card } from 'antd';
import React, { useRef, useState } from 'react';
import { history } from '@umijs/max';

const { Text } = Typography;

const QuestionList: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewQuestion, setPreviewQuestion] = useState<Question>();

    const handleBatchTag = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请先选择试题');
            return;
        }
        await batchTagQuestions({ ids: selectedRowKeys as number[], tags: ['MockTag'] });
        message.success('批量打标成功');
        setSelectedRowKeys([]);
        actionRef.current?.reload();
    };

    const renderQuestionCard = (record: Question) => {
        return (
            <Card
                bordered={true}
                size="small"
                style={{ marginBottom: 16, borderColor: '#e8e8e8' }}
                bodyStyle={{ padding: 0 }}
            >
                {/* Header: Metadata */}
                <div style={{
                    backgroundColor: '#f5f7fa',
                    padding: '8px 16px',
                    borderBottom: '1px solid #e8e8e8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    <Space split={<Divider type="vertical" />}>
                        {record.paperId ? (
                            <span style={{ color: '#1890ff', cursor: 'pointer' }}>
                                <FileTextOutlined style={{ marginRight: 4 }} />
                                来源试卷
                            </span>
                        ) : <span>单题录入</span>}
                        <Tag color="blue">{record.type}</Tag>
                        <Tag color={record.difficulty === '简单' ? 'success' : record.difficulty === '中等' ? 'warning' : 'error'}>
                            {record.difficulty}
                        </Tag>
                        <span>学科：{record.subject}</span>
                        <span>年级：{record.grade}</span>
                    </Space>
                    <Space>
                        {record.status === 'tagged' ? <Tag color="green">已打标</Tag> : <Tag>未打标</Tag>}
                        <span>ID: {record.id}</span>
                    </Space>
                </div>

                {/* Body: Content */}
                <div style={{ padding: '16px 24px' }}>
                    <div
                        style={{ fontSize: '15px', lineHeight: '1.6', color: '#333', marginBottom: 12 }}
                        dangerouslySetInnerHTML={{ __html: record.content }}
                    />

                    {record.options && record.options.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            {record.options.map((opt, idx) => (
                                <div key={idx} style={{ display: 'flex', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 'bold', marginRight: 8, minWidth: 20 }}>
                                        {String.fromCharCode(65 + idx)}.
                                    </span>
                                    <div>{opt}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer: Actions */}
                <div style={{
                    padding: '8px 16px',
                    borderTop: '1px solid #e8e8e8',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#fff'
                }}>
                    <Space size="large">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => {
                                setPreviewQuestion(record);
                                setPreviewVisible(true);
                            }}
                        >
                            查看解析
                        </Button>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => history.push(`/question-bank/entry/single?id=${record.id}`)}
                        >
                            纠错/编辑
                        </Button>
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={async () => {
                                await deleteQuestion(record.id!);
                                message.success('删除成功');
                                actionRef.current?.reload();
                            }}
                        >
                            删除
                        </Button>
                    </Space>
                </div>
            </Card>
        );
    };

    return (
        <>
            <ProList<Question>
                headerTitle="试题列表"
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 80,
                }}
                toolBarRender={() => [
                    <Button
                        key="button"
                        icon={<PlusOutlined />}
                        onClick={() => history.push('/question-bank/entry/single')}
                        type="primary"
                    >
                        新建试题
                    </Button>,
                    <Button
                        key="batch-tag"
                        icon={<TagOutlined />}
                        onClick={handleBatchTag}
                        disabled={selectedRowKeys.length === 0}
                    >
                        批量打标
                    </Button>,
                ]}
                request={getQuestions}
                pagination={{
                    pageSize: 10,
                }}
                grid={{ gutter: 16, column: 1 }}
                renderItem={(item) => renderQuestionCard(item)}
                metas={{
                    title: { dataIndex: 'content', search: false }, // Hidden but needed for type safety usually
                    description: { search: false },
                    content: { search: false },
                    // Define search fields here, they won't be rendered in the card but will appear in the filter form
                    type: {
                        title: '题型',
                        valueType: 'select',
                        valueEnum: {
                            '单选题': { text: '单选题' },
                            '多选题': { text: '多选题' },
                            '简答题': { text: '简答题' },
                        }
                    },
                    subject: {
                        title: '学科',
                        valueType: 'select',
                        valueEnum: {
                            '数学': { text: '数学' },
                            '语文': { text: '语文' },
                            '英语': { text: '英语' },
                            '物理': { text: '物理' },
                            '化学': { text: '化学' },
                            '生物': { text: '生物' },
                            '历史': { text: '历史' },
                            '地理': { text: '地理' },
                            '政治': { text: '政治' },
                        }
                    },
                    difficulty: {
                        title: '难度',
                        valueType: 'select',
                        valueEnum: {
                            '简单': { text: '简单' },
                            '中等': { text: '中等' },
                            '困难': { text: '困难' },
                        }
                    }
                }}
                rowSelection={{
                    onChange: (selectedRowKeys) => setSelectedRowKeys(selectedRowKeys),
                }}
                tableAlertRender={({ selectedRowKeys, onCleanSelected }) => (
                    <Space size={24}>
                        <span>
                            已选 {selectedRowKeys.length} 项
                            <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
                                取消选择
                            </a>
                        </span>
                    </Space>
                )}
            />
            <Modal
                title="试题详情"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={800}
            >
                {previewQuestion && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <Tag color="blue">{previewQuestion.type}</Tag>
                            <Tag color={previewQuestion.difficulty === '简单' ? 'green' : 'orange'}>{previewQuestion.difficulty}</Tag>
                        </div>

                        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: previewQuestion.content }} />

                        {previewQuestion.options && (
                            <div style={{ marginBottom: 24 }}>
                                {previewQuestion.options.map((opt, index) => (
                                    <div key={index} style={{ padding: '8px 0', fontSize: 15 }}>
                                        <span style={{ fontWeight: 'bold', marginRight: 8 }}>{String.fromCharCode(65 + index)}.</span>
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}

                        <Divider orientation="left" plain>答案与解析</Divider>
                        <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
                            <div style={{ marginBottom: 12 }}>
                                <Text strong style={{ color: '#1890ff' }}>【答案】</Text>
                                <span style={{ marginLeft: 8 }}>{previewQuestion.answer}</span>
                            </div>
                            <div>
                                <Text strong style={{ color: '#1890ff' }}>【解析】</Text>
                                <div style={{ marginTop: 8, lineHeight: 1.6 }}>{previewQuestion.analysis}</div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default QuestionList;
