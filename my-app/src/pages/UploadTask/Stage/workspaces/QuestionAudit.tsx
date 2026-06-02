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
import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
import { getKnowledgeTree, type KnowledgeNode } from '@/services/tagSystem';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TaskQuestion } from '../../types';
import styles from './QuestionAudit.less';

export interface QuestionAuditProps {
  questions: TaskQuestion[];
  mode: 'parse' | 'tag';
  onUpdate: (q: TaskQuestion, patch: Partial<TaskQuestion>) => Promise<void>;
  onRegenerate: (q: TaskQuestion) => Promise<void>;
  onConfirm: (ids: string[]) => Promise<void>;
  readOnly?: boolean;
  /** Layout variant: 'compact' hides the left sidebar and uses a horizontal question ribbon */
  variant?: 'full' | 'compact';
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

/** Confidence-based color mapping for field cards */
function confidenceColor(
  confidence: number | undefined,
): { border: string; bg: string } {
  if (confidence == null) return { border: '#e2e8f0', bg: 'transparent' };
  if (confidence < 0.5) return { border: '#dc2626', bg: '#fef2f2' };
  if (confidence < 0.8) return { border: '#d97706', bg: '#fffbeb' };
  return { border: '#22c55e', bg: '#f0fdf4' };
}

const QuestionAudit: React.FC<QuestionAuditProps> = ({
  questions,
  mode,
  onUpdate,
  onRegenerate,
  onConfirm,
  readOnly = false,
  variant = 'full',
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

  // Sync current question to draft
  useEffect(() => {
    const cur = questions.find((q) => q.id === currentId);
    setDraft(cur ? { ...cur } : null);
  }, [currentId, questions]);

  // Ensure currentId is valid when questions change
  useEffect(() => {
    if (questions.length === 0) {
      setCurrentId('');
      return;
    }
    if (!questions.find((q) => q.id === currentId)) {
      setCurrentId(questions[0].id);
    }
  }, [questions, currentId]);

  // Fetch knowledge tree (tag mode only)
  useEffect(() => {
    if (mode !== 'tag') return;
    getKnowledgeTree()
      .then((res) => {
        if (res?.success && res.data) setKpTree(mapKnowledgeNodes(res.data));
      })
      .catch(() => {
        // Silent failure — TreeSelect shows empty tree, page stays stable
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

  const currentIndex = useMemo(
    () => questions.findIndex((q) => q.id === currentId),
    [questions, currentId],
  );

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

  // ── Shared: edit form (both modes reuse this) ──
  const renderEditForm = () => {
    if (!draft) {
      return <div className={styles.emptyHint}>暂无题目</div>;
    }
    if (mode === 'parse') {
      return (
        <Form layout="vertical" disabled={readOnly} size="small">
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
                                options: (prev.options ?? [
                                  '',
                                  '',
                                  '',
                                  '',
                                ]).map((v, j) =>
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
      );
    }
    // tag mode
    return (
      <Form layout="vertical" disabled={readOnly} size="small">
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
    );
  };

  // ── Shared: toolbar buttons ──
  const renderToolbar = (showBatch = true) => (
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
      <Space>
        {showBatch && selectedIds.length > 0 && !readOnly && (
          <Button size="small" onClick={() => handleConfirm(selectedIds)}>
            批量确认（{selectedIds.length}）
          </Button>
        )}
        <Button
          type="primary"
          disabled={readOnly || !current}
          onClick={() => current && handleConfirm([current.id])}
        >
          ✓ 确认通过
        </Button>
      </Space>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // COMPACT VARIANT — horizontal ribbon + two-panel layout
  // ═══════════════════════════════════════════════════════════

  if (variant === 'compact') {
    return (
      <div className={styles.compactRoot}>
        {/* Horizontal question ribbon */}
        <div className={styles.ribbon}>
          <div className={styles.ribbonTrack}>
            <button
              type="button"
              className={styles.ribbonArrow}
              disabled={currentIndex <= 0}
              onClick={() => navTo(-1)}
              aria-label="上一题"
            >
              ‹
            </button>
            <div className={styles.ribbonPills}>
              {questions.map((q) => {
                const reviewed = isReviewed(q, mode);
                const active = q.id === currentId;
                const selected = selectedIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentId(q.id)}
                    className={`${styles.pill} ${active ? styles.pillActive : ''} ${reviewed ? styles.pillReviewed : ''} ${selected ? styles.pillSelected : ''}`}
                  >
                    <Checkbox
                      checked={selected}
                      disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, q.id]
                            : prev.filter((id) => id !== q.id),
                        )
                      }
                      className={styles.pillCheckbox}
                    />
                    <span className={styles.pillLabel}>Q{q.index}</span>
                    {reviewed && <span className={styles.pillCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.ribbonArrow}
              disabled={currentIndex >= questions.length - 1}
              onClick={() => navTo(+1)}
              aria-label="下一题"
            >
              ›
            </button>
          </div>
          <div className={styles.ribbonMeta}>
            <span className={styles.ribbonProgress}>
              {currentIndex >= 0 ? currentIndex + 1 : 0} / {questions.length}
            </span>
            <span className={styles.ribbonDot} />
            <span className={styles.ribbonStats}>
              已审 {reviewedCount} · 待审 {pendingCount}
            </span>
            {readOnly && (
              <Tag color="default" style={{ marginLeft: 8, fontSize: 11 }}>
                只读
              </Tag>
            )}
          </div>
        </div>

        {/* Two-panel body */}
        <div className={styles.compactBody}>
          {/* Left: content preview */}
          <div className={styles.compactLeft}>
            {!current ? (
              <div className={styles.emptyHint}>暂无题目</div>
            ) : (
              <div className={styles.compactContent}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentTitle}>
                    Q{current.index}
                    {current.tags?.questionType && (
                      <Tag
                        color="blue"
                        style={{ marginLeft: 8, fontWeight: 400 }}
                      >
                        {current.tags.questionType}
                      </Tag>
                    )}
                  </h3>
                </div>

                {/* Stem */}
                <div
                  className={styles.contentCard}
                  style={{
                    ...(() => {
                      const c = confidenceColor(current.parseConfidence?.stem);
                      return {
                        borderLeftColor: c.border,
                        backgroundColor: c.bg,
                      };
                    })(),
                  }}
                >
                  <div className={styles.cardLabel}>
                    题干
                    {current.parseConfidence?.stem != null && (
                      <span
                        className={styles.cardConfidence}
                        style={{
                          color:
                            current.parseConfidence.stem < 0.8
                              ? '#dc2626'
                              : '#94a3b8',
                        }}
                      >
                        {Math.round(current.parseConfidence.stem * 100)}%
                      </span>
                    )}
                  </div>
                  <div
                    className={styles.cardBody}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(current.stem),
                    }}
                  />
                </div>

                {/* Options */}
                {current.options && current.options.length > 0 && (
                  <div
                    className={styles.contentCard}
                    style={{
                      ...(() => {
                        const c = confidenceColor(
                          current.parseConfidence?.options,
                        );
                        return {
                          borderLeftColor: c.border,
                          backgroundColor: c.bg,
                        };
                      })(),
                    }}
                  >
                    <div className={styles.cardLabel}>
                      选项
                      {current.parseConfidence?.options != null && (
                        <span
                          className={styles.cardConfidence}
                          style={{
                            color:
                              current.parseConfidence.options < 0.8
                                ? '#dc2626'
                                : '#94a3b8',
                          }}
                        >
                          {Math.round(current.parseConfidence.options * 100)}%
                        </span>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      {current.options.map((opt, i) => (
                        <div key={i} className={styles.optionRow}>
                          <span className={styles.optionLetter}>
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(opt),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer */}
                <div
                  className={styles.contentCard}
                  style={{
                    ...(() => {
                      const c = confidenceColor(
                        current.parseConfidence?.answer,
                      );
                      return {
                        borderLeftColor: c.border,
                        backgroundColor: c.bg,
                      };
                    })(),
                  }}
                >
                  <div className={styles.cardLabel}>
                    答案
                    {current.parseConfidence?.answer != null && (
                      <span
                        className={styles.cardConfidence}
                        style={{
                          color:
                            current.parseConfidence.answer < 0.8
                              ? '#dc2626'
                              : '#94a3b8',
                        }}
                      >
                        {Math.round(current.parseConfidence.answer * 100)}%
                      </span>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    {current.answer || '—'}
                  </div>
                </div>

                {/* Analysis */}
                <div
                  className={styles.contentCard}
                  style={{
                    ...(() => {
                      const c = confidenceColor(
                        current.parseConfidence?.analysis,
                      );
                      return {
                        borderLeftColor: c.border,
                        backgroundColor: c.bg,
                      };
                    })(),
                  }}
                >
                  <div className={styles.cardLabel}>
                    解析
                    {current.parseConfidence?.analysis != null && (
                      <span
                        className={styles.cardConfidence}
                        style={{
                          color:
                            current.parseConfidence.analysis < 0.8
                              ? '#dc2626'
                              : '#94a3b8',
                        }}
                      >
                        {Math.round(current.parseConfidence.analysis * 100)}%
                      </span>
                    )}
                  </div>
                  <div
                    className={styles.cardBody}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(current.analysis ?? ''),
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: edit panel */}
          <div className={styles.compactRight}>
            <div className={styles.editArea}>{renderEditForm()}</div>
            {renderToolbar()}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className={styles.compactBottom}>
          <span className={styles.bottomHint}>
            ↑↓ 切题 · Ctrl+Enter 保存并下一题
          </span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // FULL VARIANT — original three-column layout (unchanged)
  // ═══════════════════════════════════════════════════════════

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
            <Radio.Button value="reviewed">
              已审 ({reviewedCount})
            </Radio.Button>
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
                className={`${styles.questionItem} ${active ? styles.questionItemActive : ''}`}
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
        {!current && (
          <div className={styles.emptyHint}>请选择左侧题目</div>
        )}
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
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(opt),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className={fieldFrameClass(current.parseConfidence?.answer)}>
              <div className={styles.fieldLabel}>答案</div>
              <div>{current.answer || '—'}</div>
            </div>
            <div
              className={fieldFrameClass(current.parseConfidence?.analysis)}
            >
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
        <div className={styles.editArea}>{renderEditForm()}</div>
        {renderToolbar(false)}
      </div>

      {/* 底部状态条 */}
      <div className={styles.bottomBar}>
        <span>
          已审 {reviewedCount} / {questions.length} ·
          全部通过后自动推进。↑↓ 切题，Ctrl+Enter 保存下一题
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
