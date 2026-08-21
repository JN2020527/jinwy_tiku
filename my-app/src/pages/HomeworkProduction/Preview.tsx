import type {
  HomeworkDetail,
  PublishedQuestion,
} from '@/services/resourceAssets';
import {
  getAssetDetail,
  getHomeworkQuestions,
} from '@/services/resourceAssets';
import { Alert, Button, Card, Skeleton, Space, Switch, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

interface PreviewProps {
  homeworkId: string;
  subject: string;
}

type HomeworkQuestionEntry = {
  questionId: string;
  question?: PublishedQuestion;
};

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
  const [showAnswers, setShowAnswers] = useState(false);

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
    <div className="homework-preview-workspace">
      <div className="homework-preview-stage">
        <article className="homework-preview-document">
          <header className="homework-preview-document-header">
            <Typography.Title level={2} className="homework-preview-title">
              {detail.name}
            </Typography.Title>
            <p className="homework-preview-student-line">
              <span>班级：____________</span>
              <span>姓名：____________</span>
            </p>
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
                  {question ? (
                    <>
                      <Typography.Paragraph className="homework-preview-stem">
                        <strong>{index + 1}．</strong>
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
                      {showAnswers ? (
                        <div className="homework-preview-answer">
                          <div>
                            <strong>【答案】</strong>
                            <p>{question.answer || '—'}</p>
                          </div>
                          <div>
                            <strong>【解析】</strong>
                            <p>{question.explanation || '—'}</p>
                          </div>
                        </div>
                      ) : null}
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
      <aside className="homework-preview-settings" aria-label="作业预览设置">
        <Card size="small" title="预览设置">
          <div className="homework-preview-setting-row">
            <div>
              <strong>显示答案解析</strong>
              <span>统一显示或隐藏全部题目的答案与解析</span>
            </div>
            <Switch
              size="small"
              checked={showAnswers}
              onChange={setShowAnswers}
              aria-label="显示全部答案解析"
            />
          </div>
        </Card>
      </aside>
    </div>
  );
};

export default Preview;
