import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Checkbox, List, Pagination, Tag } from 'antd';
import React from 'react';
import { Question } from '../types';
import './QuestionList.less';

interface QuestionListProps {
  questions: Question[];
  allFilteredQuestions: Question[]; // 筛选后的全部试题（用于统计）
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
  allFilteredQuestions,
  currentQuestionId,
  selectedQuestionIds,
  onQuestionClick,
  onSelectionChange,
  pagination,
}) => {
  // 计算统计数据
  const stats = React.useMemo(() => {
    const total = allFilteredQuestions.length;
    const complete = allFilteredQuestions.filter(
      (q) => q.tagStatus === 'complete',
    ).length;
    const untagged = total - complete;
    return { total, complete, untagged };
  }, [allFilteredQuestions]);

  // 计算每个试卷的统计信息
  const paperStats = React.useMemo(() => {
    const statsMap = new Map<string, { total: number; tagged: number; untagged: number }>();
    allFilteredQuestions.forEach((q) => {
      if (!q.paperId) return;
      if (!statsMap.has(q.paperId)) {
        statsMap.set(q.paperId, { total: 0, tagged: 0, untagged: 0 });
      }
      const stat = statsMap.get(q.paperId)!;
      stat.total++;
      if (q.tagStatus === 'complete') {
        stat.tagged++;
      } else {
        stat.untagged++;
      }
    });
    return statsMap;
  }, [allFilteredQuestions]);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(questions.map((q) => q.id));
    } else {
      onSelectionChange([]);
    }
  };

  // 单个选择
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedQuestionIds, id]);
    } else {
      onSelectionChange(selectedQuestionIds.filter((qid) => qid !== id));
    }
  };

  // 获取标签状态标签
  const getTagStatusTag = (status: Question['tagStatus']) => {
    if (status === 'complete') {
      return (
        <Tag
          color="#f6ffed"
          style={{
            color: '#52c41a',
            border: '1px solid #b7eb8f',
            margin: 0,
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <CheckOutlined style={{ marginRight: 4, fontSize: 10 }} />
          已打标
        </Tag>
      );
    }
    return (
      <Tag
        color="#fafafa"
        style={{
          color: '#999',
          border: '1px solid #d9d9d9',
          margin: 0,
          fontSize: 12,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <CloseOutlined
          style={{ marginRight: 4, fontSize: 10, color: '#666' }}
        />
        未打标
      </Tag>
    );
  };

  // 截取题干前100字
  const truncateStem = (stem: string) => {
    const text = stem.replace(/<[^>]*>/g, ''); // 移除HTML标签
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  const allSelected =
    questions.length > 0 && selectedQuestionIds.length === questions.length;
  const someSelected =
    selectedQuestionIds.length > 0 &&
    selectedQuestionIds.length < questions.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 全选复选框 + 数据汇总统计 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            全选
          </Checkbox>
          {selectedQuestionIds.length > 0 && (
            <a onClick={() => onSelectionChange([])} style={{ fontSize: 13 }}>
              取消 ({selectedQuestionIds.length})
            </a>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: '#666',
          }}
        >
          <span>
            共 <b style={{ color: '#333' }}>{stats.total}</b> 题
          </span>
          <span>
            <CheckOutlined style={{ color: '#52c41a', marginRight: 4 }} />
            {stats.complete}
          </span>
          <span>
            <CloseOutlined style={{ color: '#d9d9d9', marginRight: 4 }} />
            {stats.untagged}
          </span>
        </div>
      </div>

      {/* 试题列表 - 可滚动区域 */}
      <div
        className="questionListScroll"
        style={{ flex: 1, overflowY: 'auto', paddingTop: 12 }}
      >
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
                  transition: 'all 0.3s',
                }}
                onClick={() => onQuestionClick(question.id)}
              >
                <div style={{ width: '100%' }}>
                  {/* 头部：复选框 + 题号 + 题型 + 状态 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
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
                      {question.questionType && (
                        <Tag color="blue" style={{ margin: 0 }}>
                          {question.questionType}
                        </Tag>
                      )}
                    </div>
                    {getTagStatusTag(question.tagStatus)}
                  </div>

                  {/* 题干缩略 */}
                  <div
                    style={{
                      fontSize: 13,
                      color: '#666',
                      lineHeight: '1.6',
                      marginBottom: 6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {truncateStem(question.stem)}
                  </div>

                  {/* 底部信息：试卷名称 + 统计 */}
                  {question.paperName && question.paperId && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {question.paperName}
                      </span>
                      {paperStats.has(question.paperId) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: '#999',
                          }}
                        >
                          <span>
                            共 {paperStats.get(question.paperId)!.total}
                          </span>
                          <span style={{ color: '#52c41a' }}>
                            <CheckOutlined style={{ marginRight: 2 }} />
                            {paperStats.get(question.paperId)!.tagged}
                          </span>
                          <span style={{ color: '#d9d9d9' }}>
                            <CloseOutlined style={{ marginRight: 2 }} />
                            {paperStats.get(question.paperId)!.untagged}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      </div>

      {/* 分页 - 固定底部 */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
          showSizeChanger
          size="small"
        />
      </div>
    </div>
  );
};

export default QuestionList;
