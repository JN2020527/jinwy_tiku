import type {
  ResourceOperationAction,
  ResourceOperationRecord,
} from '@/services/tagSystem';
import { RESOURCE_OPERATION_ACTION_LABELS } from '@/services/tagSystem';
import {
  AuditOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Empty, Tag, Timeline } from 'antd';
import React from 'react';

interface ResourceOperationTimelineProps {
  records: readonly ResourceOperationRecord[];
}

const OPERATION_COLORS: Record<ResourceOperationAction, string> = {
  upload: 'blue',
  publish: 'cyan',
  uploadVersion: 'blue',
  publishVersion: 'cyan',
  rename: 'default',
  adjustOwnership: 'purple',
  list: 'green',
  unlist: 'default',
  activateVersion: 'green',
  rollbackVersion: 'gold',
  archive: 'gold',
  restore: 'cyan',
  delete: 'red',
};

const formatDateTime = (value: string) =>
  value.replace('T', ' ').replace('Z', '').slice(0, 19);

const ResourceOperationTimeline: React.FC<ResourceOperationTimelineProps> = ({
  records,
}) => (
  <section
    className="asset-operation-ledger"
    aria-labelledby="asset-operation-ledger-title"
  >
    <div className="asset-operation-ledger-heading">
      <span className="asset-operation-ledger-icon" aria-hidden="true">
        <AuditOutlined />
      </span>
      <div>
        <strong id="asset-operation-ledger-title">资源操作记录</strong>
        <span>按发生时间倒序，只追加、不覆盖关键变更</span>
      </div>
      <Tag icon={<LockOutlined />} color="blue" bordered={false}>
        不可变记录
      </Tag>
    </div>

    {records.length ? (
      <Timeline
        className="asset-operation-timeline"
        items={records.map((record) => ({
          color: OPERATION_COLORS[record.action],
          dot:
            record.action === 'activateVersion' || record.action === 'list' ? (
              <CheckCircleOutlined />
            ) : undefined,
          children: (
            <article className="asset-operation-entry">
              <div className="asset-operation-entry-meta">
                <Tag color={OPERATION_COLORS[record.action]}>
                  {RESOURCE_OPERATION_ACTION_LABELS[record.action]}
                </Tag>
                <strong>{record.operator.name}</strong>
                <time dateTime={record.occurredAt}>
                  {formatDateTime(record.occurredAt)}
                </time>
              </div>
              <p>{record.summary}</p>
              {record.changes.length > 0 && (
                <dl className="asset-operation-changes">
                  {record.changes.map((change, index) => (
                    <div key={`${record.id}-${change.label}-${index}`}>
                      <dt>{change.label}</dt>
                      <dd>
                        {change.before && (
                          <span className="asset-operation-before">
                            {change.before}
                          </span>
                        )}
                        {change.before && change.after && (
                          <span aria-hidden="true">→</span>
                        )}
                        {change.after && (
                          <span className="asset-operation-after">
                            {change.after}
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ),
        }))}
      />
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无操作记录" />
    )}
  </section>
);

export default ResourceOperationTimeline;
