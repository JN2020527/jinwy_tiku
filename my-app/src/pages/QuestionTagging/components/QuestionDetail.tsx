import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Collapse, Empty, Tag } from 'antd';
import React from 'react';
import { Question } from '../types';

interface QuestionDetailProps {
  question: Question | null;
  selectedQuestions: Question[];
  isBatchMode: boolean;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

const QuestionDetail: React.FC<QuestionDetailProps> = ({
  question,
  selectedQuestions,
  isBatchMode,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}) => {
  // 批量模式：显示选中试题列表
  if (isBatchMode) {
    return (
      <div>
        <div
          style={{
            padding: '16px',
            background: '#e6f7ff',
            borderRadius: 4,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
            已选择 {selectedQuestions.length} 道试题
          </span>
        </div>

        <div style={{ marginBottom: 12, color: '#666', fontSize: 14 }}>
          请在右侧表单中设置批量标签
        </div>

        {/* 选中试题列表 */}
        <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
          {selectedQuestions.map((q) => (
            <div
              key={q.id}
              style={{
                padding: '12px',
                marginBottom: 8,
                border: '1px solid #f0f0f0',
                borderRadius: 4,
                background: '#fafafa',
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>第 {q.number} 题</span>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {q.type}
                </Tag>
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {q.stem.replace(/<[^>]*>/g, '').substring(0, 50)}...
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 单选模式：显示完整试题详情
  if (!question) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Empty description="请从左侧选择试题" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部信息 */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            第 {question.number} 题
          </span>
          {question.year && <Tag color="blue">{question.year}</Tag>}
          {question.region && <Tag color="green">{question.region}</Tag>}
          {question.source && <Tag color="orange">{question.source}</Tag>}
          {question.paperName && <Tag color="default">{question.paperName}</Tag>}
        </div>
      </div>

      {/* 题干 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
          题干：
        </div>
        <div
          style={{
            padding: '12px',
            background: '#fafafa',
            borderRadius: 4,
            lineHeight: '1.8',
          }}
          dangerouslySetInnerHTML={{ __html: question.stem }}
        />
      </div>

      {/* 答案和解析（可折叠） */}
      <Collapse
        items={[
          {
            key: 'answer',
            label: '答案',
            children: (
              <div
                dangerouslySetInnerHTML={{
                  __html: question.answer || '暂无答案',
                }}
              />
            ),
          },
          ...(question.analysis
            ? [
                {
                  key: 'analysis',
                  label: '解析',
                  children: (
                    <div
                      dangerouslySetInnerHTML={{ __html: question.analysis }}
                    />
                  ),
                },
              ]
            : []),
        ]}
        defaultActiveKey={
          question.analysis ? ['answer', 'analysis'] : ['answer']
        }
        style={{ marginBottom: 16 }}
      />

      {/* 底部导航 */}
      <div
        style={{
          height: 48,
          marginTop: 'auto',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          上一题
        </Button>

        <div style={{ fontSize: 12, color: '#999' }}>
          快捷键：← 上一题 | → 下一题 | ⌘+Enter 保存并下一题
        </div>

        <Button
          type="primary"
          icon={<RightOutlined />}
          onClick={onNext}
          disabled={!hasNext}
          iconPosition="end"
        >
          下一题
        </Button>
      </div>
    </div>
  );
};

export default QuestionDetail;
