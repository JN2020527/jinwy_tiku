import type {
  ApiResponse,
  SchedulableResourceNode,
  TeachingPlanTask,
  TeachingPlanTemplate,
  TeachingPlanWeek,
} from '@/services/teachingPlan';
import { teachingPlanService } from '@/services/teachingPlan';
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RetweetOutlined,
  SaveOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { MenuProps } from 'antd';
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './index.less';

type TemplateStatus = TeachingPlanTemplate['status'];

interface TemplateFormValues {
  name: string;
  subject: string;
  totalWeeks: number;
  weeklyHours: number;
}

interface CopyFormValues {
  name: string;
}

interface MoveFormValues {
  week: number;
}

interface ResourceFormValues {
  resourceNodeId: string;
}

const SUBJECT_OPTIONS = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
  { label: '生物', value: 'biology' },
  { label: '历史', value: 'history' },
  { label: '地理', value: 'geography' },
  { label: '道德与法治', value: 'politics' },
];

const STATUS_META: Record<TemplateStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  active: { label: '已启动', color: 'green' },
  stopped: { label: '已停用', color: 'orange' },
  archived: { label: '已归档', color: 'default' },
};

const getSubjectLabel = (subject: string) =>
  SUBJECT_OPTIONS.find((option) => option.value === subject)?.label || subject;

const formatDateTime = (value?: string) =>
  value ? value.replace('T', ' ').slice(0, 16) : '—';

const formatHours = (hours: number) =>
  Number.isInteger(hours) ? String(hours) : hours.toFixed(1);

const requireApiData = <T,>(response: ApiResponse<T>) => {
  if (!response.success) throw new Error(response.message);
  return response.data;
};

const getStartBlockers = (template: TeachingPlanTemplate) => {
  const blockers: string[] = [];
  if (!template.tasks.length) blockers.push('至少配置 1 个教学任务');
  if (template.tasks.some((task) => !task.resourceNodeEnabled)) {
    blockers.push('存在已停用的资源节点');
  }
  if (template.schedule.hasConflicts) blockers.push('存在周容量冲突');
  if (template.schedule.unscheduledHours > 0) {
    blockers.push(
      `仍有 ${formatHours(template.schedule.unscheduledHours)} 课时未排入计划`,
    );
  }
  return blockers;
};

const getWeekAnchoredTasks = (template: TeachingPlanTemplate, week: number) =>
  template.tasks
    .filter((task) => task.anchorWeek === week)
    .sort((left, right) => left.order - right.order);

const getTaskWeekHours = (
  template: TeachingPlanTemplate,
  taskId: string,
  week: number,
) =>
  template.schedule.weeks
    .find((item) => item.week === week)
    ?.segments.filter((segment) => segment.taskId === taskId)
    .reduce((sum, segment) => sum + segment.hours, 0) || 0;

const getTaskEndWeek = (template: TeachingPlanTemplate, taskId: string) => {
  const weeks = template.schedule.weeks
    .filter((week) =>
      week.segments.some((segment) => segment.taskId === taskId),
    )
    .map((week) => week.week);
  return weeks.length ? Math.max(...weeks) : undefined;
};

const TeachingPlanTemplatePage: React.FC = () => {
  const [templates, setTemplates] = useState<TeachingPlanTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] =
    useState<TeachingPlanTemplate | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [copySource, setCopySource] = useState<TeachingPlanTemplate | null>(
    null,
  );
  const [moveTask, setMoveTask] = useState<TeachingPlanTask | null>(null);
  const [resourceNodes, setResourceNodes] = useState<SchedulableResourceNode[]>(
    [],
  );
  const [resourceLoading, setResourceLoading] = useState(false);
  const [createForm] = Form.useForm<TemplateFormValues>();
  const [settingsForm] = Form.useForm<TemplateFormValues>();
  const [copyForm] = Form.useForm<CopyFormValues>();
  const [moveForm] = Form.useForm<MoveFormValues>();
  const [resourceForm] = Form.useForm<ResourceFormValues>();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await teachingPlanService.list();
      setTemplates(requireApiData(response));
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '模板列表加载失败',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const refreshActiveTemplate = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await teachingPlanService.get(id);
      const template = requireApiData(response);
      setActiveTemplate(template);
      setSelectedWeek((current) =>
        Math.min(Math.max(current, 1), template.totalWeeks),
      );
      return template;
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '模板详情加载失败',
      );
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openTemplate = async (template: TeachingPlanTemplate) => {
    setSelectedWeek(1);
    await refreshActiveTemplate(template.id);
  };

  const runOperation = async <T,>(
    operation: () => Promise<ApiResponse<T>>,
    successMessage: string,
    options?: { refreshDetailId?: string; returnToList?: boolean },
  ) => {
    setOperationLoading(true);
    try {
      const data = requireApiData(await operation());
      message.success(successMessage);
      await fetchTemplates();
      if (options?.refreshDetailId) {
        await refreshActiveTemplate(options.refreshDetailId);
      }
      if (options?.returnToList) setActiveTemplate(null);
      return data;
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '操作失败，请重试',
      );
      return undefined;
    } finally {
      setOperationLoading(false);
    }
  };

  const createTemplate = async () => {
    const values = await createForm.validateFields();
    const createdTemplate = await runOperation(
      () => teachingPlanService.create(values),
      '教学计划模板草稿已创建',
    );
    if (!createdTemplate) return;
    setCreateOpen(false);
    createForm.resetFields();
    await openTemplate(createdTemplate);
  };

  const saveSettings = async () => {
    if (!activeTemplate) return;
    const values = await settingsForm.validateFields();
    const saved = await runOperation(
      () =>
        teachingPlanService.update({
          id: activeTemplate.id,
          name: values.name,
          totalWeeks: values.totalWeeks,
          weeklyHours: values.weeklyHours,
        }),
      '模板设置已保存，排期已重新计算',
      { refreshDetailId: activeTemplate.id },
    );
    if (saved) setSettingsOpen(false);
  };

  const saveDraft = async () => {
    if (!activeTemplate) return;
    await runOperation(
      () =>
        teachingPlanService.update({
          id: activeTemplate.id,
          name: activeTemplate.name,
          totalWeeks: activeTemplate.totalWeeks,
          weeklyHours: activeTemplate.weeklyHours,
        }),
      '草稿已保存',
      { refreshDetailId: activeTemplate.id },
    );
  };

  const openResourcePicker = async () => {
    if (!activeTemplate) return;
    setResourceOpen(true);
    setResourceLoading(true);
    resourceForm.resetFields();
    try {
      const response = await teachingPlanService.getSchedulableResourceNodes({
        subject: activeTemplate.subject,
      });
      setResourceNodes(requireApiData(response));
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '资源节点加载失败',
      );
    } finally {
      setResourceLoading(false);
    }
  };

  const addTask = async () => {
    if (!activeTemplate) return;
    const values = await resourceForm.validateFields();
    const resourceNode = resourceNodes.find(
      (node) => node.id === values.resourceNodeId,
    );
    if (!resourceNode) return;
    const added = await runOperation(
      () =>
        teachingPlanService.add({
          templateId: activeTemplate.id,
          resourceNode,
          anchorWeek: selectedWeek,
        }),
      `已加入第 ${selectedWeek} 周`,
      { refreshDetailId: activeTemplate.id },
    );
    if (added) setResourceOpen(false);
  };

  const moveSelectedTask = async () => {
    if (!activeTemplate || !moveTask) return;
    const values = await moveForm.validateFields();
    const moved = await runOperation(
      () =>
        teachingPlanService.move({
          templateId: activeTemplate.id,
          taskId: moveTask.id,
          toWeek: values.week,
        }),
      `任务已移动到第 ${values.week} 周`,
      { refreshDetailId: activeTemplate.id },
    );
    if (moved) {
      setSelectedWeek(values.week);
      setMoveTask(null);
    }
  };

  const reorderTask = async (task: TeachingPlanTask, direction: -1 | 1) => {
    if (!activeTemplate) return;
    const tasks = getWeekAnchoredTasks(activeTemplate, selectedWeek);
    const currentIndex = tasks.findIndex((item) => item.id === task.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tasks.length) {
      return;
    }
    const nextTasks = [...tasks];
    [nextTasks[currentIndex], nextTasks[targetIndex]] = [
      nextTasks[targetIndex],
      nextTasks[currentIndex],
    ];
    await runOperation(
      () =>
        teachingPlanService.reorder({
          templateId: activeTemplate.id,
          week: selectedWeek,
          taskIds: nextTasks.map((item) => item.id),
        }),
      '任务顺序已调整，排期已重新计算',
      { refreshDetailId: activeTemplate.id },
    );
  };

  const removeTask = (task: TeachingPlanTask) => {
    if (!activeTemplate) return;
    Modal.confirm({
      title: '移除这个教学任务？',
      content: `“${task.resourceNodeName}”及其跨周续排片段将一并移除，后续排期会重新计算。`,
      okText: '移除任务',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () =>
        runOperation(
          () =>
            teachingPlanService.remove({
              templateId: activeTemplate.id,
              taskId: task.id,
            }),
          '教学任务已移除',
          { refreshDetailId: activeTemplate.id },
        ),
    });
  };

  const activateTemplate = (template: TeachingPlanTemplate) => {
    const blockers = getStartBlockers(template);
    if (blockers.length) {
      Modal.warning({
        title: '当前模板不能启动',
        content: blockers.join('；'),
      });
      return;
    }
    Modal.confirm({
      title: '启动当前模板版本？',
      content:
        '启动后将冻结节点名称、任务课时与周排期。如需修改，需要新建草稿版本。',
      okText: '确认启动',
      cancelText: '取消',
      onOk: () =>
        runOperation(
          () =>
            teachingPlanService.activate({
              id: template.id,
              operator: '当前管理员',
            }),
          '模板版本已启动',
          {
            refreshDetailId:
              activeTemplate?.id === template.id ? template.id : undefined,
          },
        ),
    });
  };

  const stopTemplate = (template: TeachingPlanTemplate) => {
    Modal.confirm({
      title: '停用当前模板版本？',
      content: '停用后不再作为当前启动版本，历史配置仍然保留。',
      okText: '确认停用',
      cancelText: '取消',
      onOk: () =>
        runOperation(
          () =>
            teachingPlanService.stop({
              id: template.id,
              operator: '当前管理员',
            }),
          '模板版本已停用',
          {
            refreshDetailId:
              activeTemplate?.id === template.id ? template.id : undefined,
          },
        ),
    });
  };

  const restartTemplate = (template: TeachingPlanTemplate) => {
    const blockers = getStartBlockers(template);
    if (blockers.length) {
      Modal.warning({
        title: '当前版本不能重新启动',
        content: blockers.join('；'),
      });
      return;
    }
    Modal.confirm({
      title: '重新启动当前模板版本？',
      content:
        '系统将重新执行完整启动校验；若同一模板已有启动版本，需要先停用该版本。',
      okText: '重新启动',
      cancelText: '取消',
      onOk: () =>
        runOperation(
          () =>
            teachingPlanService.restart({
              id: template.id,
              operator: '当前管理员',
            }),
          '模板版本已重新启动',
          {
            refreshDetailId:
              activeTemplate?.id === template.id ? template.id : undefined,
          },
        ),
    });
  };

  const createDraftVersion = (template: TeachingPlanTemplate) => {
    Modal.confirm({
      title: '基于当前版本新建草稿？',
      content: '新草稿会复制模板设置、教学任务和排序；当前版本保持不变。',
      okText: '新建草稿版本',
      cancelText: '取消',
      onOk: async () => {
        setOperationLoading(true);
        try {
          const response = await teachingPlanService.createDraftVersion({
            id: template.id,
          });
          const draftTemplate = requireApiData(response);
          message.success('草稿版本已创建');
          await fetchTemplates();
          await openTemplate(draftTemplate);
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '草稿版本创建失败',
          );
        } finally {
          setOperationLoading(false);
        }
      },
    });
  };

  const copyTemplate = async () => {
    if (!copySource) return;
    const values = await copyForm.validateFields();
    const copied = await runOperation(
      () => teachingPlanService.copy({ id: copySource.id, name: values.name }),
      '模板已复制为独立草稿',
    );
    if (copied) {
      setCopySource(null);
      copyForm.resetFields();
    }
  };

  const deleteOrArchive = (template: TeachingPlanTemplate) => {
    const isDelete = !template.everActivated;
    Modal.confirm({
      title: isDelete ? '删除这个草稿？' : '归档这个模板版本？',
      content: isDelete
        ? '删除后无法恢复；仅从未启动过的草稿允许删除。'
        : '有启动历史的版本不会物理删除，归档后仍可只读查看。',
      okText: isDelete ? '确认删除' : '确认归档',
      okButtonProps: { danger: isDelete },
      cancelText: '取消',
      onOk: () =>
        runOperation(
          () => teachingPlanService.deleteOrArchive(template.id),
          isDelete ? '草稿已删除' : '模板版本已归档',
          {
            returnToList: activeTemplate?.id === template.id,
            refreshDetailId: undefined,
          },
        ),
    });
  };

  const getMoreMenu = (template: TeachingPlanTemplate): MenuProps => ({
    items: [
      ...(template.status !== 'draft' && template.status !== 'archived'
        ? [
            {
              key: 'draft-version',
              label: '新建草稿版本',
              icon: <FileAddOutlined />,
              onClick: () => createDraftVersion(template),
            },
          ]
        : []),
      {
        key: 'copy',
        label: '复制为新模板',
        icon: <CopyOutlined />,
        onClick: () => {
          setCopySource(template);
          copyForm.setFieldsValue({ name: `${template.name}（副本）` });
        },
      },
      { type: 'divider' },
      {
        key: 'delete-or-archive',
        label: template.everActivated ? '归档版本' : '删除草稿',
        icon: <DeleteOutlined />,
        danger: !template.everActivated,
        disabled:
          template.status === 'active' || template.status === 'archived',
        onClick: () => deleteOrArchive(template),
      },
    ],
  });

  const columns: ColumnsType<TeachingPlanTemplate> = [
    {
      title: '模板',
      key: 'name',
      dataIndex: 'name',
      width: 290,
      render: (_, template) => (
        <div className="teaching-plan-name-cell">
          <Button
            type="link"
            className="teaching-plan-name-button"
            onClick={() => openTemplate(template)}
          >
            {template.name}
          </Button>
          <span className="teaching-plan-name-meta">
            {getSubjectLabel(template.subject)} · 更新于{' '}
            {formatDateTime(template.updatedAt)}
          </span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: TemplateStatus) => (
        <Tag color={STATUS_META[status].color}>{STATUS_META[status].label}</Tag>
      ),
    },
    {
      title: '版本',
      key: 'version',
      width: 130,
      render: (_, template) => (
        <div className="teaching-plan-version-cell">
          <strong>V{template.version}</strong>
          <span className="teaching-plan-version-meta">
            {template.status === 'active' ? '当前启动版本' : template.familyId}
          </span>
        </div>
      ),
    },
    {
      title: '教学容量',
      key: 'capacity',
      width: 150,
      render: (_, template) => (
        <div className="teaching-plan-capacity-cell">
          <strong>{template.totalWeeks}</strong>
          <span>周 × {formatHours(template.weeklyHours)} 课时</span>
        </div>
      ),
    },
    {
      title: '任务 / 排期',
      key: 'schedule',
      width: 160,
      render: (_, template) => (
        <Space size={5} wrap>
          <span>{template.tasks.length} 个任务</span>
          {template.schedule.hasConflicts ? (
            <Tag color="red">有冲突</Tag>
          ) : (
            <Tag color="blue">
              已排 {formatHours(template.schedule.scheduledHours)} 课时
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '启动信息',
      key: 'activatedAt',
      width: 180,
      render: (_, template) =>
        template.activatedAt ? (
          <div className="teaching-plan-version-cell">
            <strong>{template.activatedBy || '—'}</strong>
            <span className="teaching-plan-version-meta">
              {formatDateTime(template.activatedAt)}
            </span>
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 260,
      render: (_, template) => (
        <Space size={4} wrap>
          <Button
            type="link"
            size="small"
            onClick={() => openTemplate(template)}
          >
            {template.status === 'draft' ? '编辑' : '查看'}
          </Button>
          {template.status === 'draft' && (
            <Button
              type="link"
              size="small"
              disabled={getStartBlockers(template).length > 0}
              onClick={() => activateTemplate(template)}
            >
              启动
            </Button>
          )}
          {template.status === 'active' && (
            <Button
              type="link"
              size="small"
              onClick={() => stopTemplate(template)}
            >
              停用
            </Button>
          )}
          {template.status === 'stopped' && (
            <Button
              type="link"
              size="small"
              disabled={getStartBlockers(template).length > 0}
              onClick={() => restartTemplate(template)}
            >
              重新启动
            </Button>
          )}
          <Dropdown menu={getMoreMenu(template)} trigger={['click']}>
            <Button type="text" size="small" aria-label="更多模板操作">
              <MoreOutlined />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  const activeWeek: TeachingPlanWeek | undefined =
    activeTemplate?.schedule.weeks.find((week) => week.week === selectedWeek);
  const activeWeekTasks = activeTemplate
    ? getWeekAnchoredTasks(activeTemplate, selectedWeek)
    : [];
  const continuationSegments =
    activeWeek?.segments.filter((segment) => segment.continuation) || [];
  const isEditable = activeTemplate?.status === 'draft';
  const usedNodeIds = useMemo(
    () =>
      new Set(activeTemplate?.tasks.map((task) => task.resourceNodeId) || []),
    [activeTemplate],
  );
  const selectableResourceNodes = resourceNodes.filter(
    (node) => node.enabled && !usedNodeIds.has(node.id),
  );

  if (activeTemplate) {
    const startBlockers = getStartBlockers(activeTemplate);
    const weeklyPercent = activeWeek
      ? Math.min(
          100,
          Math.round((activeWeek.usedHours / activeWeek.capacity) * 100),
        )
      : 0;

    return (
      <PageContainer className="teaching-plan-page">
        <Spin spinning={detailLoading || operationLoading}>
          <div className="teaching-plan-editor-shell">
            <Card className="teaching-plan-editor-header">
              <div className="teaching-plan-editor-topline">
                <div className="teaching-plan-editor-identity">
                  <Button
                    className="teaching-plan-back-button"
                    icon={<ArrowLeftOutlined />}
                    aria-label="返回模板列表"
                    onClick={() => setActiveTemplate(null)}
                  />
                  <div>
                    <div className="teaching-plan-editor-title-row">
                      <h1 className="teaching-plan-editor-title">
                        {activeTemplate.name}
                      </h1>
                      <Tag color={STATUS_META[activeTemplate.status].color}>
                        {STATUS_META[activeTemplate.status].label}
                      </Tag>
                      <Tag>V{activeTemplate.version}</Tag>
                    </div>
                    <div className="teaching-plan-editor-meta">
                      <span>{getSubjectLabel(activeTemplate.subject)}</span>
                      <span>·</span>
                      <span>模板编号 {activeTemplate.familyId}</span>
                      <span>·</span>
                      <span>
                        更新于 {formatDateTime(activeTemplate.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="teaching-plan-editor-actions">
                  {isEditable && (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          settingsForm.setFieldsValue({
                            name: activeTemplate.name,
                            subject: activeTemplate.subject,
                            totalWeeks: activeTemplate.totalWeeks,
                            weeklyHours: activeTemplate.weeklyHours,
                          });
                          setSettingsOpen(true);
                        }}
                      >
                        模板设置
                      </Button>
                      <Button icon={<SaveOutlined />} onClick={saveDraft}>
                        保存草稿
                      </Button>
                      <Tooltip
                        title={
                          startBlockers.length
                            ? startBlockers.join('；')
                            : undefined
                        }
                      >
                        <span>
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            disabled={startBlockers.length > 0}
                            onClick={() => activateTemplate(activeTemplate)}
                          >
                            启动模板
                          </Button>
                        </span>
                      </Tooltip>
                    </>
                  )}
                  {activeTemplate.status === 'active' && (
                    <Button
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={() => stopTemplate(activeTemplate)}
                    >
                      停用版本
                    </Button>
                  )}
                  {activeTemplate.status === 'stopped' && (
                    <>
                      <Button
                        icon={<FileAddOutlined />}
                        onClick={() => createDraftVersion(activeTemplate)}
                      >
                        新建草稿版本
                      </Button>
                      <Button
                        type="primary"
                        icon={<RetweetOutlined />}
                        disabled={startBlockers.length > 0}
                        onClick={() => restartTemplate(activeTemplate)}
                      >
                        重新启动
                      </Button>
                    </>
                  )}
                  {activeTemplate.status === 'active' && (
                    <Button
                      icon={<FileAddOutlined />}
                      onClick={() => createDraftVersion(activeTemplate)}
                    >
                      新建草稿版本
                    </Button>
                  )}
                </div>
              </div>

              <div className="teaching-plan-summary-strip">
                <div className="teaching-plan-summary-item">
                  <span>计划周期</span>
                  <strong>{activeTemplate.totalWeeks} 周</strong>
                </div>
                <div className="teaching-plan-summary-item">
                  <span>每周平均课时</span>
                  <strong>
                    {formatHours(activeTemplate.weeklyHours)} 课时
                  </strong>
                </div>
                <div className="teaching-plan-summary-item">
                  <span>任务与已排课时</span>
                  <strong>
                    {activeTemplate.tasks.length} 个 /{' '}
                    {formatHours(activeTemplate.schedule.scheduledHours)} 课时
                  </strong>
                </div>
                <div
                  className={`teaching-plan-summary-item${
                    activeTemplate.schedule.hasConflicts ? ' is-danger' : ''
                  }`}
                >
                  <span>未分配 / 未排入</span>
                  <strong>
                    {formatHours(activeTemplate.schedule.unallocatedHours)} /{' '}
                    {formatHours(activeTemplate.schedule.unscheduledHours)} 课时
                  </strong>
                </div>
              </div>
            </Card>

            {startBlockers.length > 0 && isEditable && (
              <Alert
                className="teaching-plan-validation-alert"
                type="warning"
                showIcon
                message="草稿已保存，但暂不能启动"
                description={startBlockers.join('；')}
              />
            )}

            {!isEditable && (
              <Alert
                type="info"
                showIcon
                message="当前版本为只读状态"
                description="已启动或有启动历史的版本不能直接编辑。如需调整，请基于当前版本新建草稿。"
              />
            )}

            <div className="teaching-plan-workspace">
              <Card className="teaching-plan-week-nav">
                <div className="teaching-plan-week-nav-header">
                  <h2 className="teaching-plan-week-nav-title">教学周</h2>
                  <div className="teaching-plan-week-nav-note">
                    按周选择任务，系统自动续排
                  </div>
                </div>
                <div className="teaching-plan-week-list">
                  {activeTemplate.schedule.weeks.map((week) => {
                    const anchoredCount = getWeekAnchoredTasks(
                      activeTemplate,
                      week.week,
                    ).length;
                    return (
                      <button
                        type="button"
                        key={week.week}
                        className={`teaching-plan-week-button${
                          selectedWeek === week.week ? ' is-active' : ''
                        }${week.hasConflict ? ' has-conflict' : ''}`}
                        aria-current={
                          selectedWeek === week.week ? 'step' : undefined
                        }
                        onClick={() => setSelectedWeek(week.week)}
                      >
                        <span className="teaching-plan-week-number">
                          {String(week.week).padStart(2, '0')}
                        </span>
                        <span className="teaching-plan-week-copy">
                          <strong>第 {week.week} 周</strong>
                          <span>
                            {anchoredCount} 个任务 ·{' '}
                            {formatHours(week.usedHours)}/
                            {formatHours(week.capacity)} 课时
                          </span>
                        </span>
                        <span
                          className={`teaching-plan-week-state${
                            week.hasConflict
                              ? ' is-conflict'
                              : week.usedHours > 0
                              ? ' is-filled'
                              : ''
                          }`}
                          aria-label={week.hasConflict ? '有冲突' : '无冲突'}
                        />
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="teaching-plan-week-workbench">
                <div className="teaching-plan-week-heading">
                  <div className="teaching-plan-week-title">
                    <CalendarOutlined />
                    <h2>第 {selectedWeek} 周</h2>
                    {activeWeek?.hasConflict ? (
                      <Tag color="red">容量冲突</Tag>
                    ) : activeWeek && activeWeek.remainingHours === 0 ? (
                      <Tag color="green">已排满</Tag>
                    ) : (
                      <Tag color="blue">可继续配置</Tag>
                    )}
                  </div>
                  <div className="teaching-plan-week-capacity">
                    <div className="teaching-plan-week-capacity-copy">
                      <span>本周容量</span>
                      <strong>
                        已用 {formatHours(activeWeek?.usedHours || 0)} /{' '}
                        {formatHours(activeWeek?.capacity || 0)} 课时
                      </strong>
                    </div>
                    <Progress
                      percent={weeklyPercent}
                      showInfo={false}
                      status={activeWeek?.hasConflict ? 'exception' : 'normal'}
                      strokeColor={
                        activeWeek?.hasConflict ? '#c73737' : '#2459d3'
                      }
                      trailColor="#e9edf4"
                      size="small"
                    />
                  </div>
                </div>

                <div className="teaching-plan-week-content">
                  {continuationSegments.length > 0 && (
                    <>
                      <div className="teaching-plan-section-label">
                        <strong>跨周续排</strong>
                        <span>由前序任务自动生成，不可直接编辑</span>
                      </div>
                      {continuationSegments.map((segment) => (
                        <div
                          className="teaching-plan-continuation"
                          key={`${segment.taskId}-${segment.part}`}
                        >
                          <span className="teaching-plan-continuation-icon">
                            <RetweetOutlined />
                          </span>
                          <div className="teaching-plan-continuation-copy">
                            <strong>{segment.resourceNodeName}</strong>
                            <span>
                              来自第 {segment.anchorWeek} 周 · 第 {segment.part}{' '}
                              段 · 本周占用 {formatHours(segment.hours)} 课时
                            </span>
                          </div>
                          <Tag color="blue">只读续排</Tag>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="teaching-plan-section-label">
                    <strong>本周选择的教学任务</strong>
                    <span>任务顺序决定课时占用与后续跨周排期</span>
                  </div>

                  {activeWeekTasks.length ? (
                    <div className="teaching-plan-task-list">
                      {activeWeekTasks.map((task, index) => {
                        const currentWeekHours = getTaskWeekHours(
                          activeTemplate,
                          task.id,
                          selectedWeek,
                        );
                        const endWeek = getTaskEndWeek(activeTemplate, task.id);
                        return (
                          <div
                            key={task.id}
                            className={`teaching-plan-task-card${
                              task.resourceNodeEnabled ? '' : ' is-disabled'
                            }`}
                          >
                            <span className="teaching-plan-task-order">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="teaching-plan-task-copy">
                              <div className="teaching-plan-task-name">
                                <strong>{task.resourceNodeName}</strong>
                                {!task.resourceNodeEnabled && (
                                  <Tag color="red">节点已停用</Tag>
                                )}
                                {endWeek && endWeek > selectedWeek && (
                                  <Tag color="blue">续排至第 {endWeek} 周</Tag>
                                )}
                              </div>
                              <div className="teaching-plan-task-meta">
                                <span>
                                  <ClockCircleOutlined /> 建议课时{' '}
                                  {formatHours(task.hours)}
                                </span>
                                <span>·</span>
                                <span>
                                  本周排入 {formatHours(currentWeekHours)} 课时
                                </span>
                                <span>·</span>
                                <span>来源：资源树末级节点</span>
                              </div>
                            </div>
                            {isEditable && (
                              <div className="teaching-plan-task-actions">
                                <Tooltip title="上移">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<ArrowUpOutlined />}
                                    aria-label={`上移 ${task.resourceNodeName}`}
                                    disabled={index === 0}
                                    onClick={() => reorderTask(task, -1)}
                                  />
                                </Tooltip>
                                <Tooltip title="下移">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<ArrowDownOutlined />}
                                    aria-label={`下移 ${task.resourceNodeName}`}
                                    disabled={
                                      index === activeWeekTasks.length - 1
                                    }
                                    onClick={() => reorderTask(task, 1)}
                                  />
                                </Tooltip>
                                <Tooltip title="移动到其他周">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<SwapOutlined />}
                                    aria-label={`移动 ${task.resourceNodeName}`}
                                    onClick={() => {
                                      setMoveTask(task);
                                      moveForm.setFieldsValue({
                                        week: task.anchorWeek,
                                      });
                                    }}
                                  />
                                </Tooltip>
                                <Tooltip title="移除任务">
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    aria-label={`移除 ${task.resourceNodeName}`}
                                    onClick={() => removeTask(task)}
                                  />
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="teaching-plan-empty-week">
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          isEditable
                            ? '本周尚未选择任务，可主动保留为空周'
                            : '本周未配置教学任务'
                        }
                      >
                        {isEditable && (
                          <Button type="primary" onClick={openResourcePicker}>
                            选择资源节点
                          </Button>
                        )}
                      </Empty>
                    </div>
                  )}

                  <div className="teaching-plan-workbench-footer">
                    <span className="teaching-plan-workbench-hint">
                      {activeWeek?.hasConflict ? (
                        <>
                          <ExclamationCircleOutlined />{' '}
                          本周存在冲突，可保存草稿但不能启动
                        </>
                      ) : (
                        <>
                          <CheckCircleOutlined /> 剩余{' '}
                          {formatHours(activeWeek?.remainingHours || 0)} 课时
                        </>
                      )}
                    </span>
                    <Space wrap>
                      <Button
                        icon={<ArrowLeftOutlined />}
                        disabled={selectedWeek === 1}
                        onClick={() => setSelectedWeek((week) => week - 1)}
                      >
                        上一周
                      </Button>
                      {isEditable && activeWeekTasks.length > 0 && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={openResourcePicker}
                        >
                          添加任务
                        </Button>
                      )}
                      <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        disabled={selectedWeek === activeTemplate.totalWeeks}
                        onClick={() => setSelectedWeek((week) => week + 1)}
                      >
                        下一周
                      </Button>
                    </Space>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Spin>

        <Modal
          title="模板设置"
          open={settingsOpen}
          okText="保存并重新排期"
          cancelText="取消"
          confirmLoading={operationLoading}
          onOk={saveSettings}
          onCancel={() => setSettingsOpen(false)}
          destroyOnClose
        >
          <div className="teaching-plan-create-note">
            修改周数或每周课时会触发整份模板重新排期与校验；系统不会静默删除任务。
          </div>
          <Form form={settingsForm} layout="vertical" preserve={false}>
            <Form.Item
              name="name"
              label="模板名称"
              rules={[
                { required: true, whitespace: true, message: '请输入模板名称' },
              ]}
            >
              <Input maxLength={40} showCount />
            </Form.Item>
            <Form.Item label="学科">
              <Select
                value={activeTemplate.subject}
                disabled
                options={SUBJECT_OPTIONS}
              />
            </Form.Item>
            <Form.Item
              name="totalWeeks"
              label="计划周数"
              rules={[{ required: true, message: '请输入计划周数' }]}
            >
              <InputNumber min={1} max={60} precision={0} addonAfter="周" />
            </Form.Item>
            <Form.Item
              name="weeklyHours"
              label="每周平均课时"
              rules={[{ required: true, message: '请输入每周平均课时' }]}
              extra="统一应用到每一周，最小计量单位为 0.5 课时。"
            >
              <InputNumber
                min={0.5}
                max={40}
                step={0.5}
                precision={1}
                addonAfter="课时"
              />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`为第 ${selectedWeek} 周添加教学任务`}
          open={resourceOpen}
          okText="加入本周"
          cancelText="取消"
          confirmLoading={operationLoading}
          onOk={addTask}
          onCancel={() => setResourceOpen(false)}
          destroyOnClose
        >
          <div className="teaching-plan-resource-note">
            仅可选择当前学科已启用的资源树末级节点；课时由节点带入，同一模板内只能选择一次。
          </div>
          <Spin spinning={resourceLoading}>
            <Form form={resourceForm} layout="vertical" preserve={false}>
              <Form.Item
                name="resourceNodeId"
                label="资源节点"
                rules={[{ required: true, message: '请选择资源节点' }]}
              >
                <Select
                  showSearch
                  placeholder="搜索并选择末级节点"
                  optionFilterProp="searchText"
                  notFoundContent="没有可选择的资源节点"
                  options={selectableResourceNodes.map((node) => ({
                    value: node.id,
                    searchText: `${node.name} ${node.path.join(' ')}`,
                    label: (
                      <div className="teaching-plan-resource-option">
                        <div className="teaching-plan-resource-option-copy">
                          <strong>{node.name}</strong>
                          <span>{node.path.join(' / ')}</span>
                        </div>
                        <span className="teaching-plan-resource-option-hours">
                          {formatHours(node.suggestedHours)} 课时
                        </span>
                      </div>
                    ),
                  }))}
                />
              </Form.Item>
            </Form>
          </Spin>
        </Modal>

        <Modal
          title="移动教学任务"
          open={Boolean(moveTask)}
          okText="移动并重新排期"
          cancelText="取消"
          confirmLoading={operationLoading}
          onOk={moveSelectedTask}
          onCancel={() => setMoveTask(null)}
          destroyOnClose
        >
          <div className="teaching-plan-create-note">
            移动“{moveTask?.resourceNodeName}
            ”的锚定周后，整份模板会重新排期；后续人工选择的任务不会被自动移动。
          </div>
          <Form form={moveForm} layout="vertical" preserve={false}>
            <Form.Item
              name="week"
              label="目标教学周"
              rules={[{ required: true, message: '请选择目标教学周' }]}
            >
              <Select
                options={Array.from(
                  { length: activeTemplate.totalWeeks },
                  (_, index) => ({
                    label: `第 ${index + 1} 周`,
                    value: index + 1,
                  }),
                )}
              />
            </Form.Item>
          </Form>
        </Modal>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="teaching-plan-page">
      <Card className="teaching-plan-list-card">
        <div className="teaching-plan-list-header">
          <div>
            <h1 className="teaching-plan-list-title">教学计划模板</h1>
            <p className="teaching-plan-list-description">
              后台按学科维护教学周容量与任务顺序，系统根据资源节点建议课时自动完成跨周排期。
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            创建模板
          </Button>
        </div>
        <Table<TeachingPlanTemplate>
          className="teaching-plan-list-table"
          rowKey="id"
          loading={loading || operationLoading}
          dataSource={templates}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1280 }}
          locale={{
            emptyText: (
              <Empty description="还没有教学计划模板">
                <Button type="primary" onClick={() => setCreateOpen(true)}>
                  创建第一个模板
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title="创建教学计划模板"
        open={createOpen}
        okText="创建并配置任务"
        cancelText="取消"
        confirmLoading={operationLoading}
        onOk={createTemplate}
        onCancel={() => setCreateOpen(false)}
        destroyOnClose
      >
        <div className="teaching-plan-create-note">
          先确定计划周期和统一周课时，创建后再按周选择教学任务。模板无需配置复习阶段。
        </div>
        <Form
          form={createForm}
          layout="vertical"
          preserve={false}
          initialValues={{ totalWeeks: 20, weeklyHours: 4 }}
        >
          <Form.Item
            name="subject"
            label="学科"
            rules={[{ required: true, message: '请选择学科' }]}
          >
            <Select placeholder="请选择学科" options={SUBJECT_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="name"
            label="模板名称"
            rules={[
              { required: true, whitespace: true, message: '请输入模板名称' },
            ]}
            extra="同一学科内名称不可重复。"
          >
            <Input
              placeholder="例如：九年级历史基础复习计划"
              maxLength={40}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="totalWeeks"
            label="计划周数"
            rules={[{ required: true, message: '请输入计划周数' }]}
          >
            <InputNumber min={1} max={60} precision={0} addonAfter="周" />
          </Form.Item>
          <Form.Item
            name="weeklyHours"
            label="每周平均课时"
            rules={[{ required: true, message: '请输入每周平均课时' }]}
            extra="统一应用到每一周，最小计量单位为 0.5 课时。"
          >
            <InputNumber
              min={0.5}
              max={40}
              step={0.5}
              precision={1}
              addonAfter="课时"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="复制教学计划模板"
        open={Boolean(copySource)}
        okText="复制为独立草稿"
        cancelText="取消"
        confirmLoading={operationLoading}
        onOk={copyTemplate}
        onCancel={() => setCopySource(null)}
        destroyOnClose
      >
        <div className="teaching-plan-create-note">
          将复制周数、每周课时、任务及其顺序。新模板与原模板互不影响。
        </div>
        <Form form={copyForm} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="新模板名称"
            rules={[
              { required: true, whitespace: true, message: '请输入新模板名称' },
            ]}
            extra={`学科沿用“${getSubjectLabel(copySource?.subject || '')}”。`}
          >
            <Input maxLength={40} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default TeachingPlanTemplatePage;
