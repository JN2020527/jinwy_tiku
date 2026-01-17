import { QuestionItem } from '@/services/paperUpload';
import { Card, Tag, Typography } from 'antd';
import React from 'react';
import { parseStem, ParsedStem } from '@/utils/parseStem';

interface QuestionCardProps {
    question: QuestionItem;
    selected: boolean;
    onClick: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selected, onClick }) => {
    const parsed = parseStem(question.stem);

    const infoBoxStyle = {
        background: 'rgb(246, 247, 249)',
        padding: '12px',
        borderRadius: '4px',
        marginTop: '12px',
    };

    const renderSubQuestion = (child: QuestionItem, index: number) => {
        const childParsed = parseStem(child.stem || '');
        const subNumber = index + 1;

        return (
            <div key={child.id} style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                {/* 子题题干 */}
                {childParsed.cleanStem && (
                    <div
                        style={{ marginBottom: 8, fontSize: '14px', fontWeight: 500 }}
                        dangerouslySetInnerHTML={{ __html: `${subNumber}. ${childParsed.cleanStem}` }}
                    />
                )}

                {/* 子题选项 */}
                {child.options && child.options.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {child.options.map((opt, idx) => (
                            <div key={idx} style={{ padding: '4px 0', fontSize: '14px' }}>
                                {opt}
                            </div>
                        ))}
                    </div>
                )}

                {/* 子题信息框 */}
                <div style={{
                    background: 'rgb(246, 247, 249)',
                    padding: '12px',
                    borderRadius: '4px',
                    marginTop: 12
                }}>
                    {/* 答案 */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            【答案】
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: child.answer || '' }} />
                    </div>

                    {/* 难度 */}
                    {child.difficulty && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                【难度】
                            </div>
                            <div>{child.difficulty} 星</div>
                        </div>
                    )}

                    {/* 知识点 */}
                    {child.knowledgePoints && child.knowledgePoints.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                【知识点】
                            </div>
                            <div>{child.knowledgePoints.join('、')}</div>
                        </div>
                    )}

                    {/* 解析 */}
                    {child.analysis && (
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                【解析】
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: child.analysis }} />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderInfoItem = (label: string, content: string | undefined) => {
        if (!content) return null;
        return (
            <div style={{ marginBottom: 8 }}>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>
                    {label}
                </div>
                <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        );
    };

    const isMaterialQuestion = question.children && question.children.length > 0;

    return (
        <Card
            onClick={onClick}
            style={{
                marginBottom: 16,
                border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
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
            {isMaterialQuestion ? (
                <>
                    {/* 材料内容 */}
                    <div style={{ marginBottom: 16 }}>
                        <div
                            className="question-stem"
                            dangerouslySetInnerHTML={{ __html: parsed.cleanStem }}
                            style={{ marginBottom: 16, fontSize: '14px', lineHeight: '1.6' }}
                        />
                    </div>

                    {/* 子题列表（每个子题下方显示其答案、难度、知识点、解析） */}
                    {question.children && (
                        <div style={{ paddingLeft: 16 }}>
                            {question.children.map((child, index) => renderSubQuestion(child, index))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div
                        className="question-stem"
                        dangerouslySetInnerHTML={{ __html: parsed.cleanStem }}
                        style={{ marginBottom: 12, fontSize: '14px', lineHeight: '1.6' }}
                    />

                    {question.options && (
                        <div style={{ marginBottom: 12 }}>
                            {question.options.map((opt, idx) => (
                                <div key={idx} style={{ padding: '4px 0', fontSize: '14px' }}>
                                    {opt}
                                </div>
                            ))}
                        </div>
                    )}

                    {parsed.answer || parsed.difficulty || parsed.knowledgePoints || parsed.detailed || parsed.analysis ? (
                        <div style={infoBoxStyle}>
                            {renderInfoItem('【答案】', parsed.answer)}
                            {renderInfoItem('【难度】', parsed.difficulty?.toString())}
                            {renderInfoItem('【知识点】', parsed.knowledgePoints?.join(', '))}
                            {renderInfoItem('【详解】', parsed.detailed)}
                            {renderInfoItem('【解析】', parsed.analysis)}
                        </div>
                    ) : null}
                </>
            )}
        </Card>
    );
};

export default QuestionCard;
