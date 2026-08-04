import type {
  ApiResponse,
  SchedulableResourceNode,
  TeachingPlanTask,
  TeachingPlanTemplate,
} from '@/services/teachingPlan';
import { teachingPlanService } from '@/services/teachingPlan';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EllipsisOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RetweetOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { MenuProps } from 'antd';
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './index.less';

type TemplateStatus = TeachingPlanTemplate['status'];
type TemplateListStatus = TemplateStatus | 'active-with-draft';

interface TemplateFamilyRow {
  familyId: string;
  current: TeachingPlanTemplate;
  active?: TeachingPlanTemplate;
  draft?: TeachingPlanTemplate;
  status: TemplateListStatus;
}

interface TemplateFormValues {
  name: string;
  subject: string;
  totalWeeks: number;
  weeklyHours: number;
}

interface CopyFormValues {
  name: string;
}

interface PendingConfirmation {
  title: React.ReactNode;
  content: React.ReactNode;
  okText: string;
  danger?: boolean;
  operation: () => Promise<unknown>;
}

type TeachingPlanDragPayload =
  | { kind: 'resource'; resourceNodeId: string }
  | { kind: 'task'; taskId: string; fromWeek: number };

interface TeachingPlanDropTarget {
  week: number;
  index: number;
}

interface ResourceTreeBranch {
  key: string;
  label: string;
  children: ResourceTreeBranch[];
  resources: SchedulableResourceNode[];
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

const TEACHING_PLAN_DRAG_MIME = 'application/x-teaching-plan-task';

const STATUS_META: Record<TemplateStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  active: { label: '已启动', color: 'green' },
  stopped: { label: '已停用', color: 'orange' },
  archived: { label: '已归档', color: 'default' },
};

const LIST_STATUS_META: Record<
  TemplateListStatus,
  { label: string; color: string }
> = {
  ...STATUS_META,
  'active-with-draft': {
    label: '已启动 · 有未发布修改',
    color: 'blue',
  },
};

const groupTemplateFamilies = (
  templates: TeachingPlanTemplate[],
): TemplateFamilyRow[] => {
  const families = new Map<string, TeachingPlanTemplate[]>();
  templates.forEach((template) => {
    const versions = families.get(template.familyId) ?? [];
    versions.push(template);
    families.set(template.familyId, versions);
  });

  return [...families.entries()].map(([familyId, versions]) => {
    const sortedVersions = [...versions].sort(
      (left, right) => right.version - left.version,
    );
    const draft = sortedVersions.find(
      (template) => template.status === 'draft',
    );
    const active = sortedVersions.find(
      (template) => template.status === 'active',
    );
    const stopped = sortedVersions.find(
      (template) => template.status === 'stopped',
    );
    const current = draft ?? active ?? stopped ?? sortedVersions[0];
    return {
      familyId,
      current,
      active,
      draft,
      status: active && draft ? 'active-with-draft' : current.status,
    };
  });
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
  const otherConflict = template.schedule.conflicts.find(
    (conflict) => conflict.type !== 'outside-plan',
  );
  if (otherConflict) blockers.push(otherConflict.message);
  if (template.schedule.unscheduledHours > 0) {
    blockers.push(
      `任务总课时超出计划范围，仍有 ${formatHours(
        template.schedule.unscheduledHours,
      )} 课时未排入`,
    );
  }
  return blockers;
};

const getWeekAnchoredTasks = (template: TeachingPlanTemplate, week: number) =>
  template.tasks
    .filter((task) => task.anchorWeek === week)
    .sort((left, right) => left.order - right.order);

const buildResourceTree = (
  resources: SchedulableResourceNode[],
): ResourceTreeBranch[] => {
  const root: ResourceTreeBranch = {
    key: 'root',
    label: 'root',
    children: [],
    resources: [],
  };

  resources.forEach((resource) => {
    const parentPath =
      resource.path[resource.path.length - 1] === resource.name
        ? resource.path.slice(0, -1)
        : resource.path;
    let current = root;
    parentPath.forEach((label, index) => {
      const key = parentPath.slice(0, index + 1).join('/');
      let branch = current.children.find((item) => item.key === key);
      if (!branch) {
        branch = { key, label, children: [], resources: [] };
        current.children.push(branch);
      }
      current = branch;
    });
    current.resources.push(resource);
  });

  return root.children;
};

interface ResourceTreePanelProps {
  resources: SchedulableResourceNode[];
  usedNodeIds: Set<string>;
  editable: boolean;
  loading: boolean;
  onAdd: (resource: SchedulableResourceNode) => void;
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    resource: SchedulableResourceNode,
  ) => void;
  onDragEnd: () => void;
}

const ResourceTreePanel: React.FC<ResourceTreePanelProps> = ({
  resources,
  usedNodeIds,
  editable,
  loading,
  onAdd,
  onDragStart,
  onDragEnd,
}) => {
  const [keyword, setKeyword] = useState('');
  const visibleResources = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return resources;
    return resources.filter((resource) =>
      `${resource.name} ${resource.path.join(' ')}`
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [keyword, resources]);
  const resourceTree = useMemo(
    () => buildResourceTree(visibleResources),
    [visibleResources],
  );

  const renderResource = (resource: SchedulableResourceNode) => {
    const used = usedNodeIds.has(resource.id);
    const available = editable && resource.enabled && !used;
    return (
      <div
        className={`teaching-plan-resource-leaf${
          available ? ' is-draggable' : ' is-used'
        }`}
        key={resource.id}
        draggable={available}
        onDragStart={(event) => available && onDragStart(event, resource)}
        onDragEnd={onDragEnd}
      >
        <span className="teaching-plan-resource-drag-handle" aria-hidden>
          <HolderOutlined />
        </span>
        <div className="teaching-plan-resource-leaf-copy">
          <strong>
            <span className="teaching-plan-resource-name">
              {resource.name}
            </span>
            <span className="teaching-plan-resource-hours">
              {formatHours(resource.suggestedHours)} 课时
            </span>
          </strong>
        </div>
        <Button
          size="small"
          disabled={!available}
          onClick={() => onAdd(resource)}
        >
          {used ? '已使用' : '选择'}
        </Button>
      </div>
    );
  };

  const renderBranch = (branch: ResourceTreeBranch, depth = 0) => (
    <details
      className={`teaching-plan-resource-branch depth-${Math.min(depth, 3)}`}
      key={branch.key}
      open
    >
      <summary>
        <DownOutlined className="teaching-plan-resource-chevron" />
        <span>{branch.label}</span>
      </summary>
      <div className="teaching-plan-resource-branch-content">
        {branch.children.map((child) => renderBranch(child, depth + 1))}
        {branch.resources.map(renderResource)}
      </div>
    </details>
  );

  return (
    <aside className="teaching-plan-resource-panel">
      <div className="teaching-plan-resource-panel-header">
        <strong>可选复习任务</strong>
        <Tag color="blue">资源树</Tag>
      </div>
      <Input
        allowClear
        className="teaching-plan-resource-search"
        prefix={<SearchOutlined />}
        placeholder="搜索资源名称或路径"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      <Spin spinning={loading}>
        <div className="teaching-plan-resource-tree">
          {resourceTree.length ? (
            resourceTree.map((branch) => renderBranch(branch))
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="没有匹配的可选任务"
            />
          )}
        </div>
      </Spin>
    </aside>
  );
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
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [copySource, setCopySource] = useState<TeachingPlanTemplate | null>(
    null,
  );
  const [resourceNodes, setResourceNodes] = useState<SchedulableResourceNode[]>(
    [],
  );
  const [resourceLoading, setResourceLoading] = useState(false);
  const [dragPayload, setDragPayload] =
    useState<TeachingPlanDragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<TeachingPlanDropTarget | null>(
    null,
  );
  const [createForm] = Form.useForm<TemplateFormValues>();
  const [settingsForm] = Form.useForm<TemplateFormValues>();
  const [copyForm] = Form.useForm<CopyFormValues>();
  const templateFamilies = useMemo(
    () => groupTemplateFamilies(templates),
    [templates],
  );

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
      () =>
        teachingPlanService.create({
          ...values,
          operator: '当前管理员',
        }),
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
          operator: '当前管理员',
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
          operator: '当前管理员',
        }),
      '草稿已保存',
      { refreshDetailId: activeTemplate.id },
    );
  };

  const fetchResourceNodes = useCallback(async (subject: string) => {
    setResourceLoading(true);
    try {
      const response = await teachingPlanService.getSchedulableResourceNodes({
        subject,
      });
      setResourceNodes(requireApiData(response));
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '资源节点加载失败',
      );
    } finally {
      setResourceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeTemplate) {
      setResourceNodes([]);
      return;
    }
    fetchResourceNodes(activeTemplate.subject);
  }, [activeTemplate?.id, activeTemplate?.subject, fetchResourceNodes]);

  const addResourceToWeek = async (
    resourceNode: SchedulableResourceNode,
    week: number,
    index?: number,
  ) => {
    if (!activeTemplate) return;
    const added = await runOperation(
      () =>
        teachingPlanService.add({
          templateId: activeTemplate.id,
          resourceNode,
          anchorWeek: week,
          index,
          operator: '当前管理员',
        }),
      `已加入第 ${week} 周`,
      { refreshDetailId: activeTemplate.id },
    );
    if (added) setSelectedWeek(week);
    return added;
  };

  const startResourceDrag = (
    event: React.DragEvent<HTMLDivElement>,
    resourceNode: SchedulableResourceNode,
  ) => {
    const payload: TeachingPlanDragPayload = {
      kind: 'resource',
      resourceNodeId: resourceNode.id,
    };
    setDragPayload(payload);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      TEACHING_PLAN_DRAG_MIME,
      JSON.stringify(payload),
    );
  };

  const startTaskDrag = (
    event: React.DragEvent<HTMLDivElement>,
    task: TeachingPlanTask,
  ) => {
    const payload: TeachingPlanDragPayload = {
      kind: 'task',
      taskId: task.id,
      fromWeek: task.anchorWeek,
    };
    setDragPayload(payload);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      TEACHING_PLAN_DRAG_MIME,
      JSON.stringify(payload),
    );
  };

  const finishDragging = () => {
    setDragPayload(null);
    setDropTarget(null);
  };

  const dropIntoWeek = async (
    event: React.DragEvent<HTMLElement>,
    week: number,
    index: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!activeTemplate || activeTemplate.status !== 'draft') {
      finishDragging();
      return;
    }

    let payload = dragPayload;
    if (!payload) {
      try {
        payload = JSON.parse(
          event.dataTransfer.getData(TEACHING_PLAN_DRAG_MIME),
        ) as TeachingPlanDragPayload;
      } catch {
        payload = null;
      }
    }
    finishDragging();
    if (!payload) return;

    if (payload.kind === 'resource') {
      const resourceNode = resourceNodes.find(
        (node) => node.id === payload.resourceNodeId,
      );
      if (resourceNode) await addResourceToWeek(resourceNode, week, index);
      return;
    }

    const task = activeTemplate.tasks.find(
      (item) => item.id === payload.taskId,
    );
    if (!task) return;
    if (payload.fromWeek !== week) {
      await runOperation(
        () =>
          teachingPlanService.move({
            templateId: activeTemplate.id,
            taskId: task.id,
            toWeek: week,
            toIndex: index,
            operator: '当前管理员',
          }),
        `任务已移动到第 ${week} 周`,
        { refreshDetailId: activeTemplate.id },
      );
      setSelectedWeek(week);
      return;
    }

    const weekTasks = getWeekAnchoredTasks(activeTemplate, week);
    const currentIndex = weekTasks.findIndex((item) => item.id === task.id);
    if (currentIndex < 0) return;
    const reorderedTasks = weekTasks.filter((item) => item.id !== task.id);
    const normalizedIndex = Math.max(
      0,
      Math.min(currentIndex < index ? index - 1 : index, reorderedTasks.length),
    );
    reorderedTasks.splice(normalizedIndex, 0, task);
    if (
      reorderedTasks.every(
        (item, itemIndex) => item.id === weekTasks[itemIndex].id,
      )
    ) {
      return;
    }
    await runOperation(
      () =>
        teachingPlanService.reorder({
          templateId: activeTemplate.id,
          week,
          taskIds: reorderedTasks.map((item) => item.id),
          operator: '当前管理员',
        }),
      '任务顺序已调整，排期已重新计算',
      { refreshDetailId: activeTemplate.id },
    );
  };

  const removeTask = (task: TeachingPlanTask) => {
    if (!activeTemplate) return;
    setPendingConfirmation({
      title: '移除这个教学任务？',
      content: `“${task.resourceNodeName}”及其跨周续排片段将一并移除，后续排期会重新计算。`,
      okText: '移除任务',
      danger: true,
      operation: () =>
        runOperation(
          () =>
            teachingPlanService.remove({
              templateId: activeTemplate.id,
              taskId: task.id,
              operator: '当前管理员',
            }),
          '教学任务已移除',
          { refreshDetailId: activeTemplate.id },
        ),
    });
  };

  const activateTemplate = (template: TeachingPlanTemplate) => {
    const blockers = getStartBlockers(template);
    const replacesActiveTemplate = templates.some(
      (item) => item.familyId === template.familyId && item.status === 'active',
    );
    if (blockers.length) {
      message.warning(blockers.join('；'));
      return;
    }
    setPendingConfirmation({
      title: replacesActiveTemplate ? '发布模板更新？' : '启动当前模板？',
      content: replacesActiveTemplate
        ? '系统会先校验整份排期。校验通过后修改立即生效；校验失败时，当前已启动内容保持不变。'
        : '系统会先校验整份排期。启动后模板内容将生效，后续修改需要再次发布。',
      okText: replacesActiveTemplate ? '发布更新' : '确认启动',
      operation: () =>
        runOperation(
          () =>
            teachingPlanService.activate({
              id: template.id,
              operator: '当前管理员',
            }),
          replacesActiveTemplate ? '模板更新已发布' : '模板已启动',
          {
            refreshDetailId:
              activeTemplate?.id === template.id ? template.id : undefined,
          },
        ),
    });
  };

  const stopTemplate = (template: TeachingPlanTemplate) => {
    setPendingConfirmation({
      title: '停用当前模板？',
      content: '停用后模板不再生效，已有配置仍然保留。',
      okText: '确认停用',
      operation: () =>
        runOperation(
          () =>
            teachingPlanService.stop({
              id: template.id,
              operator: '当前管理员',
            }),
          '模板已停用',
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
      message.warning(blockers.join('；'));
      return;
    }
    setPendingConfirmation({
      title: '重新启动当前模板？',
      content:
        '系统将重新执行完整启动校验；校验通过后模板重新生效，校验失败时当前生效内容保持不变。',
      okText: '重新启动',
      operation: () =>
        runOperation(
          () =>
            teachingPlanService.restart({
              id: template.id,
              operator: '当前管理员',
            }),
          '模板已重新启动',
          {
            refreshDetailId:
              activeTemplate?.id === template.id ? template.id : undefined,
          },
        ),
    });
  };

  const editTemplate = async (template: TeachingPlanTemplate) => {
    if (template.status === 'draft' || template.status === 'archived') {
      await openTemplate(template);
      return;
    }

    setOperationLoading(true);
    try {
      const response = await teachingPlanService.createDraftVersion({
        id: template.id,
        operator: '当前管理员',
      });
      const draftTemplate = requireApiData(response);
      await fetchTemplates();
      await openTemplate(draftTemplate);
      message.success(
        template.status === 'active'
          ? '已进入编辑，当前已启动内容继续生效'
          : '已进入编辑',
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '进入编辑失败');
    } finally {
      setOperationLoading(false);
    }
  };

  const copyTemplate = async () => {
    if (!copySource) return;
    const values = await copyForm.validateFields();
    const copied = await runOperation(
      () =>
        teachingPlanService.copy({
          id: copySource.id,
          name: values.name,
          operator: '当前管理员',
        }),
      '模板已复制为独立草稿',
    );
    if (copied) {
      setCopySource(null);
      copyForm.resetFields();
    }
  };

  const deleteOrArchive = (template: TeachingPlanTemplate) => {
    const isDelete = !template.everActivated;
    const isDiscardDraft =
      template.status === 'draft' && template.everActivated;
    setPendingConfirmation({
      title: isDelete
        ? '删除这个草稿？'
        : isDiscardDraft
        ? '放弃未发布修改？'
        : '归档这个模板？',
      content: isDelete
        ? '删除后无法恢复；仅从未启动过的草稿允许删除。'
        : isDiscardDraft
        ? '未发布修改将被放弃，当前已启动内容不受影响。'
        : '归档后模板仍可只读查看。',
      okText: isDelete ? '确认删除' : isDiscardDraft ? '放弃修改' : '确认归档',
      danger: isDelete || isDiscardDraft,
      operation: () =>
        runOperation(
          () => teachingPlanService.deleteOrArchive(template.id),
          isDelete
            ? '草稿已删除'
            : isDiscardDraft
            ? '未发布修改已放弃'
            : '模板已归档',
          {
            returnToList: activeTemplate?.id === template.id,
            refreshDetailId: undefined,
          },
        ),
    });
  };

  const getMoreMenu = (row: TemplateFamilyRow): MenuProps => {
    const template = row.current;
    const isDiscardDraft = Boolean(row.draft?.everActivated);
    return {
      items: [
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
          label: isDiscardDraft
            ? '放弃未发布修改'
            : template.everActivated
            ? '归档模板'
            : '删除草稿',
          icon: <DeleteOutlined />,
          danger: !template.everActivated || isDiscardDraft,
          disabled:
            template.status === 'active' || template.status === 'archived',
          onClick: () => deleteOrArchive(template),
        },
      ],
    };
  };

  const confirmationModal = (
    <Modal
      title={pendingConfirmation?.title}
      open={Boolean(pendingConfirmation)}
      okText={pendingConfirmation?.okText}
      okButtonProps={{ danger: pendingConfirmation?.danger }}
      cancelText="取消"
      confirmLoading={operationLoading}
      onCancel={() => setPendingConfirmation(null)}
      onOk={() => {
        if (!pendingConfirmation) return;
        const operation = pendingConfirmation.operation;
        setPendingConfirmation(null);
        void operation();
      }}
      transitionName=""
      maskTransitionName=""
      destroyOnHidden
    >
      {pendingConfirmation?.content}
    </Modal>
  );

  const columns: ProColumns<TemplateFamilyRow>[] = [
    {
      title: '模板名称',
      key: 'name',
      width: 220,
      search: false,
      render: (_, row) => (
        <Typography.Link strong onClick={() => openTemplate(row.current)}>
          {row.current.name}
        </Typography.Link>
      ),
    },
    {
      title: '学科',
      key: 'subject',
      width: 80,
      search: false,
      render: (_, row) => getSubjectLabel(row.current.subject),
    },
    {
      title: '状态',
      key: 'status',
      width: 180,
      search: false,
      render: (_, row) => (
        <Tag color={LIST_STATUS_META[row.status].color}>
          {LIST_STATUS_META[row.status].label}
        </Tag>
      ),
    },
    {
      title: '教学容量',
      key: 'capacity',
      width: 150,
      search: false,
      render: (_, row) => (
        <span>
          {row.current.totalWeeks} 周 × {formatHours(row.current.weeklyHours)}{' '}
          课时
        </span>
      ),
    },
    {
      title: '任务数',
      key: 'taskCount',
      width: 90,
      search: false,
      render: (_, row) => `${row.current.tasks.length} 个`,
    },
    {
      title: '排期进度',
      key: 'scheduleProgress',
      width: 170,
      search: false,
      render: (_, row) => (
        <Space size={5}>
          <span>
            {formatHours(row.current.schedule.scheduledHours)} /{' '}
            {formatHours(row.current.totalWeeks * row.current.weeklyHours)} 课时
          </span>
          {row.current.schedule.hasConflicts && <Tag color="red">有冲突</Tag>}
        </Space>
      ),
    },
    {
      title: '更新人',
      key: 'updatedBy',
      width: 120,
      search: false,
      render: (_, row) => row.current.updatedBy || '—',
    },
    {
      title: '更新时间',
      key: 'updatedAt',
      width: 160,
      search: false,
      render: (_, row) => formatDateTime(row.current.updatedAt),
    },
    {
      title: '操作',
      key: 'actions',
      valueType: 'option',
      align: 'right',
      fixed: 'right',
      width: 180,
      search: false,
      render: (_, row) => {
        const template = row.current;
        const actions: React.ReactNode[] = [];

        if (row.draft) {
          actions.push(
            <Typography.Link
              key="edit"
              onClick={() => openTemplate(row.draft!)}
            >
              {row.active ? '继续编辑' : '编辑'}
            </Typography.Link>,
            <Typography.Link
              key="start"
              disabled={getStartBlockers(row.draft).length > 0}
              onClick={() => activateTemplate(row.draft!)}
            >
              {row.active ? '发布更新' : '启动'}
            </Typography.Link>,
          );
        } else if (template.status === 'active') {
          actions.push(
            <Typography.Link key="edit" onClick={() => editTemplate(template)}>
              编辑
            </Typography.Link>,
            <Typography.Link key="stop" onClick={() => stopTemplate(template)}>
              停用
            </Typography.Link>,
          );
        } else if (template.status === 'stopped') {
          actions.push(
            <Typography.Link key="edit" onClick={() => editTemplate(template)}>
              编辑
            </Typography.Link>,
            <Typography.Link
              key="restart"
              disabled={getStartBlockers(template).length > 0}
              onClick={() => restartTemplate(template)}
            >
              重新启动
            </Typography.Link>,
          );
        } else {
          actions.push(
            <Typography.Link key="view" onClick={() => openTemplate(template)}>
              查看
            </Typography.Link>,
          );
        }

        actions.push(
          <Dropdown key="more" menu={getMoreMenu(row)} trigger={['click']}>
            <Button
              className="teaching-plan-table-more"
              type="text"
              size="small"
              icon={<EllipsisOutlined />}
              aria-label="更多模板操作"
            />
          </Dropdown>,
        );

        return (
          <Flex
            align="center"
            justify="flex-end"
            gap={8}
            style={{ width: '100%' }}
          >
            {actions}
          </Flex>
        );
      },
    },
  ];

  const isEditable = activeTemplate?.status === 'draft';
  const usedNodeIds = useMemo(
    () =>
      new Set(activeTemplate?.tasks.map((task) => task.resourceNodeId) || []),
    [activeTemplate],
  );
  if (activeTemplate) {
    const taskById = new Map(
      activeTemplate.tasks.map((task) => [task.id, task]),
    );
    const taskStartWeekById = new Map<string, number>();
    activeTemplate.schedule.weeks.forEach((week) => {
      week.segments.forEach((segment) => {
        if (segment.part === 1)
          taskStartWeekById.set(segment.taskId, week.week);
      });
    });
    const startBlockers = getStartBlockers(activeTemplate);
    const isPublishingUpdate =
      activeTemplate.status === 'draft' &&
      templates.some(
        (template) =>
          template.familyId === activeTemplate.familyId &&
          template.status === 'active',
      );
    const detailStatus: TemplateListStatus = isPublishingUpdate
      ? 'active-with-draft'
      : activeTemplate.status;
    return (
      <PageContainer
        className="teaching-plan-page teaching-plan-editor-page"
        title="教学计划模板编辑"
        breadcrumbRender={false}
      >
        <Spin spinning={detailLoading || operationLoading}>
          <div className="teaching-plan-editor-shell">
            <Card
              className="teaching-plan-editor-header"
              variant="borderless"
              title={
                <div className="teaching-plan-editor-identity">
                  <Space size={8} align="center" wrap>
                    <Button
                      className="teaching-plan-back-button"
                      type="text"
                      size="small"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setActiveTemplate(null)}
                    >
                      返回
                    </Button>
                    <Typography.Text
                      strong
                      className="teaching-plan-editor-title"
                    >
                      {activeTemplate.name}
                    </Typography.Text>
                    <Tag color={LIST_STATUS_META[detailStatus].color}>
                      {LIST_STATUS_META[detailStatus].label}
                    </Tag>
                  </Space>
                  <div className="teaching-plan-editor-meta">
                    <span>
                      学科：
                      <strong>{getSubjectLabel(activeTemplate.subject)}</strong>
                    </span>
                    <i aria-hidden />
                    <span>
                      <strong>{activeTemplate.totalWeeks}</strong> 周 × 每周{' '}
                      <strong>{formatHours(activeTemplate.weeklyHours)}</strong>{' '}
                      课时
                    </span>
                    <i aria-hidden />
                    <span className="teaching-plan-autosaved-status">
                      已自动保存
                    </span>
                  </div>
                </div>
              }
              extra={
                <div className="teaching-plan-editor-actions">
                  {isEditable && (
                    <>
                      <Button
                        size="small"
                        icon={<SettingOutlined />}
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
                            size="small"
                            icon={<PlayCircleOutlined />}
                            disabled={startBlockers.length > 0}
                            onClick={() => activateTemplate(activeTemplate)}
                          >
                            {isPublishingUpdate ? '发布更新' : '启动模板'}
                          </Button>
                        </span>
                      </Tooltip>
                    </>
                  )}
                  {activeTemplate.status === 'active' && (
                    <>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => editTemplate(activeTemplate)}
                      >
                        编辑
                      </Button>
                      <Button
                        danger
                        size="small"
                        icon={<PauseCircleOutlined />}
                        onClick={() => stopTemplate(activeTemplate)}
                      >
                        停用模板
                      </Button>
                    </>
                  )}
                  {activeTemplate.status === 'stopped' && (
                    <>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => editTemplate(activeTemplate)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        icon={<RetweetOutlined />}
                        disabled={startBlockers.length > 0}
                        onClick={() => restartTemplate(activeTemplate)}
                      >
                        重新启动
                      </Button>
                    </>
                  )}
                </div>
              }
            />

            {startBlockers.length > 0 && isEditable && (
              <Alert
                className="teaching-plan-validation-alert"
                type="warning"
                showIcon
                message={
                  isPublishingUpdate
                    ? '修改已保存，但暂不能发布'
                    : '草稿已保存，但暂不能启动'
                }
                description={startBlockers.join('；')}
              />
            )}

            {!isEditable && (
              <Alert
                type="info"
                showIcon
                message="当前模板为只读状态"
                description="点击“编辑”即可修改；发布更新前，当前已启动内容会继续生效。"
              />
            )}

            <div className="teaching-plan-board-layout">
              <ResourceTreePanel
                resources={resourceNodes}
                usedNodeIds={usedNodeIds}
                editable={Boolean(isEditable)}
                loading={resourceLoading}
                onAdd={(resource) => addResourceToWeek(resource, selectedWeek)}
                onDragStart={startResourceDrag}
                onDragEnd={finishDragging}
              />

              <section
                className="teaching-plan-weeks-board"
                aria-label="教学周排期"
              >
                <div className="teaching-plan-board-guide">
                  <InfoCircleOutlined />
                  <span>
                    拖拽任务到任意周卡可安排进度；跨周内容优先续排，后续任务按顺序自动顺延。
                  </span>
                </div>
                <div className="teaching-plan-weeks-grid" role="listbox">
                  {activeTemplate.schedule.weeks.map((week) => {
                    const anchoredWeekTasks = getWeekAnchoredTasks(
                      activeTemplate,
                      week.week,
                    );
                    const weekTasks = anchoredWeekTasks.filter(
                      (task) =>
                        (taskStartWeekById.get(task.id) ?? task.anchorWeek) ===
                        week.week,
                    );
                    const weekContinuations = week.segments.filter(
                      (segment) => segment.continuation,
                    );
                    const weekDeferredSegments = week.segments.filter(
                      (segment) =>
                        segment.part === 1 && segment.anchorWeek < week.week,
                    );
                    const isDropWeek = dropTarget?.week === week.week;
                    const showEndDropIndicator =
                      isDropWeek && dropTarget.index === weekTasks.length;

                    return (
                      <article
                        className={`teaching-plan-week-card${
                          selectedWeek === week.week ? ' is-selected' : ''
                        }${isDropWeek ? ' is-drop-target' : ''}${
                          week.hasConflict ? ' has-conflict' : ''
                        }`}
                        key={week.week}
                        role="option"
                        aria-label={`第 ${week.week} 周，已排 ${formatHours(
                          week.usedHours,
                        )} 课时`}
                        aria-selected={selectedWeek === week.week}
                        onClick={() => setSelectedWeek(week.week)}
                        onDragOver={(event) => {
                          if (!isEditable) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect =
                            dragPayload?.kind === 'resource' ? 'copy' : 'move';
                          setDropTarget({
                            week: week.week,
                            index: weekTasks.length,
                          });
                        }}
                        onDragLeave={(event) => {
                          const nextTarget = event.relatedTarget as Node | null;
                          if (
                            !nextTarget ||
                            !event.currentTarget.contains(nextTarget)
                          ) {
                            setDropTarget((current) =>
                              current?.week === week.week ? null : current,
                            );
                          }
                        }}
                        onDrop={(event) =>
                          dropIntoWeek(event, week.week, weekTasks.length)
                        }
                      >
                        <header className="teaching-plan-week-card-header">
                          <strong>第 {week.week} 周</strong>
                          <span
                            className={
                              week.hasConflict
                                ? 'is-conflict'
                                : week.remainingHours > 0 && week.usedHours > 0
                                ? 'has-remaining'
                                : undefined
                            }
                          >
                            {formatHours(week.usedHours)}/
                            {formatHours(week.capacity)} 课时
                          </span>
                        </header>

                        <div className="teaching-plan-week-card-body">
                          {weekContinuations.map((segment) => (
                            <div
                              className="teaching-plan-week-continuation"
                              key={`${segment.taskId}-${segment.part}`}
                              title="跨周续排片段不可直接编辑"
                            >
                              <div>
                                <span>
                                  续排 {formatHours(segment.hours)} 课时
                                </span>
                                <strong>
                                  {segment.resourceNodeName}（续）
                                </strong>
                              </div>
                              <Tag color="blue">只读</Tag>
                            </div>
                          ))}

                          {weekDeferredSegments.map((segment) => {
                            const task = taskById.get(segment.taskId);
                            if (!task) return null;
                            return (
                              <div
                                className="teaching-plan-week-task is-deferred"
                                key={`deferred-${segment.taskId}`}
                                draggable={isEditable}
                                title={`原定第 ${segment.anchorWeek} 周，因前序任务占用容量自动顺延`}
                                onDragStart={(event) =>
                                  startTaskDrag(event, task)
                                }
                                onDragEnd={finishDragging}
                              >
                                <HolderOutlined className="teaching-plan-week-task-handle" />
                                <strong>{task.resourceNodeName}</strong>
                                <span>
                                  {formatHours(segment.hours)} 课时 · 顺延
                                </span>
                                {isEditable && (
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    aria-label={`移除 ${task.resourceNodeName}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeTask(task);
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}

                          {weekTasks.map((task, index) => {
                            const firstSegment = week.segments.find(
                              (segment) =>
                                segment.taskId === task.id &&
                                segment.part === 1,
                            );
                            const showBeforeIndicator =
                              isDropWeek && dropTarget.index === index;
                            return (
                              <React.Fragment key={task.id}>
                                {showBeforeIndicator && (
                                  <div className="teaching-plan-drop-indicator">
                                    插入到此处
                                  </div>
                                )}
                                <div
                                  className={`teaching-plan-week-task${
                                    task.resourceNodeEnabled
                                      ? ''
                                      : ' is-disabled'
                                  }`}
                                  draggable={isEditable}
                                  onDragStart={(event) =>
                                    startTaskDrag(event, task)
                                  }
                                  onDragEnd={finishDragging}
                                  onDragOver={(event) => {
                                    if (!isEditable) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const bounds =
                                      event.currentTarget.getBoundingClientRect();
                                    setDropTarget({
                                      week: week.week,
                                      index:
                                        event.clientY >
                                        bounds.top + bounds.height / 2
                                          ? index + 1
                                          : index,
                                    });
                                  }}
                                  onDrop={(event) =>
                                    dropIntoWeek(
                                      event,
                                      week.week,
                                      dropTarget?.week === week.week
                                        ? dropTarget.index
                                        : index,
                                    )
                                  }
                                >
                                  <HolderOutlined className="teaching-plan-week-task-handle" />
                                  <strong>{task.resourceNodeName}</strong>
                                  <span>
                                    {formatHours(
                                      firstSegment?.hours ?? task.hours,
                                    )}{' '}
                                    课时
                                    {firstSegment &&
                                    firstSegment.hours < task.hours
                                      ? ` / 共 ${formatHours(task.hours)}`
                                      : ''}
                                  </span>
                                  {isEditable && (
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      aria-label={`移除 ${task.resourceNodeName}`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeTask(task);
                                      }}
                                    />
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}

                          {showEndDropIndicator && (
                            <div className="teaching-plan-drop-indicator">
                              插入到此处
                            </div>
                          )}
                        </div>

                        {week.hasConflict && (
                          <footer className="teaching-plan-week-card-warning">
                            本周存在容量冲突
                          </footer>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="teaching-plan-editor-footer">
              <div className="teaching-plan-footer-schedule">
                <span>当前已排</span>
                <Tag color="blue">
                  {formatHours(activeTemplate.schedule.scheduledHours)} /{' '}
                  {formatHours(activeTemplate.schedule.totalCapacity)} 课时
                </Tag>
              </div>
              <Space>
                <Button onClick={() => setActiveTemplate(null)}>取消</Button>
                {isEditable && (
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={saveDraft}
                  >
                    保存草稿
                  </Button>
                )}
              </Space>
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
          destroyOnHidden
        >
          <Alert
            className="teaching-plan-form-note"
            type="info"
            showIcon
            message="修改周数或每周课时会触发整份模板重新排期与校验；系统不会自动删除任务。"
          />
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

        {confirmationModal}
      </PageContainer>
    );
  }

  return (
    <PageContainer className="teaching-plan-page">
      <ProTable<TemplateFamilyRow>
        rowKey="familyId"
        search={false}
        loading={loading || operationLoading}
        dataSource={templateFamilies}
        columns={columns}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={() => setCreateOpen(true)}
          >
            <PlusOutlined /> 创建模板
          </Button>,
        ]}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 1240 }}
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

      <Modal
        title="创建教学计划模板"
        open={createOpen}
        okText="创建并配置任务"
        cancelText="取消"
        confirmLoading={operationLoading}
        onOk={createTemplate}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
      >
        <Alert
          className="teaching-plan-form-note"
          type="info"
          showIcon
          message="先确定计划周期和统一周课时，创建后再按周选择教学任务。模板无需配置复习阶段。"
        />
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
        destroyOnHidden
      >
        <Alert
          className="teaching-plan-form-note"
          type="info"
          showIcon
          message="将复制周数、每周课时、任务及其顺序。新模板与原模板互不影响。"
        />
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
      {confirmationModal}
    </PageContainer>
  );
};

export default TeachingPlanTemplatePage;
