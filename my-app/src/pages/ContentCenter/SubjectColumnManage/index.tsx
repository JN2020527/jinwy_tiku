import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnCodeStyle,
  SubjectColumnDataSource,
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
  Radio,
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
  type: SubjectColumnType;
  dataSource: SubjectColumnDataSource;
  codeEnabled: boolean;
  codeStyle: SubjectColumnCodeStyle | null;
}

const LEVELS: SubjectColumnLevel[] = [1, 2, 3, 4];

const LEVEL_LABELS: Record<SubjectColumnLevel, string> = {
  1: '一级',
  2: '二级',
  3: '三级',
  4: '四级',
};

const LEVEL_OPTIONS = LEVELS.map((level) => ({
  label: `${LEVEL_LABELS[level]}栏目`,
  value: level,
}));

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

const SOURCE_OPTIONS = [
  { label: '自定义', value: 'custom' },
  { label: '知识树', value: 'knowledgeTree' },
];

const SOURCE_LABELS: Record<SubjectColumnDataSource, string> = {
  custom: '自定义',
  knowledgeTree: '知识树',
};

const CODE_STYLE_OPTIONS: Array<{
  label: string;
  shortLabel: string;
  value: SubjectColumnCodeStyle;
}> = [
  {
    label: '中文数字 + 顿号（示例：一、）',
    shortLabel: '中文数字 + 顿号',
    value: 'chineseDunhao',
  },
  {
    label: '中文数字 + 圆括号（示例：（一））',
    shortLabel: '中文数字 + 圆括号',
    value: 'chineseParentheses',
  },
  {
    label: '阿拉伯数字 + 英文句点（示例：1.）',
    shortLabel: '阿拉伯数字 + 英文句点',
    value: 'arabicPeriod',
  },
];

const CODE_STYLE_LABELS = Object.fromEntries(
  CODE_STYLE_OPTIONS.map((option) => [option.value, option.shortLabel]),
) as Record<SubjectColumnCodeStyle, string>;

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
  const selectedDataSource = Form.useWatch('dataSource', form) || 'custom';
  const codeEnabled = Form.useWatch('codeEnabled', form) ?? false;

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
  const mutationPending = Boolean(
    movingColumnId || deletingColumnId || submitting,
  );

  const sortedColumns = useMemo(
    () =>
      [...columns].sort(
        (left, right) => left.level - right.level || left.sort - right.sort,
      ),
    [columns],
  );

  const positionMap = useMemo(() => {
    const result = new Map<string, { index: number; total: number }>();
    LEVELS.forEach((level) => {
      const levelColumns = sortedColumns.filter(
        (column) => column.level === level,
      );
      levelColumns.forEach((column, index) => {
        result.set(column.id, { index, total: levelColumns.length });
      });
    });
    return result;
  }, [sortedColumns]);

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
      type: 'knowledge',
      dataSource: 'custom',
      codeEnabled: false,
      codeStyle: null,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (column: SubjectColumn) => {
    setEditingColumn(column);
    form.setFieldsValue({
      name: column.name,
      level: column.level,
      type: column.type,
      dataSource: column.dataSource,
      codeEnabled: column.codeEnabled,
      codeStyle: column.codeStyle,
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

  const handleDataSourceChange = (dataSource: SubjectColumnDataSource) => {
    if (dataSource === 'knowledgeTree') {
      form.setFieldValue('type', 'knowledge');
      form.setFields([{ name: 'type', errors: [] }]);
    }
  };

  const handleCodeEnabledChange = (enabled: boolean) => {
    if (!enabled) {
      form.setFieldValue('codeStyle', null);
      form.setFields([{ name: 'codeStyle', errors: [] }]);
    }
  };

  const showSubmitError = (errorMessage: string) => {
    const fieldName = errorMessage.includes('同名')
      ? 'name'
      : errorMessage.includes('数据来源') || errorMessage.includes('知识树来源')
      ? 'dataSource'
      : errorMessage.includes('类型')
      ? 'type'
      : errorMessage.includes('编码样式')
      ? 'codeStyle'
      : errorMessage.includes('编码')
      ? 'codeEnabled'
      : errorMessage.includes('层级') || errorMessage.includes('级已有')
      ? 'level'
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

    setSubmitting(true);
    try {
      const response = editingColumn
        ? await updateSubjectColumn({
            id: editingColumn.id,
            subject: operationSubject,
            name: values.name.trim(),
            codeEnabled: values.codeEnabled,
            codeStyle: values.codeEnabled ? values.codeStyle : null,
          })
        : await createSubjectColumn({
            subject: operationSubject,
            name: values.name.trim(),
            level: values.level,
            type: values.type,
            dataSource: values.dataSource,
            codeEnabled: values.codeEnabled,
            codeStyle: values.codeEnabled ? values.codeStyle : null,
          } satisfies SaveSubjectColumnInput);
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
        message.error('栏目保存失败，当前输入已保留，请重试');
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

  const renderDeleteAction = (column: SubjectColumn) => {
    const blockReason =
      column.usedCount > 0
        ? `该栏目已被 ${column.usedCount} 处学案引用，不能删除`
        : null;
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
        description={`删除“${column.name}”后立即生效，其他层级和学科不受影响。`}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => handleDelete(column)}
      >
        {deleteButton}
      </Popconfirm>
    );
  };

  const tableColumns: ColumnsType<SubjectColumn> = [
    {
      title: '栏目层级',
      dataIndex: 'level',
      key: 'level',
      width: 96,
      render: (level: SubjectColumnLevel) => (
        <Tag bordered={false} color="blue">
          {LEVEL_LABELS[level]}
        </Tag>
      ),
    },
    {
      title: '栏目名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string) => (
        <Typography.Text strong className="subject-column-name">
          {name}
        </Typography.Text>
      ),
    },
    {
      title: '栏目类型',
      dataIndex: 'type',
      key: 'type',
      width: 104,
      render: (type: SubjectColumnType) => (
        <Tag color={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</Tag>
      ),
    },
    {
      title: '数据来源',
      dataIndex: 'dataSource',
      key: 'dataSource',
      width: 104,
      render: (dataSource: SubjectColumnDataSource) => (
        <Tag color={dataSource === 'knowledgeTree' ? 'cyan' : undefined}>
          {SOURCE_LABELS[dataSource]}
        </Tag>
      ),
    },
    {
      title: '编码方式',
      key: 'codeStyle',
      width: 220,
      render: (_, column) =>
        column.codeEnabled && column.codeStyle
          ? CODE_STYLE_LABELS[column.codeStyle]
          : '无需编码',
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (_, column) => {
        const position = positionMap.get(column.id);
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
    <PageContainer
      title="栏目维护"
      subTitle="按学科维护可在学案在线创建时选择的注册栏目"
    >
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
              栏目名称在{subjectLabel}全部层级内唯一
            </span>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreateDrawer()}
            disabled={mutationPending}
          >
            新增栏目
          </Button>
        </div>

        {loadError ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError}>
            <Button onClick={() => void fetchColumns(selectedSubject)}>
              重新加载
            </Button>
          </Empty>
        ) : (
          <div className="subject-column-table-wrap">
            <Table<SubjectColumn>
              rowKey="id"
              columns={tableColumns}
              dataSource={sortedColumns}
              loading={loading}
              pagination={false}
              size="middle"
              scroll={{ x: 964 }}
              className="subject-column-table"
              locale={{
                emptyText: loading ? null : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="当前学科暂无注册栏目"
                  >
                    <Button
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={openCreateDrawer}
                    >
                      新增栏目
                    </Button>
                  </Empty>
                ),
              }}
            />
          </div>
        )}
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
          栏目；名称须在当前学科全部层级内保持唯一。
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
            extra="栏目层级创建后不可修改。"
          >
            <Select options={LEVEL_OPTIONS} disabled={Boolean(editingColumn)} />
          </Form.Item>

          <Form.Item
            name="type"
            label="栏目类型"
            rules={[{ required: true, message: '请选择栏目类型' }]}
            extra={
              selectedDataSource === 'knowledgeTree'
                ? '知识树来源只能为知识型。'
                : '栏目类型创建后不可修改；具体内容规则不在本页定义。'
            }
          >
            <Select
              options={TYPE_OPTIONS}
              disabled={
                Boolean(editingColumn) || selectedDataSource === 'knowledgeTree'
              }
            />
          </Form.Item>

          <Form.Item
            name="dataSource"
            label="数据来源"
            rules={[{ required: true, message: '请选择数据来源' }]}
            extra="同一学科、同一层级最多有一个知识树来源栏目。"
          >
            <Select
              options={SOURCE_OPTIONS}
              disabled={Boolean(editingColumn)}
              onChange={handleDataSourceChange}
            />
          </Form.Item>

          <Form.Item
            name="codeEnabled"
            label="是否需要编码"
            rules={[{ required: true, message: '请选择是否需要编码' }]}
          >
            <Radio.Group
              options={[
                { label: '否', value: false },
                { label: '是', value: true },
              ]}
              onChange={(event) => handleCodeEnabledChange(event.target.value)}
            />
          </Form.Item>

          {codeEnabled && (
            <Form.Item
              name="codeStyle"
              label="编码样式"
              rules={[{ required: true, message: '请选择编码样式' }]}
            >
              <Select
                options={CODE_STYLE_OPTIONS}
                placeholder="请选择编码样式"
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </PageContainer>
  );
};

export default SubjectColumnManage;
