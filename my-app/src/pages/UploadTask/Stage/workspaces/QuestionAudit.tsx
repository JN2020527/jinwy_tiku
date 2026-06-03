import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
import { getKnowledgeTree, type KnowledgeNode } from '@/services/tagSystem';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Radio,
  Rate,
  Select,
  Space,
  Spin,
  Tag,
  TreeSelect,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { TaskQuestion } from '../../types';
import styles from './QuestionAudit.less';

export interface QuestionAuditProps {
  questions: TaskQuestion[];
  mode: 'parse' | 'tag';
  onUpdate: (q: TaskQuestion, patch: Partial<TaskQuestion>) => Promise<void>;
  onRegenerate: (q: TaskQuestion) => Promise<void>;
  onConfirm: (ids: string[]) => Promise<void>;
  readOnly?: boolean;
}

interface TreeNode {
  title: string;
  value: string;
  key: string;
  children?: TreeNode[];
}

const QUESTION_TYPE_OPTIONS = ['单选', '多选', '填空', '解答', '判断'];
const COGNITION_OPTIONS = ['识记', '理解', '应用', '分析', '评价', '创造'];
const PARSE_FIELDS: Array<'stem' | 'options' | 'answer' | 'analysis'> = [
  'stem',
  'options',
  'answer',
  'analysis',
];
const PARSE_FIELD_LABELS: Record<(typeof PARSE_FIELDS)[number], string> = {
  stem: '题干',
  options: '选项',
  answer: '答案',
  analysis: '解析',
};

function mapKnowledgeNodes(nodes: KnowledgeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    key: n.id,
    children: n.children ? mapKnowledgeNodes(n.children) : undefined,
  }));
}

function isReviewed(q: TaskQuestion, mode: 'parse' | 'tag'): boolean {
  return mode === 'parse' ? !!q.parseReviewed : !!q.tagReviewed;
}

const QuestionAudit: React.FC<QuestionAuditProps> = ({
  questions,
  mode,
  onUpdate,
  onRegenerate,
  onConfirm,
  readOnly = false,
}) => {
  const [currentId, setCurrentId] = useState<string>(questions[0]?.id ?? '');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'reviewed'>(
    'all',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<TaskQuestion | null>(null);
  const [kpTree, setKpTree] = useState<TreeNode[]>([]);
  const [regenLoading, setRegenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 同步当前题到 draft
  useEffect(() => {
    const cur = questions.find((q) => q.id === currentId);
    setDraft(cur ? { ...cur } : null);
  }, [currentId, questions]);

  // 首次或题目集合变化时确保 currentId 有效
  useEffect(() => {
    if (questions.length === 0) {
      setCurrentId('');
      return;
    }
    if (!questions.find((q) => q.id === currentId)) {
      setCurrentId(questions[0].id);
    }
  }, [questions, currentId]);

  // 拉知识点树（仅 tag 模式需要）
  useEffect(() => {
    if (mode !== 'tag') return;
    getKnowledgeTree()
      .then((res) => {
        if (res?.success && res.data) setKpTree(mapKnowledgeNodes(res.data));
      })
      .catch(() => {
        // 静默失败，TreeSelect 显示空树即可，避免页面崩溃
      });
  }, [mode]);

  const filtered = useMemo(() => {
    if (filterMode === 'all') return questions;
    if (filterMode === 'pending')
      return questions.filter((q) => !isReviewed(q, mode));
    return questions.filter((q) => isReviewed(q, mode));
  }, [questions, filterMode, mode]);

  const reviewedCount = useMemo(
    () => questions.filter((q) => isReviewed(q, mode)).length,
    [questions, mode],
  );
  const pendingCount = questions.length - reviewedCount;

  const navTo = (offset: number) => {
    if (questions.length === 0) return;
    const idx = questions.findIndex((q) => q.id === currentId);
    if (idx < 0) return;
    const next = idx + offset;
    if (next < 0 || next >= questions.length) return;
    setCurrentId(questions[next].id);
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    const original = questions.find((q) => q.id === draft.id);
    if (!original) return;
    setSaveLoading(true);
    try {
      const patch: Partial<TaskQuestion> =
        mode === 'parse'
          ? {
              stem: draft.stem,
              options: draft.options,
              answer: draft.answer,
              analysis: draft.analysis,
            }
          : { tags: draft.tags };
      await onUpdate(original, patch);
      message.success('已保存');
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!draft) return;
    setRegenLoading(true);
    try {
      await onRegenerate(draft);
      message.success('已重新生成');
    } catch (e) {
      message.error((e as Error).message || '重新生成失败');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleConfirm = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await onConfirm(ids);
      message.success(`已确认 ${ids.length} 题`);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (e) {
      message.error((e as Error).message || '确认失败');
    }
  };

  useQuestionNavKeyboard({
    enabled: !readOnly,
    onPrev: () => navTo(-1),
    onNext: () => navTo(+1),
    onSaveNext: async () => {
      await handleSave();
      navTo(+1);
    },
  });

  const current = questions.find((q) => q.id === currentId) ?? null;

  const fieldFrameClass = (confidence: number | undefined): string => {
    const low = confidence != null && confidence < 0.8;
    return `${styles.fieldFrame} ${low ? styles.fieldFrameLow : ''}`;
  };

  return (
    <div className={styles.auditRoot}>
      {/* 左栏 */}
      <div className={styles.leftPanel}>
        <div className={styles.filterBar}>
          <Radio.Group
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            size="small"
          >
            <Radio.Button value="all">全部 ({questions.length})</Radio.Button>
            <Radio.Button value="pending">待审 ({pendingCount})</Radio.Button>
            <Radio.Button value="reviewed">已审 ({reviewedCount})</Radio.Button>
          </Radio.Group>
        </div>
        <div className={styles.questionList}>
          {filtered.map((q) => {
            const reviewed = isReviewed(q, mode);
            const active = q.id === currentId;
            return (
              <div
                key={q.id}
                onClick={() => setCurrentId(q.id)}
                className={`${styles.questionItem} ${
                  active ? styles.questionItemActive : ''
                }`}
              >
                <Checkbox
                  checked={selectedIds.includes(q.id)}
                  disabled={readOnly}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setSelectedIds((prev) =>
                      e.target.checked
                        ? [...prev, q.id]
                        : prev.filter((id) => id !== q.id),
                    )
                  }
                />
                <span
                  className={
                    active ? styles.questionIndexActive : styles.questionIndex
                  }
                >
                  Q{q.index}
                </span>
                {q.tags?.questionType && (
                  <Tag color="blue">{q.tags.questionType}</Tag>
                )}
                {reviewed && <Tag color="green">✓</Tag>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 中栏 */}
      <div className={styles.centerPanel}>
        {!current && <div className={styles.emptyHint}>请选择左侧题目</div>}
        {current && (
          <>
            <div className={styles.previewTitle}>
              Q{current.index} {current.tags?.questionType || ''}
            </div>
            <div className={fieldFrameClass(current.parseConfidence?.stem)}>
              <div className={styles.fieldLabel}>题干</div>
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(current.stem),
                }}
              />
            </div>
            {current.options && current.options.length > 0 && (
              <div
                className={fieldFrameClass(current.parseConfidence?.options)}
              >
                <div className={styles.fieldLabel}>选项</div>
                {current.options.map((opt, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <strong>{String.fromCharCode(65 + i)}. </strong>
                    <span
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className={fieldFrameClass(current.parseConfidence?.answer)}>
              <div className={styles.fieldLabel}>答案</div>
              <div>{current.answer || '—'}</div>
            </div>
            <div className={fieldFrameClass(current.parseConfidence?.analysis)}>
              <div className={styles.fieldLabel}>解析</div>
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(current.analysis ?? ''),
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* 右栏 */}
      <div className={styles.rightPanel}>
        <div className={styles.editArea}>
          {!draft && <div className={styles.emptyHint}>请选择左侧题目</div>}
          {draft && mode === 'parse' && (
            <Form layout="vertical" disabled={readOnly}>
              {PARSE_FIELDS.map((field) => {
                const conf = draft.parseConfidence?.[field];
                const low = conf != null && conf < 0.8;
                const label = (
                  <span>
                    {PARSE_FIELD_LABELS[field]}
                    {conf != null && (
                      <span
                        className={styles.confidenceTag}
                        style={{ color: low ? '#dc2626' : '#94a3b8' }}
                      >
                        (置信度 {Math.round(conf * 100)}%)
                      </span>
                    )}
                  </span>
                );
                if (field === 'options') {
                  return (
                    <Form.Item
                      key={field}
                      label={label}
                      validateStatus={low ? 'warning' : ''}
                    >
                      {([0, 1, 2, 3] as const).map((i) => (
                        <Input
                          key={i}
                          style={{ marginBottom: 6 }}
                          addonBefore={String.fromCharCode(65 + i)}
                          value={draft.options?.[i] ?? ''}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    options: (
                                      prev.options ?? ['', '', '', '']
                                    ).map((v, j) =>
                                      j === i ? e.target.value : v,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                      ))}
                    </Form.Item>
                  );
                }
                const isTextArea = field === 'stem' || field === 'analysis';
                return (
                  <Form.Item
                    key={field}
                    label={label}
                    validateStatus={low ? 'warning' : ''}
                  >
                    {isTextArea ? (
                      <Input.TextArea
                        rows={field === 'stem' ? 4 : 3}
                        value={(draft[field] as string | undefined) ?? ''}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, [field]: e.target.value } : prev,
                          )
                        }
                      />
                    ) : (
                      <Input
                        value={(draft[field] as string | undefined) ?? ''}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, [field]: e.target.value } : prev,
                          )
                        }
                      />
                    )}
                  </Form.Item>
                );
              })}
            </Form>
          )}
          {draft && mode === 'tag' && (
            <Form layout="vertical" disabled={readOnly}>
              <Form.Item label="知识点">
                <TreeSelect
                  multiple
                  treeData={kpTree}
                  value={draft.tags?.knowledgePoints ?? []}
                  treeDefaultExpandAll
                  placeholder="选择知识点"
                  onChange={(val: string[]) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              knowledgePoints: val,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
              <Form.Item label="题型">
                <Select
                  value={draft.tags?.questionType}
                  options={QUESTION_TYPE_OPTIONS.map((v) => ({
                    label: v,
                    value: v,
                  }))}
                  onChange={(val) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              questionType: val,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
              <Form.Item label="难度">
                <Rate
                  count={5}
                  value={draft.tags?.difficulty ?? 0}
                  onChange={(val) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              difficulty: val as 1 | 2 | 3 | 4 | 5,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
              <Form.Item label="认知层次">
                <Select
                  value={draft.tags?.cognitionLevel}
                  options={COGNITION_OPTIONS.map((v) => ({
                    label: v,
                    value: v,
                  }))}
                  onChange={(val) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              cognitionLevel: val,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
            </Form>
          )}
        </div>
        <div className={styles.editToolbar}>
          <Space>
            <Button
              onClick={handleSave}
              loading={saveLoading}
              disabled={readOnly || !draft}
            >
              保存
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={readOnly || !draft || regenLoading}
            >
              {regenLoading ? <Spin size="small" /> : '重新生成'}
            </Button>
          </Space>
          <Button
            type="primary"
            disabled={readOnly || !current}
            onClick={() => current && handleConfirm([current.id])}
          >
            ✓ 确认通过
          </Button>
        </div>
      </div>

      {/* 底部状态条 */}
      <div className={styles.bottomBar}>
        <span>
          已审 {reviewedCount} / {questions.length} · 全部通过后自动推进。↑↓
          切题，Ctrl+Enter 保存下一题
          {readOnly && (
            <Tag color="default" style={{ marginLeft: 8 }}>
              只读
            </Tag>
          )}
        </span>
        {selectedIds.length > 0 && !readOnly && (
          <Button
            type="primary"
            size="small"
            onClick={() => handleConfirm(selectedIds)}
          >
            批量确认通过（{selectedIds.length}）
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuestionAudit;
