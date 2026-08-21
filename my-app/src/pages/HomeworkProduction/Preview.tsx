import type {
  HomeworkDetail,
  PublishedQuestion,
} from '@/services/resourceAssets';
import {
  ASSET_STATUS_LABELS,
  getAssetDetail,
  getHomeworkQuestions,
} from '@/services/resourceAssets';
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';
import { getDifficultyLabel } from './filtering';

interface PreviewProps {
  homeworkId: string;
  subject: string;
}

type HomeworkQuestionEntry = {
  questionId: string;
  question?: PublishedQuestion;
};

const getSubjectLabel = (subject: string) =>
  SUBJECT_OPTIONS.find((option) => option.value === subject)?.label || subject;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const formatDate = (value: string) =>
  DATE_TIME_FORMATTER.format(new Date(value)).replaceAll('/', '-');

/**
 * 作业只读预览：连续成品文档式排版，不提供保存/排序等修改能力（AC-11）。
 * 试题内容按试题 ID 动态读取当前内容，预览时即最新版本（AC-19）。
 */
const Preview: React.FC<PreviewProps> = ({ homeworkId, subject }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detail, setDetail] = useState<HomeworkDetail | null>(null);
  const [entries, setEntries] = useState<HomeworkQuestionEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [detailResponse, questionsResponse] = await Promise.all([
        getAssetDetail({ id: homeworkId, subject }),
        getHomeworkQuestions({ id: homeworkId, subject }),
      ]);
      if (!detailResponse.success) {
        setLoadError(detailResponse.message || '作业加载失败');
        return;
      }
      if (detailResponse.data.type !== 'homework') {
        setLoadError('该资产不是作业，无法预览');
        return;
      }
      // 契约落地后 getAssetDetail 的联合类型将包含 HomeworkDetail；
      // 此处先经运行时类型判断再断言，避免依赖联合类型展开顺序。
      setDetail(detailResponse.data as HomeworkDetail);
      if (!questionsResponse.success) {
        setLoadError(questionsResponse.message || '作业试题加载失败');
        return;
      }
      setEntries(questionsResponse.data);
    } catch {
      setLoadError('作业加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [homeworkId, subject]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview, reloadKey]);

  if (loading) {
    return (
      <div className="homework-preview-loading">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="homework-preview-error">
        <Alert
          type="error"
          showIcon
          message={loadError || '作业不存在或已删除'}
          action={
            <Space>
              <Button
                size="small"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重试
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  const missingCount = entries.filter((entry) => !entry.question).length;

  return (
    <div className="homework-preview-stage">
      <article className="homework-preview-document">
        <header className="homework-preview-document-header">
          <Typography.Title level={2} className="homework-preview-title">
            {detail.name}
          </Typography.Title>
          <Descriptions
            className="homework-preview-meta"
            column={{ xs: 1, sm: 2, md: 4 }}
            size="small"
            items={[
              {
                key: 'subject',
                label: '学科',
                children: getSubjectLabel(subject),
              },
              {
                key: 'status',
                label: '状态',
                children: (
                  <Tag color="green">{ASSET_STATUS_LABELS[detail.status]}</Tag>
                ),
              },
              {
                key: 'count',
                label: '试题数量',
                children: `${entries.length} 道${
                  missingCount ? `（其中缺失 ${missingCount} 道）` : ''
                }`,
              },
              {
                key: 'updatedAt',
                label: '更新时间',
                children: formatDate(detail.updatedAt),
              },
            ]}
          />
        </header>

        {missingCount > 0 ? (
          <Alert
            className="homework-preview-missing-alert"
            type="warning"
            showIcon
            message={`本作业有 ${missingCount} 道题内容缺失`}
            description="缺失的试题可能已被删除，请通过编辑页核对处理。"
          />
        ) : null}

        <div className="homework-preview-questions">
          {entries.map((entry, index) => {
            const question = entry.question;
            return (
              <section
                className="homework-preview-question"
                key={entry.questionId}
              >
                <div className="homework-preview-question-head">
                  <Typography.Text strong>第 {index + 1} 题</Typography.Text>
                  {question ? (
                    <Space size={4} wrap>
                      <Tag>来源：{question.source}</Tag>
                      <Tag color="blue">题型：{question.type}</Tag>
                      <Tag color="orange">
                        难度：{getDifficultyLabel(question.difficulty)}
                      </Tag>
                      {question.year ? (
                        <Tag color="geekblue">年份：{question.year}</Tag>
                      ) : null}
                    </Space>
                  ) : null}
                </div>
                {question ? (
                  <>
                    <Typography.Paragraph className="homework-preview-stem">
                      {question.stem}
                    </Typography.Paragraph>
                    {question.options && question.options.length > 0 ? (
                      <ul className="homework-preview-options">
                        {question.options.map((option, optionIndex) => (
                          <li key={optionIndex}>
                            {option.label}. {option.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Collapse
                      ghost
                      size="small"
                      className="homework-preview-answer-collapse"
                      items={[
                        {
                          key: 'answer',
                          label: '答案解析',
                          children: (
                            <div className="homework-preview-answer">
                              <p>
                                <strong>答案：</strong>
                                {question.answer || '—'}
                              </p>
                              <p>
                                <strong>解析：</strong>
                                {question.explanation || '—'}
                              </p>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </>
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message={`第 ${index + 1} 题内容缺失`}
                    description={`题目 ID：${entry.questionId}。该试题可能已被删除，请通过编辑页核对处理。`}
                  />
                )}
              </section>
            );
          })}
        </div>
      </article>
    </div>
  );
};

export default Preview;
