import { PageContainer } from '@ant-design/pro-components';
import { Col, Row } from 'antd';
import React, { useEffect, useState } from 'react';
import FilterPanel from './components/FilterPanel';
import QuestionDetail from './components/QuestionDetail';
import QuestionList from './components/QuestionList';
import TaggingForm from './components/TaggingForm';
import { mockQuestions } from './mockData';
import { FilterParams, Question } from './types';

const QuestionTagging: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>(mockQuestions);
    const [filteredQuestions, setFilteredQuestions] = useState<Question[]>(mockQuestions);
    const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [filters, setFilters] = useState<Partial<FilterParams>>({
        tagStatus: 'all',
        page: 1,
        pageSize: 15
    });

    // 判断是否为批量模式
    const isBatchMode = selectedQuestionIds.length > 1;

    // 初始化：选中第一道试题
    useEffect(() => {
        if (filteredQuestions.length > 0 && !currentQuestionId) {
            setCurrentQuestionId(filteredQuestions[0].id);
        }
    }, [filteredQuestions, currentQuestionId]);

    // 筛选逻辑
    useEffect(() => {
        let result = [...questions];

        // 科目筛选
        if (filters.subject) {
            result = result.filter(q => q.subject === filters.subject);
        }

        // 试卷筛选
        if (filters.paperId) {
            result = result.filter(q => q.paperId === filters.paperId);
        }

        // 标签状态筛选
        if (filters.tagStatus && filters.tagStatus !== 'all') {
            result = result.filter(q => q.tagStatus === filters.tagStatus);
        }

        // 关键词搜索
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            result = result.filter(q =>
                q.stem.toLowerCase().includes(keyword) ||
                q.answer?.toLowerCase().includes(keyword)
            );
        }

        setFilteredQuestions(result);
    }, [filters, questions]);

    // 处理筛选条件变化
    const handleFilterChange = (newFilters: Partial<FilterParams>) => {
        setFilters({ ...filters, ...newFilters, page: 1 });
        // 清空选择
        setSelectedQuestionIds([]);
        // 选中第一道试题
        if (filteredQuestions.length > 0) {
            setCurrentQuestionId(filteredQuestions[0].id);
        }
    };

    // 处理试题点击
    const handleQuestionClick = (id: string) => {
        setCurrentQuestionId(id);
        // 单选模式：清空批量选择
        if (selectedQuestionIds.length <= 1) {
            setSelectedQuestionIds([]);
        }
    };

    // 处理批量选择
    const handleSelectionChange = (ids: string[]) => {
        setSelectedQuestionIds(ids);
        // 如果只选中一个，设置为当前试题
        if (ids.length === 1) {
            setCurrentQuestionId(ids[0]);
        }
    };

    // 更新单个试题
    const handleUpdate = (id: string, values: Partial<Question>) => {
        setQuestions(prev =>
            prev.map(q => {
                if (q.id === id) {
                    const updated = { ...q, ...values };
                    // 更新标签状态
                    updated.tagStatus = getTagStatus(updated);
                    return updated;
                }
                return q;
            })
        );
    };

    // 批量更新试题
    const handleBatchUpdate = (ids: string[], values: Partial<Question>) => {
        if (ids.length === 0) {
            // 取消批量操作
            setSelectedQuestionIds([]);
            return;
        }

        setQuestions(prev =>
            prev.map(q => {
                if (ids.includes(q.id)) {
                    const updated = { ...q, ...values };
                    // 更新标签状态
                    updated.tagStatus = getTagStatus(updated);
                    return updated;
                }
                return q;
            })
        );

        // 清空选择
        setSelectedQuestionIds([]);
    };

    // 计算标签状态
    const getTagStatus = (question: Question): Question['tagStatus'] => {
        const hasKnowledge = question.knowledgePoints && question.knowledgePoints.length > 0;
        const hasType = !!question.questionType;
        const hasDifficulty = !!question.difficulty;
        const hasChapters = question.chapters && question.chapters.length > 0;

        const tagCount = [hasKnowledge, hasType, hasDifficulty, hasChapters].filter(Boolean).length;

        if (tagCount === 0) return 'untagged';
        if (tagCount === 4) return 'complete';
        return 'partial';
    };

    // 上一题
    const handlePrevious = () => {
        const currentIndex = filteredQuestions.findIndex(q => q.id === currentQuestionId);
        if (currentIndex > 0) {
            setCurrentQuestionId(filteredQuestions[currentIndex - 1].id);
        }
    };

    // 下一题
    const handleNext = () => {
        const currentIndex = filteredQuestions.findIndex(q => q.id === currentQuestionId);
        if (currentIndex < filteredQuestions.length - 1) {
            setCurrentQuestionId(filteredQuestions[currentIndex + 1].id);
        }
    };

    // 保存并下一题
    const handleSaveAndNext = () => {
        handleNext();
    };

    // 跳过
    const handleSkip = () => {
        handleNext();
    };

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 上下键切换试题
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                handlePrevious();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                handleNext();
            }
            // 左右键导航
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevious();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }
            // Cmd+Enter 保存并下一题
            else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveAndNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestionId, filteredQuestions]);

    // 分页
    const paginatedQuestions = filteredQuestions.slice(
        (filters.page! - 1) * filters.pageSize!,
        filters.page! * filters.pageSize!
    );

    const currentQuestion = questions.find(q => q.id === currentQuestionId) || null;
    const selectedQuestions = questions.filter(q => selectedQuestionIds.includes(q.id));
    const currentIndex = filteredQuestions.findIndex(q => q.id === currentQuestionId);

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
                            <FilterPanel onFilterChange={handleFilterChange} />
                            <QuestionList
                                questions={paginatedQuestions}
                                currentQuestionId={currentQuestionId}
                                selectedQuestionIds={selectedQuestionIds}
                                onQuestionClick={handleQuestionClick}
                                onSelectionChange={handleSelectionChange}
                                pagination={{
                                    current: filters.page!,
                                    pageSize: filters.pageSize!,
                                    total: filteredQuestions.length,
                                    onChange: (page, pageSize) => {
                                        setFilters({ ...filters, page, pageSize });
                                    }
                                }}
                            />
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
                            <QuestionDetail
                                question={currentQuestion}
                                selectedQuestions={selectedQuestions}
                                isBatchMode={isBatchMode}
                                onPrevious={handlePrevious}
                                onNext={handleNext}
                                hasPrevious={currentIndex > 0}
                                hasNext={currentIndex < filteredQuestions.length - 1}
                            />
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
                            <TaggingForm
                                question={currentQuestion}
                                selectedQuestions={selectedQuestions}
                                isBatchMode={isBatchMode}
                                onUpdate={handleUpdate}
                                onBatchUpdate={handleBatchUpdate}
                                onSaveAndNext={handleSaveAndNext}
                                onSkip={handleSkip}
                            />
                        </div>
                    </Col>
                </Row>
            </div>
        </PageContainer>
    );
};

export default QuestionTagging;
