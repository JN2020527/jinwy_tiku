import { CheckOutlined, CloseOutlined, MinusOutlined } from '@ant-design/icons';
import { Checkbox, List, Pagination, Tag } from 'antd';
import React from 'react';
import { Question } from '../types';

interface QuestionListProps {
    questions: Question[];
    currentQuestionId: string;
    selectedQuestionIds: string[];
    onQuestionClick: (id: string) => void;
    onSelectionChange: (ids: string[]) => void;
    pagination: {
        current: number;
        pageSize: number;
        total: number;
        onChange: (page: number, pageSize: number) => void;
    };
}

const QuestionList: React.FC<QuestionListProps> = ({
    questions,
    currentQuestionId,
    selectedQuestionIds,
    onQuestionClick,
    onSelectionChange,
    pagination
}) => {
    // 全选/取消全选
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onSelectionChange(questions.map(q => q.id));
        } else {
            onSelectionChange([]);
        }
    };

    // 单个选择
    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedQuestionIds, id]);
        } else {
            onSelectionChange(selectedQuestionIds.filter(qid => qid !== id));
        }
    };

    // 获取标签状态图标
    const getTagStatusIcon = (status: Question['tagStatus']) => {
        switch (status) {
            case 'complete':
                return <CheckOutlined style={{ color: '#52c41a' }} />;
            case 'partial':
                return <MinusOutlined style={{ color: '#faad14' }} />;
            case 'untagged':
                return <CloseOutlined style={{ color: '#d9d9d9' }} />;
        }
    };

    // 截取题干前100字
    const truncateStem = (stem: string) => {
        const text = stem.replace(/<[^>]*>/g, ''); // 移除HTML标签
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
    };

    const allSelected = questions.length > 0 && selectedQuestionIds.length === questions.length;
    const someSelected = selectedQuestionIds.length > 0 && selectedQuestionIds.length < questions.length;

    return (
        <div>
            {/* 批量选择工具栏 */}
            {selectedQuestionIds.length > 0 && (
                <div style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: '#e6f7ff',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#1890ff', fontSize: 14 }}>
                        已选择 {selectedQuestionIds.length} 道试题
                    </span>
                    <a onClick={() => onSelectionChange([])} style={{ fontSize: 14 }}>
                        取消选择
                    </a>
                </div>
            )}

            {/* 全选复选框 */}
            <div style={{ marginBottom: 12, paddingLeft: 4 }}>
                <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                >
                    全选
                </Checkbox>
            </div>

            {/* 试题列表 */}
            <List
                dataSource={questions}
                renderItem={(question) => {
                    const isSelected = selectedQuestionIds.includes(question.id);
                    const isCurrent = currentQuestionId === question.id;

                    return (
                        <List.Item
                            key={question.id}
                            style={{
                                padding: '12px',
                                marginBottom: 8,
                                border: isCurrent ? '2px solid #1890ff' : '1px solid #f0f0f0',
                                borderRadius: 4,
                                background: isCurrent ? '#e6f7ff' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onClick={() => onQuestionClick(question.id)}
                        >
                            <div style={{ width: '100%' }}>
                                {/* 头部：复选框 + 题号 + 题型 + 状态 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 8
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleSelectOne(question.id, e.target.checked);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                                            第 {question.number} 题
                                        </span>
                                        <Tag color="blue" style={{ margin: 0 }}>
                                            {question.type}
                                        </Tag>
                                    </div>
                                    {getTagStatusIcon(question.tagStatus)}
                                </div>

                                {/* 题干缩略 */}
                                <div style={{
                                    fontSize: 13,
                                    color: '#666',
                                    lineHeight: '1.6',
                                    marginBottom: 8
                                }}>
                                    {truncateStem(question.stem)}
                                </div>

                                {/* 已有标签预览 */}
                                {(question.knowledgePoints || question.difficulty || question.chapters) && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {question.difficulty && (
                                            <Tag size="small" color={
                                                question.difficulty === 'easy' ? 'green' :
                                                    question.difficulty === 'medium' ? 'orange' : 'red'
                                            }>
                                                {question.difficulty === 'easy' ? '简单' :
                                                    question.difficulty === 'medium' ? '中等' : '困难'}
                                            </Tag>
                                        )}
                                        {question.knowledgePoints?.map(kp => (
                                            <Tag key={kp} size="small">{kp}</Tag>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </List.Item>
                    );
                }}
            />

            {/* 分页 */}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={pagination.onChange}
                    showSizeChanger
                    showTotal={(total) => `共 ${total} 道试题`}
                    size="small"
                />
            </div>
        </div>
    );
};

export default QuestionList;
