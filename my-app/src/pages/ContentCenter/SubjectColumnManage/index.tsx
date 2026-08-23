import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnCodeStyle,
  SubjectColumnDataSource,
  SubjectColumnLevel,
  SubjectColumnType,
  SubjectLevelCodeRule,
} from '@/services/subjectColumns';
import {
  createSubjectColumn,
  deleteSubjectColumn,
  getSubjectColumns,
  getSubjectLevelCodeRules,
  moveSubjectColumn,
  updateSubjectColumn,
  updateSubjectLevelCodeRules,
} from '@/services/subjectColumns';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined,
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
  applicableLevels: SubjectColumnLevel[];
  type: SubjectColumnType;
  dataSource: SubjectColumnDataSource;
}

const LEVELS: SubjectColumnLevel[] = [1, 2, 3, 4];

const LEVEL_LABELS: Record<SubjectColumnLevel, string> = {
  1: '一级',
  2: '二级',
  3: '三级',
  4: '四级',
};

const LEVEL_OPTIONS = LEVELS.map((level) => ({
  label: LEVEL_LABELS[level],
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
  summary: string;
  value: SubjectColumnCodeStyle;
}> = [
  {
    label: '中文数字 + 顿号',
    summary: '一、二、三、……',
    value: 'chineseDunhao',
  },
  {
    label: '中文数字 + 圆括号',
    summary: '（一）、（二）、（三）、……',
    value: 'chineseParentheses',
  },
  {
    label: '阿拉伯数字 + 英文句点',
    summary: '1.、2.、3.、……',
    value: 'arabicPeriod',
  },
];

const CODE_STYLE_LABELS = Object.fromEntries(
  CODE_STYLE_OPTIONS.map((option) => [option.value, option.summary]),
) as Record<SubjectColumnCodeStyle, string>;

const SubjectColumnManage: React.FC = () => {
  const [form] = Form.useForm<SubjectColumnFormValues>();
  const [selectedSubject, setSelectedSubject] = useState('math');
  const [columns, setColumns] = useState<SubjectColumn[]>([]);
  const [levelCodeRules, setLevelCodeRules] = useState<SubjectLevelCodeRule[]>(
    [],
  );
  const [draftCodeRules, setDraftCodeRules] = useState<SubjectLevelCodeRule[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);
  const [codeRuleDrawerOpen, setCodeRuleDrawerOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const [sortLevel, setSortLevel] = useState<SubjectColumnLevel>(1);
  const [editingColumn, setEditingColumn] = useState<SubjectColumn | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingCodeRules, setSavingCodeRules] = useState(false);
  const [movingColumnKey, setMovingColumnKey] = useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedSubjectRef = useRef(selectedSubject);
  const selectedDataSource = Form.useWatch('dataSource', form) || 'custom';

  const fetchData = useCallback(async (subject: string) => {
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    setLoadError(null);
    try {
      const [columnResponse, ruleResponse] = await Promise.all([
        getSubjectColumns({ subject }),
        getSubjectLevelCodeRules({ subject }),
      ]);
      if (requestIdRef.current !== requestId) return;
      if (!columnResponse.success || !ruleResponse.success) {
        const errorMessage =
          columnResponse.message || ruleResponse.message || '栏目加载失败';
        setLoadError(errorMessage);
        message.error(errorMessage);
        return;
      }
      setColumns(columnResponse.data);
      setLevelCodeRules(ruleResponse.data);
    } catch {
      if (requestIdRef.current === requestId) {
        setLoadError('栏目加载失败，请重新加载');
        message.error('栏目加载失败');
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(selectedSubject);
  }, [fetchData, selectedSubject]);

  const subjectLabel =
    SUBJECT_OPTIONS.find((option) => option.value === selectedSubject)?.label ||
    selectedSubject;
  const mutationPending = Boolean(
    movingColumnKey || deletingColumnId || submitting || savingCodeRules,
  );

  const sortedColumns = useMemo(
    () =>
      [...columns].sort((left, right) => {
        const leftLevel = left.applicableLevels[0] || 1;
        const rightLevel = right.applicableLevels[0] || 1;
        return (
          leftLevel - rightLevel ||
          (left.sortByLevel[leftLevel] ?? 0) -
            (right.sortByLevel[rightLevel] ?? 0) ||
          left.name.localeCompare(right.name, 'zh-CN')
        );
      }),
    [columns],
  );

  const sortLevelColumns = useMemo(
    () =>
      columns
        .filter((column) => column.applicableLevels.includes(sortLevel))
        .sort(
          (left, right) =>
            (left.sortByLevel[sortLevel] ?? 0) -
            (right.sortByLevel[sortLevel] ?? 0),
        ),
    [columns, sortLevel],
  );

  const closeColumnDrawer = () => {
    if (submitting) return;
    setColumnDrawerOpen(false);
    setEditingColumn(null);
    form.resetFields();
  };

  const openCreateDrawer = () => {
    setEditingColumn(null);
    form.setFieldsValue({
      name: '',
      applicableLevels: [1],
      type: 'knowledge',
      dataSource: 'custom',
    });
    setColumnDrawerOpen(true);
  };

  const openEditDrawer = (column: SubjectColumn) => {
    setEditingColumn(column);
    form.setFieldsValue({
      name: column.name,
      applicableLevels: column.applicableLevels,
      type: column.type,
      dataSource: column.dataSource,
    });
    setColumnDrawerOpen(true);
  };

  const openCodeRuleDrawer = () => {
    setDraftCodeRules(
      LEVELS.map(
        (level) =>
          levelCodeRules.find((rule) => rule.level === level) || {
            level,
            codeStyle: null,
          },
      ),
    );
    setCodeRuleDrawerOpen(true);
  };

  const handleSubjectChange = (subject: string) => {
    requestIdRef.current += 1;
    selectedSubjectRef.current = subject;
    setColumnDrawerOpen(false);
    setCodeRuleDrawerOpen(false);
    setSortDrawerOpen(false);
    setEditingColumn(null);
    form.resetFields();
    setColumns([]);
    setLevelCodeRules([]);
    setLoadError(null);
    setSelectedSubject(subject);
  };

  const handleDataSourceChange = (dataSource: SubjectColumnDataSource) => {
    if (dataSource === 'knowledgeTree') {
      form.setFieldValue('type', 'knowledge');
      form.setFields([{ name: 'type', errors: [] }]);
    }
  };

  const showSubmitError = (errorMessage: string) => {
    const fieldName = errorMessage.includes('同名')
      ? 'name'
      : errorMessage.includes('数据来源') || errorMessage.includes('知识树')
      ? 'dataSource'
      : errorMessage.includes('类型')
      ? 'type'
      : errorMessage.includes('层级') || errorMessage.includes('级已有')
      ? 'applicableLevels'
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
            applicableLevels: values.applicableLevels,
          })
        : await createSubjectColumn({
            subject: operationSubject,
            name: values.name.trim(),
            applicableLevels: values.applicableLevels,
            type: values.type,
            dataSource: values.dataSource,
          } satisfies SaveSubjectColumnInput);
      if (selectedSubjectRef.current !== operationSubject) return;
      if (!response.success) {
        showSubmitError(response.message || '栏目保存失败');
        return;
      }
      setColumns(response.data);
      message.success(response.message || '栏目保存成功');
      setColumnDrawerOpen(false);
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
    const operationKey = `${column.id}-${sortLevel}`;
    setMovingColumnKey(operationKey);
    try {
      const response = await moveSubjectColumn({
        id: column.id,
        subject: operationSubject,
        level: sortLevel,
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
      setMovingColumnKey(null);
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
      await fetchData(operationSubject);
    } catch {
      if (selectedSubjectRef.current === operationSubject) {
        message.error('栏目删除失败，原栏目保持不变');
      }
    } finally {
      setDeletingColumnId(null);
    }
  };

  const handleSaveCodeRules = async () => {
    const operationSubject = selectedSubject;
    setSavingCodeRules(true);
    try {
      const response = await updateSubjectLevelCodeRules({
        subject: operationSubject,
        rules: draftCodeRules,
      });
      if (selectedSubjectRef.current !== operationSubject) return;
      if (!response.success) {
        message.error(response.message || '编码规则保存失败');
        return;
      }
      setLevelCodeRules(response.data);
      setCodeRuleDrawerOpen(false);
      message.success(response.message || '编码规则已保存');
    } catch {
      if (selectedSubjectRef.current === operationSubject) {
        message.error('编码规则保存失败，请重试');
      }
    } finally {
      setSavingCodeRules(false);
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
        aria-label={`删除栏目“${column.name}”`}
      >
        删除
      </Button>
    );
    if (blockReason) {
      return (
        <Tooltip title={blockReason}>
          <span>{deleteButton}</span>
        </Tooltip>
      );
    }
    return (
      <Popconfirm
        title="确认删除栏目？"
        description={`删除“${column.name}”后立即生效。`}
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
      title: '栏目名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string) => (
        <Typography.Text strong className="subject-column-name">
          {name}
        </Typography.Text>
      ),
    },
    {
      title: '适用层级',
      dataIndex: 'applicableLevels',
      key: 'applicableLevels',
      width: 220,
      render: (applicableLevels: SubjectColumnLevel[]) => (
        <Space size={[4, 4]} wrap>
          {applicableLevels.map((level) => (
            <Tag key={level} bordered={false} color="blue">
              {LEVEL_LABELS[level]}
            </Tag>
          ))}
        </Space>
      ),
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
      title: '数据来源',
      dataIndex: 'dataSource',
      key: 'dataSource',
      width: 120,
      render: (dataSource: SubjectColumnDataSource) => (
        <Tag color={dataSource === 'knowledgeTree' ? 'cyan' : undefined}>
          {SOURCE_LABELS[dataSource]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 168,
      fixed: 'right',
      render: (_, column) => (
        <Space size={4} className="subject-column-actions">
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
      ),
    },
  ];

  const sortTableColumns: ColumnsType<SubjectColumn> = [
    {
      title: '顺序',
      key: 'index',
      width: 72,
      render: (_, __, index) => index + 1,
    },
    {
      title: '栏目名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '调整',
      key: 'actions',
      width: 120,
      render: (_, column, index) => {
        const isMoving = movingColumnKey === `${column.id}-${sortLevel}`;
        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={index === 0 || mutationPending}
              loading={isMoving}
              title="上移"
              aria-label={`上移栏目“${column.name}”`}
              onClick={() => void handleMove(column, 'up')}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={
                index === sortLevelColumns.length - 1 || mutationPending
              }
              loading={isMoving}
              title="下移"
              aria-label={`下移栏目“${column.name}”`}
              onClick={() => void handleMove(column, 'down')}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="栏目维护"
      subTitle="按学科维护学案在线创建时可选择的栏目"
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
              栏目名称在{subjectLabel}内唯一
            </span>
          </div>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={openCodeRuleDrawer}
              disabled={mutationPending}
            >
              编码规则
            </Button>
            <Button
              icon={<OrderedListOutlined />}
              onClick={() => setSortDrawerOpen(true)}
              disabled={mutationPending}
            >
              层级排序
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateDrawer}
              disabled={mutationPending}
            >
              新增栏目
            </Button>
          </Space>
        </div>

        <div className="subject-column-code-summary">
          <div>
            <Typography.Text strong>层级编码规则</Typography.Text>
            <div className="subject-column-code-summary-items">
              {LEVELS.map((level) => {
                const codeStyle = levelCodeRules.find(
                  (rule) => rule.level === level,
                )?.codeStyle;
                return (
                  <span key={level}>
                    {LEVEL_LABELS[level]}：
                    {codeStyle ? CODE_STYLE_LABELS[codeStyle] : '不编码'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {loadError ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError}>
            <Button onClick={() => void fetchData(selectedSubject)}>
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
              scroll={{ x: 828 }}
              className="subject-column-table"
              locale={{
                emptyText: loading ? null : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="当前学科暂无栏目"
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
        open={columnDrawerOpen}
        width={520}
        onClose={closeColumnDrawer}
        destroyOnClose
        maskClosable={!submitting}
        footer={
          <div className="subject-column-drawer-footer">
            <Button onClick={closeColumnDrawer} disabled={submitting}>
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
          栏目；同一栏目可以在多个层级中使用。
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
            name="applicableLevels"
            label="适用层级"
            rules={[{ required: true, message: '请选择至少一个适用层级' }]}
            extra="已被学案引用的层级不可取消；各层级的排序互不影响。"
          >
            <Select
              mode="multiple"
              options={LEVEL_OPTIONS}
              placeholder="请选择适用层级"
              maxTagCount={4}
            />
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
        </Form>
      </Drawer>

      <Drawer
        title="编辑层级编码规则"
        open={codeRuleDrawerOpen}
        width={560}
        onClose={() => !savingCodeRules && setCodeRuleDrawerOpen(false)}
        destroyOnClose
        maskClosable={!savingCodeRules}
        footer={
          <div className="subject-column-drawer-footer">
            <Button
              onClick={() => setCodeRuleDrawerOpen(false)}
              disabled={savingCodeRules}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={savingCodeRules}
              onClick={handleSaveCodeRules}
            >
              保存并生效
            </Button>
          </div>
        }
      >
        <Typography.Paragraph type="secondary">
          编码规则按学科和层级统一设置。同一级栏目在各自直接父栏目下都从第一项重新编码。
        </Typography.Paragraph>
        <div className="subject-column-code-rule-list">
          {LEVELS.map((level) => {
            const rule = draftCodeRules.find((item) => item.level === level);
            return (
              <div className="subject-column-code-rule-item" key={level}>
                <div>
                  <Typography.Text strong>
                    {LEVEL_LABELS[level]}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {rule?.codeStyle
                      ? CODE_STYLE_LABELS[rule.codeStyle]
                      : '当前不编码'}
                  </Typography.Text>
                </div>
                <Select
                  value={rule?.codeStyle || 'none'}
                  aria-label={`${LEVEL_LABELS[level]}编码方式`}
                  options={[
                    { label: '不编码', value: 'none' },
                    ...CODE_STYLE_OPTIONS.map((option) => ({
                      label: `${option.label} · ${option.summary}`,
                      value: option.value,
                    })),
                  ]}
                  onChange={(value) =>
                    setDraftCodeRules((current) =>
                      current.map((item) =>
                        item.level === level
                          ? {
                              ...item,
                              codeStyle:
                                value === 'none'
                                  ? null
                                  : (value as SubjectColumnCodeStyle),
                            }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </Drawer>

      <Drawer
        title="层级排序"
        open={sortDrawerOpen}
        width={520}
        onClose={() => !movingColumnKey && setSortDrawerOpen(false)}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          同一栏目在不同层级中的位置分别维护，调整当前层级不会影响其他层级。
        </Typography.Paragraph>
        <div className="subject-column-sort-level">
          <Typography.Text strong>选择层级</Typography.Text>
          <Select
            value={sortLevel}
            options={LEVEL_OPTIONS}
            onChange={setSortLevel}
            disabled={Boolean(movingColumnKey)}
          />
        </div>
        <Table<SubjectColumn>
          rowKey="id"
          columns={sortTableColumns}
          dataSource={sortLevelColumns}
          pagination={false}
          size="middle"
          locale={{ emptyText: `${LEVEL_LABELS[sortLevel]}暂无栏目` }}
        />
      </Drawer>
    </PageContainer>
  );
};

export default SubjectColumnManage;
