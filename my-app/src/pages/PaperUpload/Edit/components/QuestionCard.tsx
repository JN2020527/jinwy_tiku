import { QuestionItem } from '@/services/paperUpload';
import { Card, Tag, Typography } from 'antd';
import React from 'react';

interface QuestionCardProps {
    question: QuestionItem;
    selected: boolean;
    onClick: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selected, onClick }) => {
    return (
        <Card
            hoverable
            onClick={onClick}
            style={{
                marginBottom: 16,
                border: selected ? '2px solid #1890ff' : '1px solid #f0f0f0',
                cursor: 'pointer',
            }}
            size="small"
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                        <Tag color="blue">{question.type}</Tag>
                        <span style={{ fontWeight: 'bold' }}>第 {question.number} 题</span>
                    </span>
                    {question.difficulty && <Tag color="orange">{question.difficulty} 星</Tag>}
                </div>
            }
        >
            <div
                className="question-stem"
                dangerouslySetInnerHTML={{ __html: question.stem }}
                style={{ marginBottom: 12 }}
            />

            {question.options && (
                <div style={{ marginBottom: 12 }}>
                    {question.options.map((opt, idx) => (
                        <div key={idx}>{opt}</div>
                    ))}
                </div>
            )}

            <div style={{ background: '#f6f7f9', padding: 8, borderRadius: 4 }}>
                <Typography.Text strong>【答案】</Typography.Text>
                <span dangerouslySetInnerHTML={{ __html: question.answer }} />
            </div>

            {question.analysis && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                    <Typography.Text type="secondary">【解析】</Typography.Text>
                    <span dangerouslySetInnerHTML={{ __html: question.analysis }} />
                </div>
            )}

            {/* Render children questions if any (e.g. for Reading Comprehension) */}
            {question.children && question.children.length > 0 && (
                <div style={{ marginTop: 16, paddingLeft: 16, borderLeft: '2px solid #eee' }}>
                    {question.children.map((child) => (
                        <div key={child.id} style={{ marginBottom: 12 }}>
                            <div style={{ marginBottom: 4 }}>
                                <Tag>{child.number}</Tag> <Tag>{child.type}</Tag>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: child.stem }} />
                            <div style={{ marginTop: 4 }}>
                                <b>答案：</b>{child.answer}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default QuestionCard;
