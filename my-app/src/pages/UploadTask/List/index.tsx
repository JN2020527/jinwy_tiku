import { advanceSystemStage, getUploadTasks } from '@/services/uploadTask';
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Tag, message } from 'antd';
import React, { useRef, useState } from 'react';
import { STAGE_LABELS } from '../constants';
import type { BucketKey, TaskStatus, UploadTask } from '../types';
import NewTaskModal from './NewTaskModal';
import ProgressBar from './ProgressBar';
import SummaryCards from './SummaryCards';
import styles from './index.less';

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  'pending-human': { label: '待人工处理', color: 'orange' },
  processing: { label: '系统处理中', color: 'blue' },
  published: { label: '已发布', color: 'green' },
  distributed: { label: '已分发', color: 'green' },
  rejected: { label: '已拒绝/退回', color: 'red' },
};

const EMPTY_BUCKET_COUNTS: Record<BucketKey, number> = {
  all: 0,
  'pending-human': 0,
  processing: 0,
  published: 0,
  rejected: 0,
};

const UploadTaskList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [filterStatus, setFilterStatus] = useState<BucketKey>('all');
  const [bucketCounts, setBucketCounts] =
    useState<Record<BucketKey, number>>(EMPTY_BUCKET_COUNTS);
  const [newOpen, setNewOpen] = useState(false);

  const handleAdvance = async (task: UploadTask) => {
    try {
      await advanceSystemStage(task.id, task.currentStage);
      message.success('已推进到下一阶段');
      actionRef.current?.reload();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  const renderActions = (record: UploadTask): React.ReactNode => {
    const stagePath = `/question-bank/upload/${record.id}/${record.currentStage}`;
    const distributePath = `/question-bank/upload/${record.id}/distribute`;

    switch (record.status) {
      case 'pending-human':
        return (
          <Space size="middle">
            <span
              className={styles.actionLink}
              onClick={() => history.push(stagePath)}
            >
              进入处理
            </span>
            <span
              className={styles.actionLink}
              onClick={() => history.push(`${stagePath}?readOnly=1`)}
            >
              详情
            </span>
          </Space>
        );
      case 'processing':
        return (
          <Space size="middle">
            <span
              className={styles.actionLink}
              onClick={() => history.push(stagePath)}
            >
              查看进度
            </span>
            <span
              className={styles.actionLinkDanger}
              onClick={() => handleAdvance(record)}
            >
              立即完成（演示）
            </span>
          </Space>
        );
      case 'published':
        return (
          <Space size="middle">
            <span
              className={styles.actionLink}
              onClick={() => history.push(distributePath)}
            >
              配置分发
            </span>
            <span
              className={styles.actionLink}
              onClick={() => history.push(`${stagePath}?readOnly=1`)}
            >
              详情
            </span>
          </Space>
        );
      case 'distributed':
        return (
          <Space size="middle">
            <span
              className={styles.actionLink}
              onClick={() => history.push(`${distributePath}?readOnly=1`)}
            >
              查看分发
            </span>
            <span
              className={styles.actionLink}
              onClick={() => history.push(`${stagePath}?readOnly=1`)}
            >
              详情
            </span>
          </Space>
        );
      case 'rejected':
        return (
          <Space size="middle">
            <span
              className={styles.actionLink}
              onClick={() => history.push(`${stagePath}?readOnly=1`)}
            >
              查看原因
            </span>
          </Space>
        );
      default:
        return null;
    }
  };

  const columns: ProColumns<UploadTask>[] = [
    {
      title: '任务名',
      dataIndex: 'name',
      render: (_dom, record) => (
        <div className={styles.taskName}>
          <span className={styles.taskNameTitle}>{record.name}</span>
          <span className={styles.taskNameMeta}>
            {record.subject} · {record.grade} · {record.totalQuestions}题
          </span>
        </div>
      ),
    },
    {
      title: '当前阶段',
      dataIndex: 'currentStage',
      width: 120,
      render: (_dom, record) => (
        <Tag color={STATUS_META[record.status].color}>
          {STAGE_LABELS[record.currentStage]}
        </Tag>
      ),
    },
    {
      title: '流水线进度',
      dataIndex: 'stageProgress',
      width: 260,
      render: (_dom, record) => <ProgressBar task={record} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_dom, record) => {
        const meta = STATUS_META[record.status];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_dom, record) => renderActions(record),
    },
  ];

  return (
    <PageContainer>
      <SummaryCards
        bucketCounts={bucketCounts}
        active={filterStatus}
        onChange={setFilterStatus}
      />
      <ProTable<UploadTask>
        headerTitle="上传任务"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        params={{ status: filterStatus }}
        columns={columns}
        request={async (params) => {
          const resp = await getUploadTasks({
            current: params.current,
            pageSize: params.pageSize,
            status: filterStatus === 'all' ? undefined : filterStatus,
          });
          setBucketCounts(resp.bucketCounts);
          return {
            data: resp.data,
            total: resp.total,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewOpen(true)}
          >
            新建上传任务
          </Button>,
        ]}
      />
      <NewTaskModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => {
          setNewOpen(false);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default UploadTaskList;
