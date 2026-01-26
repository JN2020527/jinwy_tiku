import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Row, Select } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history } from 'umi';
import FilterPanel from './components/FilterPanel';
import PaperList from './components/PaperList';
import PaperQuestionNav from './components/PaperQuestionNav';
import QuestionDetail from './components/QuestionDetail';
import QuestionList from './components/QuestionList';
import TaggingForm, { TaggingFormRef } from './components/TaggingForm';
import { mockQuestions, mockSubjects } from './mockData';
import type { Paper } from './types';
import { FilterParams, Question } from './types';
import './index.less';

const QuestionTagging: React.FC = () => {
  const taggingFormRef = useRef<TaggingFormRef>(null);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [filteredQuestions, setFilteredQuestions] =
    useState<Question[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Partial<FilterParams>>({
    subject: mockSubjects[0]?.value, // 默认选中第一个学科
    tagStatus: 'all',
    page: 1,
    pageSize: 15,
  });

  // 视图模式：试题列表 / 试卷列表
  const [viewMode, setViewMode] = useState<'question' | 'paper'>('question');
  const [currentPaperId, setCurrentPaperId] = useState<string>('');

  // 当前选中的学科
  const currentSubject = filters.subject || mockSubjects[0]?.value;

  // 从试题数据聚合试卷列表
  const papers = useMemo(() => {
    const paperMap = new Map<string, Paper>();
    questions.forEach((q) => {
      if (!q.paperId) return;
      if (!paperMap.has(q.paperId)) {
        paperMap.set(q.paperId, {
          id: q.paperId,
          name: q.paperName || '',
          subject: q.subject,
          questionCount: 0,
          taggedCount: 0,
        });
      }
      const paper = paperMap.get(q.paperId)!;
      paper.questionCount++;
      if (q.tagStatus === 'complete') paper.taggedCount++;
    });
    return Array.from(paperMap.values());
  }, [questions]);

  // 筛选后的试卷列表
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // 学科筛选
    if (filters.subject) {
      result = result.filter((p) => p.subject === filters.subject);
    }

    // 打标状态筛选
    if (filters.tagStatus && filters.tagStatus !== 'all') {
      result = result.filter((p) => {
        if (filters.tagStatus === 'complete') {
          return p.taggedCount === p.questionCount && p.questionCount > 0;
        } else if (filters.tagStatus === 'untagged') {
          return p.taggedCount === 0;
        } else if (filters.tagStatus === 'partial') {
          return p.taggedCount > 0 && p.taggedCount < p.questionCount;
        }
        return true;
      });
    }

    // 关键词搜索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(keyword));
    }

    return result;
  }, [papers, filters]);

  // 当前试卷的试题列表
  const paperQuestions = useMemo(() => {
    if (!currentPaperId) return [];
    return questions.filter((q) => q.paperId === currentPaperId);
  }, [questions, currentPaperId]);

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

    // 科目筛选（必选）
    if (filters.subject) {
      result = result.filter((q) => q.subject === filters.subject);
    }

    // 试卷筛选
    if (filters.paperId) {
      result = result.filter((q) => q.paperId === filters.paperId);
    }

    // 标签状态筛选
    if (filters.tagStatus && filters.tagStatus !== 'all') {
      result = result.filter((q) => q.tagStatus === filters.tagStatus);
    }

    // 关键词搜索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(
        (q) =>
          q.stem.toLowerCase().includes(keyword) ||
          q.answer?.toLowerCase().includes(keyword),
      );
    }

    setFilteredQuestions(result);

    // 切换学科时重置当前选中的试题
    if (result.length > 0) {
      setCurrentQuestionId(result[0].id);
    } else {
      setCurrentQuestionId('');
    }
  }, [filters, questions]);

  // 处理筛选条件变化
  const handleFilterChange = (newFilters: Partial<FilterParams>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
    // 清空选择
    setSelectedQuestionIds([]);
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
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, ...values };
          // 更新标签状态
          updated.tagStatus = getTagStatus(updated);
          return updated;
        }
        return q;
      }),
    );
  };

  // 批量更新试题
  const handleBatchUpdate = (ids: string[], values: Partial<Question>) => {
    if (ids.length === 0) {
      // 取消批量操作
      setSelectedQuestionIds([]);
      return;
    }

    setQuestions((prev) =>
      prev.map((q) => {
        if (ids.includes(q.id)) {
          const updated = { ...q, ...values };
          // 更新标签状态
          updated.tagStatus = getTagStatus(updated);
          return updated;
        }
        return q;
      }),
    );

    // 清空选择
    setSelectedQuestionIds([]);
  };

  // 计算标签状态
  const getTagStatus = (question: Question): Question['tagStatus'] => {
    const hasKnowledge =
      question.knowledgePoints && question.knowledgePoints.length > 0;
    const hasType = !!question.questionType;
    const hasDifficulty = !!question.difficulty;
    const hasChapters = question.chapters && question.chapters.length > 0;

    const tagCount = [hasKnowledge, hasType, hasDifficulty, hasChapters].filter(
      Boolean,
    ).length;

    if (tagCount === 0) return 'untagged';
    if (tagCount === 4) return 'complete';
    return 'partial';
  };

  // 上一题
  const handlePrevious = () => {
    const questionList = viewMode === 'paper' ? paperQuestions : filteredQuestions;
    const currentIndex = questionList.findIndex((q) => q.id === currentQuestionId);
    if (currentIndex > 0) {
      setCurrentQuestionId(questionList[currentIndex - 1].id);
      setSelectedQuestionIds([]);
    }
  };

  // 下一题
  const handleNext = () => {
    const questionList = viewMode === 'paper' ? paperQuestions : filteredQuestions;
    const currentIndex = questionList.findIndex((q) => q.id === currentQuestionId);
    if (currentIndex < questionList.length - 1) {
      setCurrentQuestionId(questionList[currentIndex + 1].id);
      setSelectedQuestionIds([]);
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
      // Ctrl+Enter 保存并下一题（通过 ref 调用表单验证）
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        taggingFormRef.current?.saveAndNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionId, filteredQuestions]);

  // 返回上一页
  const handleBack = () => {
    history.back();
  };

  // 分页
  const paginatedQuestions = filteredQuestions.slice(
    (filters.page! - 1) * filters.pageSize!,
    filters.page! * filters.pageSize!,
  );

  const currentQuestion =
    questions.find((q) => q.id === currentQuestionId) || null;
  const selectedQuestions = questions.filter((q) =>
    selectedQuestionIds.includes(q.id),
  );
  const currentIndex = filteredQuestions.findIndex(
    (q) => q.id === currentQuestionId,
  );

  return (
    <div
      style={{
        height: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginRight: 16 }}
        >
          返回
        </Button>
        <span style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>
          试题打标
        </span>
      </div>

      {/* 主内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Row style={{ height: '100%' }} gutter={0}>
          {/* 左侧栏：筛选面板 + 试题列表 */}
          <Col
            span={6}
            style={{
              height: '100%',
              borderRight: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                height: 50,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <Select
                value={viewMode}
                onChange={(value) => setViewMode(value)}
                bordered={false}
                className="titleSelect"
                style={{
                  width: '100%',
                }}
                options={[
                  { value: 'question', label: '试题列表' },
                  { value: 'paper', label: '试卷列表' },
                ]}
              />
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <FilterPanel mode={viewMode} onFilterChange={handleFilterChange} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {viewMode === 'question' ? (
                  <QuestionList
                    questions={paginatedQuestions}
                    allFilteredQuestions={filteredQuestions}
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
                      },
                    }}
                  />
                ) : (
                  <PaperList
                    papers={filteredPapers}
                    currentPaperId={currentPaperId}
                    onPaperClick={(paperId) => {
                      setCurrentPaperId(paperId);
                      // 选中试卷后，自动选中第一道题
                      const firstQuestion = questions.find((q) => q.paperId === paperId);
                      if (firstQuestion) {
                        setCurrentQuestionId(firstQuestion.id);
                        setSelectedQuestionIds([]);
                      }
                    }}
                    pagination={{
                      current: 1,
                      pageSize: 15,
                      total: filteredPapers.length,
                      onChange: () => {},
                    }}
                  />
                )}
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
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                height: 50,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 600,
                fontSize: '15px',
                color: '#333',
              }}
            >
              {isBatchMode
                ? `已选择 ${selectedQuestionIds.length} 道试题`
                : '试题详情'}
            </div>
            {viewMode === 'question' ? (
              <div className="hideScrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <PaperQuestionNav
                  questions={paperQuestions}
                  currentQuestionId={currentQuestionId}
                  selectedQuestionIds={selectedQuestionIds}
                  onQuestionClick={(id) => {
                    setCurrentQuestionId(id);
                    setSelectedQuestionIds([]);
                  }}
                  onSelectionChange={setSelectedQuestionIds}
                />
                <div className="hideScrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                  <QuestionDetail
                    question={currentQuestion}
                    selectedQuestions={selectedQuestions}
                    isBatchMode={isBatchMode}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    hasPrevious={paperQuestions.findIndex((q) => q.id === currentQuestionId) > 0}
                    hasNext={paperQuestions.findIndex((q) => q.id === currentQuestionId) < paperQuestions.length - 1}
                  />
                </div>
              </div>
            )}
          </Col>

          {/* 右侧栏：标签表单 */}
          <Col
            span={6}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                height: 50,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 600,
                fontSize: '15px',
                color: '#333',
              }}
            >
              {isBatchMode ? '批量打标' : '标签标注'}
            </div>
            <div className="hideScrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <TaggingForm
                ref={taggingFormRef}
                question={currentQuestion}
                selectedQuestions={selectedQuestions}
                isBatchMode={isBatchMode}
                subject={currentSubject}
                onUpdate={handleUpdate}
                onBatchUpdate={handleBatchUpdate}
                onSaveAndNext={handleSaveAndNext}
                onSkip={handleSkip}
              />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default QuestionTagging;
