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
  { label: '二级栏目', value: 2 },
  { label: '三级栏目', value: 3 },
  { label: '四级栏目', value: 4 },
];

const LEVEL_LABELS: Record<SubjectColumnLevel, string> = {
  1: '一级',
  2: '二级',
  3: '三级',
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

const getDescendantIds = (columns: SubjectColumn[], columnId: string) => {
  const result = new Set<string>();
  const collect = (parentId: string) => {
    columns
      .filter((column) => column.parentId === parentId)
      .forEach((column) => {
        result.add(column.id);
        collect(column.id);
      });
  };
  collect(columnId);
  return result;
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

  const excludedParentIds = useMemo(() => {
    if (!editingColumn) return new Set<string>();
    return new Set([
      editingColumn.id,
      ...getDescendantIds(columns, editingColumn.id),
    ]);
  }, [columns, editingColumn]);

  const parentOptions = useMemo(
    () =>
      columns
        .filter(
          (column) =>
            column.level < selectedLevel && !excludedParentIds.has(column.id),
        )
        .sort(
          (left, right) => left.level - right.level || left.sort - right.sort,
        )
        .map((column) => ({
          label: `${LEVEL_LABELS[column.level]} · ${column.name}`,
          value: column.id,
        })),
    [columns, excludedParentIds, selectedLevel],
  );

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
    const currentParentId = form.getFieldValue('parentId');
    const currentParent = currentParentId
      ? columnMap.get(currentParentId)
      : undefined;
    if (level === 1 || !currentParent || currentParent.level >= level) {
      form.setFieldValue('parentId', undefined);
    }
  };

  const showSubmitError = (errorMessage: string) => {
    const fieldName = errorMessage.includes('同名')
      ? 'name'
      : errorMessage.includes('类型')
      ? 'type'
      : errorMessage.includes('调整后') || errorMessage.includes('栏目层级')
      ? 'level'
      : errorMessage.includes('父栏目') ||
        errorMessage.includes('自身') ||
        errorMessage.includes('后代')
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
      title: '父栏目',
      dataIndex: 'parentId',
      key: 'parentId',
      width: 220,
      render: (parentId: string | null) =>
        parentId ? columnMap.get(parentId)?.name || '父栏目不可用' : '—',
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
            <Popconfirm
              title="确认删除栏目？"
              description={`删除“${column.name}”后立即生效；有子栏目或已被使用时系统将阻止删除。`}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(column)}
            >
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={mutationPending}
                loading={deletingColumnId === column.id}
                aria-label={`删除栏目“${column.name}”`}
              >
                删除
              </Button>
            </Popconfirm>
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
          scroll={{ x: 1060 }}
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
          栏目；移动到其他父栏目后，默认排在目标同组末尾。
        </div>
        <Form form={form} layout="vertical" className="subject-column-form">
          <Form.Item
            name="name"
            label="栏目名称"
            rules={[
              { required: true, message: '请输入栏目名称' },
              { whitespace: true, message: '栏目名称不能为空' },
            ]}
          >
            <Input placeholder="请输入栏目名称" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="level"
            label="栏目层级"
            rules={[{ required: true, message: '请选择栏目层级' }]}
          >
            <Select options={LEVEL_OPTIONS} onChange={handleLevelChange} />
          </Form.Item>

          {selectedLevel > 1 ? (
            <Form.Item
              name="parentId"
              label="父栏目"
              rules={[{ required: true, message: '请选择父栏目' }]}
              extra="可跨级选择，但父栏目层级必须低于当前栏目。"
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={parentOptions}
                placeholder="请选择当前学科中的父栏目"
                notFoundContent="暂无层级更低的可选栏目"
              />
            </Form.Item>
          ) : null}

          <Form.Item
            name="type"
            label="栏目类型"
            rules={[{ required: true, message: '请选择栏目类型' }]}
            extra={
              editingColumn?.isUsed
                ? '该栏目已有内容块或试题引用，栏目类型不能修改；仍可改名、移动和排序。'
                : '类型只作用于当前栏目，不会向子栏目继承。'
            }
          >
            <Select options={TYPE_OPTIONS} disabled={editingColumn?.isUsed} />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
};

export default SubjectColumnManage;
