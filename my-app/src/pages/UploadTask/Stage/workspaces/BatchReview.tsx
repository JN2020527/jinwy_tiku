import {
  Alert,
  Button,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TaskQuestion } from '../../types';
import styles from './BatchReview.less';

export interface BatchReviewProps {
  questions: TaskQuestion[];
  summary: { autoPass: number; needReview: number; autoReject: number };
  onKeep: (ids: string[]) => Promise<void>;
  onReject: (ids: string[], reason: string) => Promise<void>;
  readOnly?: boolean;
}

function scoreColor(score: number | undefined): string {
  if (score == null) return '#64748b';
  if (score >= 80) return '#16a34a';
  if (score >= 55) return '#d97706';
  return '#dc2626';
}

const BatchReview: React.FC<BatchReviewProps> = ({
  questions,
  summary,
  onKeep,
  onReject,
  readOnly = false,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [rejectTarget, setRejectTarget] = useState<{
    ids: string[];
    reason: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(
    () =>
      showAll
        ? questions
        : questions.filter((q) => q.qualityVerdict === 'mid-need-review'),
    [questions, showAll],
  );

  const total = questions.length;

  const handleKeep = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSubmitting(true);
    try {
      await onKeep(ids);
      setSelectedRowKeys((prev) => prev.filter((k) => !ids.includes(String(k))));
      message.success(`已保留 ${ids.length} 题`);
    } catch (e) {
      message.error((e as Error).message || '保留失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const reason = rejectTarget.reason.trim();
    if (!reason) {
      message.warning('请填写删除原因');
      return;
    }
    setSubmitting(true);
    try {
      await onReject(rejectTarget.ids, reason);
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !rejectTarget.ids.includes(String(k))),
      );
      message.success(`已删除 ${rejectTarget.ids.length} 题`);
      setRejectTarget(null);
    } catch (e) {
      message.error((e as Error).message || '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<TaskQuestion> = [
    {
      title: '题号',
      dataIndex: 'index',
      width: 80,
      render: (idx: number) => `Q${idx}`,
    },
    {
      title: '题干',
      dataIndex: 'stem',
      render: (_: string, q) => (
        <div
          className={styles.stemCell}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.stem) }}
        />
      ),
    },
    {
      title: '评分',
      dataIndex: 'qualityScore',
      width: 80,
      render: (s: number | undefined) => (
        <span className={styles.scoreCell} style={{ color: scoreColor(s) }}>
          {s ?? '—'}
        </span>
      ),
    },
    {
      title: '扣分明细',
      dataIndex: 'qualityDeductions',
      render: (_: unknown, q) => (
        <Space size={[4, 4]} wrap>
          {(q.qualityDeductions ?? []).map((d, i) => (
            <Tag key={i} color="orange">
              {d.rule}(-{d.points})
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 160,
      render: (_: unknown, q) => (
        <Space>
          <Button
            size="small"
            disabled={readOnly || submitting}
            onClick={() => handleKeep([q.id])}
          >
            保留
          </Button>
          <Button
            size="small"
            danger
            disabled={readOnly || submitting}
            onClick={() => setRejectTarget({ ids: [q.id], reason: '' })}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const selectedIds = selectedRowKeys.map((k) => String(k));

  return (
    <div className={styles.batchReview}>
      <Alert
        type="info"
        showIcon
        message={
          <span>
            共 {total} 题 · 自动通过 {summary.autoPass} · 待编辑确认{' '}
            {summary.needReview} · 自动拒绝 {summary.autoReject}
          </span>
        }
      />
      <div className={styles.controls}>
        <Switch
          checkedChildren="显示全部"
          unCheckedChildren="仅待审"
          checked={showAll}
          onChange={setShowAll}
        />
        <span className={styles.visibleCount}>当前展示 {visible.length} 题</span>
      </div>

      <Table<TaskQuestion>
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: false }}
        rowSelection={
          readOnly
            ? undefined
            : {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }
        }
        columns={columns}
        dataSource={visible}
      />

      {!readOnly && selectedIds.length > 0 && (
        <div className={styles.stickyBar}>
          <span>选中 {selectedIds.length} 项</span>
          <Button
            type="primary"
            disabled={submitting}
            onClick={() => handleKeep(selectedIds)}
          >
            批量保留
          </Button>
          <Button
            danger
            disabled={submitting}
            onClick={() => setRejectTarget({ ids: selectedIds, reason: '' })}
          >
            批量删除（填原因）
          </Button>
        </div>
      )}

      {readOnly && (
        <div className={styles.readOnlyHint}>
          <Tag color="default">只读</Tag> 该阶段已审完，仅供查看
        </div>
      )}

      <Modal
        title="删除原因（必填）"
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onOk={handleRejectConfirm}
        okText="确认删除"
        okButtonProps={{ danger: true, loading: submitting }}
      >
        <Input.TextArea
          rows={4}
          value={rejectTarget?.reason ?? ''}
          onChange={(e) =>
            setRejectTarget((prev) =>
              prev ? { ...prev, reason: e.target.value } : prev,
            )
          }
          placeholder="请填写删除原因，便于后续追溯"
        />
      </Modal>
    </div>
  );
};

export default BatchReview;
