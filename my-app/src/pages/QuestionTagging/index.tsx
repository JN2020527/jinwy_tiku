import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Row } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history } from 'umi';
import FilterPanel from './components/FilterPanel';
import PaperList from './components/PaperList';
import PaperQuestionNav from './components/PaperQuestionNav';
import QuestionDetail from './components/QuestionDetail';
import TaggingForm, { TaggingFormRef } from './components/TaggingForm';
import { mockQuestions, mockSubjects } from './mockData';
import type { Paper } from './types';
import { FilterParams, Question } from './types';
import './index.less';

const QuestionTagging: React.FC = () => {
  const taggingFormRef = useRef<TaggingFormRef>(null);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Partial<FilterParams>>({
    subject: '', // 默认选中"全部"
    tagStatus: '全部',
    page: 1,
    pageSize: 15,
  });

  const [currentPaperId, setCurrentPaperId] = useState<string>('');

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
          year: q.year,
          region: q.region,
          source: q.source,
        });
      }
      const paper = paperMap.get(q.paperId)!;
      paper.questionCount++;
      if (q.tagStatus === '已打标') paper.taggedCount++;
    });
    return Array.from(paperMap.values());
  }, [questions]);

  // 当前选中的学科（用于标签表单）
  const currentSubject = useMemo(() => {
    if (currentPaperId && papers.length > 0) {
      const currentPaper = papers.find((p) => p.id === currentPaperId);
      return currentPaper?.subject || mockSubjects[0]?.value;
    }
    return mockSubjects[0]?.value;
  }, [currentPaperId, papers]);

  // 筛选后的试卷列表
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // 学科筛选（空字符串或undefined表示"全部"）
    if (filters.subject && filters.subject !== '') {
      result = result.filter((p) => p.subject === filters.subject);
    }

    // 打标状态筛选
    if (filters.tagStatus && filters.tagStatus !== '全部') {
      result = result.filter((p) => {
        if (filters.tagStatus === '已完成') {
          return p.taggedCount === p.questionCount && p.questionCount > 0;
        } else if (filters.tagStatus === '未完成') {
          return p.taggedCount === 0;
        } else if (filters.tagStatus === '部分完成') {
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

  // 初始化：默认选中第一个试卷和第一道题
  useEffect(() => {
    if (filteredPapers.length > 0 && !currentPaperId) {
      const firstPaper = filteredPapers[0];
      setCurrentPaperId(firstPaper.id);

      // 自动选中该试卷的第一道题
      const firstQuestion = questions.find((q) => q.paperId === firstPaper.id);
      if (firstQuestion) {
        setCurrentQuestionId(firstQuestion.id);
      }
    }
  }, [filteredPapers, currentPaperId, questions]);

  // 处理筛选条件变化
  const handleFilterChange = (newFilters: Partial<FilterParams>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
    // 清空选择
    setSelectedQuestionIds([]);
    // 重置当前试卷，触发重新选择第一个
    setCurrentPaperId('');
    setCurrentQuestionId('');
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

    if (tagCount === 0) return '未打标';
    if (tagCount === 4) return '已打标';
    return '部分打标';
  };

  // 上一题
  const handlePrevious = () => {
    const currentIndex = paperQuestions.findIndex((q) => q.id === currentQuestionId);
    if (currentIndex > 0) {
      setCurrentQuestionId(paperQuestions[currentIndex - 1].id);
      setSelectedQuestionIds([]);
    }
  };

  // 下一题
  const handleNext = () => {
    const currentIndex = paperQuestions.findIndex((q) => q.id === currentQuestionId);
    if (currentIndex < paperQuestions.length - 1) {
      setCurrentQuestionId(paperQuestions[currentIndex + 1].id);
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
      // Ctrl+Enter 保存并下一题（通过 ref 调用表单验证）
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        taggingFormRef.current?.saveAndNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionId, paperQuestions]);

  // 返回上一页
  const handleBack = () => {
    history.back();
  };

  const currentQuestion =
    questions.find((q) => q.id === currentQuestionId) || null;
  const selectedQuestions = questions.filter((q) =>
    selectedQuestionIds.includes(q.id),
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
          {/* 左侧栏：筛选面板 + 试卷列表 */}
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
                fontWeight: 600,
                fontSize: '15px',
                color: '#333',
              }}
            >
              试卷列表
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
                <FilterPanel mode="paper" onFilterChange={handleFilterChange} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
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
