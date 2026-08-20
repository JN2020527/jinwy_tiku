import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnLevel,
  SubjectColumnType,
} from '@/services/subjectColumns';
import {
  createSubjectColumn,
  deleteSubjectColumn,
  getSubjectColumns,
  moveSubjectColumn,
  updateSubjectColumn,
} from '@/services/subjectColumns';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SUBJECT_OPTIONS } from '../TagManage/components/treeFilterConstants';
import './index.less';

interface SubjectColumnFormValues {
  name: string;
  level: SubjectColumnLevel;
  parentId?: string;
  type: SubjectColumnType;
}

interface SubjectColumnTreeNode extends SubjectColumn {
  children?: SubjectColumnTreeNode[];
}

const LEVEL_OPTIONS = [
  { label: '一级栏目', value: 1 },
  { label: '四级栏目', value: 4 },
];

const LEVEL_LABELS: Record<SubjectColumnLevel, string> = {
  1: '一级',
  4: '四级',
};

const TYPE_OPTIONS = [
  { label: '知识型', value: 'knowledge' },
  { label: '试题型', value: 'question' },
];

const TYPE_LABELS: Record<SubjectColumnType, string> = {
  knowledge: '知识型',
  question: '试题型',
};

const TYPE_COLORS: Record<SubjectColumnType, string> = {
  knowledge: 'blue',
  question: 'purple',
};

const buildColumnTree = (columns: SubjectColumn[]): SubjectColumnTreeNode[] => {
  const nodeMap = new Map<string, SubjectColumnTreeNode>();
  columns.forEach((column) => nodeMap.set(column.id, { ...column }));

  const roots: SubjectColumnTreeNode[] = [];
  nodeMap.forEach((node) => {
    if (!node.parentId) {
      roots.push(node);
      return;
    }
    const parent = nodeMap.get(node.parentId);
    if (parent) {
      parent.children = [...(parent.children || []), node];
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes: SubjectColumnTreeNode[]) => {
    nodes.sort((left, right) => left.sort - right.sort);
    nodes.forEach((node) => {
      if (node.children?.length) sortTree(node.children);
    });
  };
  sortTree(roots);
  return roots;
};

const SubjectColumnManage: React.FC = () => {
  const [form] = Form.useForm<SubjectColumnFormValues>();
  const [selectedSubject, setSelectedSubject] = useState('math');
  const [columns, setColumns] = useState<SubjectColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<SubjectColumn | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [movingColumnId, setMovingColumnId] = useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedSubjectRef = useRef(selectedSubject);
  const selectedLevel = Form.useWatch('level', form) || 1;

  const fetchColumns = useCallback(async (subject: string) => {
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    setLoadError(null);
    try {
      const response = await getSubjectColumns({ subject });
      if (requestIdRef.current !== requestId) return;
      if (!response.success) {
        const errorMessage = response.message || '获取栏目失败';
        setLoadError(errorMessage);
        message.error(errorMessage);
        return;
      }
      setColumns(response.data);
    } catch {
      if (requestIdRef.current === requestId) {
        setLoadError('栏目加载失败，请重新加载');
        message.error('获取栏目失败');
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchColumns(selectedSubject);
  }, [fetchColumns, selectedSubject]);

  const subjectLabel =
    SUBJECT_OPTIONS.find((option) => option.value === selectedSubject)?.label ||
    selectedSubject;
  const treeData = useMemo(() => buildColumnTree(columns), [columns]);
  const mutationPending = Boolean(
    movingColumnId || deletingColumnId || submitting,
  );
  const columnMap = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );

  const siblingPositionMap = useMemo(() => {
    const result = new Map<string, { index: number; total: number }>();
    const groups = new Map<string, SubjectColumn[]>();
    columns.forEach((column) => {
      const key = column.parentId || '__root__';
      groups.set(key, [...(groups.get(key) || []), column]);
    });
    groups.forEach((siblings) => {
      siblings
        .sort((left, right) => left.sort - right.sort)
        .forEach((column, index) => {
          result.set(column.id, { index, total: siblings.length });
        });
    });
    return result;
  }, [columns]);

  const parentOptions = useMemo(
    () =>
      columns
        .filter((column) => column.level === 1)
        .sort((left, right) => left.sort - right.sort)
        .map((column) => ({
          label: `${LEVEL_LABELS[column.level]} · ${column.name}`,
          value: column.id,
        })),
    [columns],
  );

  const parentLocked = Boolean(editingColumn && editingColumn.usedCount > 0);

  const closeDrawer = () => {
    if (submitting) return;
    setDrawerOpen(false);
    setEditingColumn(null);
    form.resetFields();
  };

  const openCreateDrawer = () => {
    setEditingColumn(null);
    form.setFieldsValue({
      name: '',
      level: 1,
      parentId: undefined,
      type: 'knowledge',
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (column: SubjectColumn) => {
    setEditingColumn(column);
    form.setFieldsValue({
      name: column.name,
      level: column.level,
      parentId: column.parentId || undefined,
      type: column.type,
    });
    setDrawerOpen(true);
  };

  const handleSubjectChange = (subject: string) => {
    requestIdRef.current += 1;
    selectedSubjectRef.current = subject;
    setDrawerOpen(false);
    setEditingColumn(null);
    form.resetFields();
    setColumns([]);
    setLoadError(null);
    setSelectedSubject(subject);
  };

  const handleLevelChange = (level: SubjectColumnLevel) => {
    if (level === 1) {
      form.setFieldValue('parentId', undefined);
    }
  };

  const showSubmitError = (errorMessage: string) => {
    const fieldName = errorMessage.includes('同名')
      ? 'name'
      : errorMessage.includes('类型')
      ? 'type'
      : errorMessage.includes('层级')
      ? 'level'
      : errorMessage.includes('归属') || errorMessage.includes('父栏目')
      ? 'parentId'
      : undefined;
    if (fieldName) {
      form.setFields([{ name: fieldName, errors: [errorMessage] }]);
    }
    message.error(errorMessage);
  };

  const handleSubmit = async () => {
    const operationSubject = selectedSubject;
    let values: SubjectColumnFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const input: SaveSubjectColumnInput = {
      subject: operationSubject,
      name: values.name.trim(),
      level: values.level,
      parentId: values.level === 1 ? null : values.parentId || null,
      type: values.type,
    };

    setSubmitting(true);
    try {
      const response = editingColumn
        ? await updateSubjectColumn({ ...input, id: editingColumn.id })
        : await createSubjectColumn(input);
      if (selectedSubjectRef.current !== operationSubject) return;
      if (!response.success) {
        showSubmitError(response.message || '栏目保存失败');
        return;
      }
      setColumns(response.data);
      message.success(response.message || '栏目保存成功');
      setDrawerOpen(false);
      setEditingColumn(null);
      form.resetFields();
    } catch {
      if (selectedSubjectRef.current === operationSubject) {
        message.error('栏目保存失败，请保留当前输入后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMove = async (
    column: SubjectColumn,
    direction: 'up' | 'down',
  ) => {
    const operationSubject = selectedSubject;
    setMovingColumnId(column.id);
    try {
      const response = await moveSubjectColumn({
        id: column.id,
        subject: operationSubject,
        direction,
      });
      if (selectedSubjectRef.current !== operationSubject) return;
      if (!response.success) {
        message.error(response.message || '栏目排序失败');
        return;
      }
      setColumns(response.data);
      message.success(response.message);
    } catch {
      if (selectedSubjectRef.current === operationSubject) {
        message.error('栏目排序失败，原顺序保持不变');
      }
    } finally {
      setMovingColumnId(null);
    }
  };

  const handleDelete = async (column: SubjectColumn) => {
    const operationSubject = selectedSubject;
    if (selectedSubjectRef.current !== operationSubject) {
      message.warning('学科已切换，请在当前学科重新发起删除');
      return;
    }
    setDeletingColumnId(column.id);
    try {
      const response = await deleteSubjectColumn({
        id: column.id,
        subject: operationSubject,
      });
      if (selectedSubjectRef.current !== operationSubject) return;
      if (!response.success) {
        message.error(response.message || '栏目删除失败');
        return;
      }
      message.success(response.message || '栏目删除成功');
      await fetchColumns(operationSubject);
    } catch {
      if (selectedSubjectRef.current === operationSubject) {
        message.error('栏目删除失败，原栏目保持不变');
      }
    } finally {
      setDeletingColumnId(null);
    }
  };

  const getDeleteBlockReason = (column: SubjectColumn) => {
    const childCount =
      column.level === 1
        ? columns.filter((candidate) => candidate.parentId === column.id).length
        : 0;
    if (childCount > 0) {
      return `该一级栏目下还有 ${childCount} 个四级栏目，不能删除；请先处理后再删除`;
    }
    if (column.usedCount > 0) {
      return `该栏目已被 ${column.usedCount} 处学案使用，不能删除`;
    }
    return null;
  };

  const renderDeleteAction = (column: SubjectColumnTreeNode) => {
    const blockReason = getDeleteBlockReason(column);
    const deleteButton = (
      <Button
        type="link"
        danger
        size="small"
        icon={<DeleteOutlined />}
        disabled={Boolean(blockReason) || mutationPending}
        loading={deletingColumnId === column.id}
        aria-label={
          blockReason
            ? `删除栏目“${column.name}”（不可删除：${blockReason}）`
            : `删除栏目“${column.name}”`
        }
      >
        删除
      </Button>
    );
    return blockReason ? (
      <Tooltip title={blockReason}>{deleteButton}</Tooltip>
    ) : (
      <Popconfirm
        title="确认删除栏目？"
        description={`删除“${column.name}”后立即生效；有四级子栏目或已被学案使用时系统将阻止删除。`}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => handleDelete(column)}
      >
        {deleteButton}
      </Popconfirm>
    );
  };

  const tableColumns: ColumnsType<SubjectColumnTreeNode> = [
    {
      title: '栏目名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (name: string) => (
        <Typography.Text strong className="subject-column-name">
          {name}
        </Typography.Text>
      ),
    },
    {
      title: '栏目层级',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (level: SubjectColumnLevel) => LEVEL_LABELS[level],
    },
    {
      title: '归属一级',
      dataIndex: 'parentId',
      key: 'parentId',
      width: 220,
      render: (parentId: string | null) =>
        parentId ? columnMap.get(parentId)?.name || '归属一级不可用' : '—',
    },
    {
      title: '栏目类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: SubjectColumnType) => (
        <Tag color={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</Tag>
      ),
    },
    {
      title: '使用情况',
      dataIndex: 'usedCount',
      key: 'usedCount',
      width: 130,
      render: (usedCount: number) =>
        usedCount > 0 ? <Tag color="orange">已使用 {usedCount} 处</Tag> : '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, column) => {
        const position = siblingPositionMap.get(column.id);
        const isMoving = movingColumnId === column.id;
        return (
          <Space size={4} className="subject-column-actions">
            <Button
              type="link"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={!position || position.index === 0 || mutationPending}
              loading={isMoving}
              aria-label={`上移栏目“${column.name}”`}
              onClick={() => void handleMove(column, 'up')}
            >
              上移
            </Button>
            <Button
              type="link"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={
                !position ||
                position.index === position.total - 1 ||
                mutationPending
              }
              loading={isMoving}
              aria-label={`下移栏目“${column.name}”`}
              onClick={() => void handleMove(column, 'down')}
            >
              下移
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              disabled={mutationPending}
              aria-label={`编辑栏目“${column.name}”`}
              onClick={() => openEditDrawer(column)}
            >
              编辑
            </Button>
            {renderDeleteAction(column)}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <Card className="subject-column-panel" variant="borderless">
        <div className="subject-column-toolbar">
          <div className="subject-column-context">
            <span className="subject-column-context-label">当前学科</span>
            <Select
              value={selectedSubject}
              options={SUBJECT_OPTIONS}
              onChange={handleSubjectChange}
              disabled={mutationPending}
              aria-label="选择栏目所属学科"
              className="subject-column-subject-select"
            />
            <span className="subject-column-context-tip">
              保存后立即同步到{subjectLabel}已有学案
            </span>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateDrawer}
            disabled={mutationPending}
          >
            新增栏目
          </Button>
        </div>

        <Table<SubjectColumnTreeNode>
          key={`${selectedSubject}-${columns.length}`}
          rowKey="id"
          columns={tableColumns}
          dataSource={treeData}
          loading={loading}
          pagination={false}
          defaultExpandAllRows
          scroll={{ x: 1190 }}
          className="subject-column-table"
          locale={{
            emptyText: loading ? null : loadError ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={loadError}
              >
                <Button onClick={() => void fetchColumns(selectedSubject)}>
                  重新加载
                </Button>
              </Empty>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`当前${subjectLabel}暂无栏目`}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreateDrawer}
                >
                  新增第一个栏目
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Drawer
        title={editingColumn ? '编辑栏目' : '新增栏目'}
        open={drawerOpen}
        width={520}
        onClose={closeDrawer}
        destroyOnClose
        maskClosable={!submitting}
        footer={
          <div className="subject-column-drawer-footer">
            <Button onClick={closeDrawer} disabled={submitting}>
              取消
            </Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              保存并生效
            </Button>
          </div>
        }
      >
        <div className="subject-column-drawer-intro">
          当前维护 <strong>{subjectLabel}</strong>{' '}
          栏目；同一学科内栏目名称全局唯一，四级栏目必须归属同学科一级栏目。
        </div>
        <Form form={form} layout="vertical" className="subject-column-form">
          <Form.Item
            name="name"
            label="栏目名称"
            rules={[
              { required: true, message: '请输入栏目名称' },
              { whitespace: true, message: '栏目名称不能为空' },
              {
                validator: async (_, value: string) => {
                  const duplicated = columns.some(
                    (column) =>
                      column.id !== editingColumn?.id &&
                      column.name.trim() === (value || '').trim(),
                  );
                  if (duplicated) {
                    throw new Error('当前学科已存在同名栏目');
                  }
                },
              },
            ]}
          >
            <Input placeholder="请输入栏目名称" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="level"
            label="栏目层级"
            rules={[{ required: true, message: '请选择栏目层级' }]}
            extra={
              editingColumn
                ? '学科和层级创建后不可修改。'
                : '本页只注册一级、四级栏目。'
            }
          >
            <Select
              options={LEVEL_OPTIONS}
              onChange={handleLevelChange}
              disabled={Boolean(editingColumn)}
            />
          </Form.Item>

          {selectedLevel === 4 ? (
            <Form.Item
              name="parentId"
              label="归属一级"
              rules={[{ required: true, message: '请选择归属一级栏目' }]}
              extra={
                parentLocked
                  ? `该四级栏目已被 ${editingColumn?.usedCount} 处学案使用，不能调整归属一级；请先解除使用关系。`
                  : '未被使用的四级栏目可调整归属一级，保存后排到新一级的四级组末尾。'
              }
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={parentOptions}
                placeholder="请选择同学科一级栏目"
                notFoundContent="当前学科暂无一级栏目，请先新增"
                disabled={parentLocked}
              />
            </Form.Item>
          ) : null}

          <Form.Item
            name="type"
            label="栏目类型"
            rules={[{ required: true, message: '请选择栏目类型' }]}
            extra={
              editingColumn && editingColumn.usedCount > 0
                ? `该栏目已被 ${editingColumn.usedCount} 处学案使用，栏目类型不能修改；仍可改名和排序。`
                : '类型只作用于当前栏目。'
            }
          >
            <Select
              options={TYPE_OPTIONS}
              disabled={Boolean(editingColumn && editingColumn.usedCount > 0)}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
};

export default SubjectColumnManage;
