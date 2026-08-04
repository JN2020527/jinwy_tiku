import {
  isValidClassHours,
  isValidTotalWeeks,
  scheduleTeachingPlan,
} from './scheduler';
import {
  AddTeachingPlanTaskInput,
  CopyTeachingPlanTemplateInput,
  CreateDraftVersionInput,
  CreateTeachingPlanTemplateInput,
  DeleteOrArchiveTeachingPlanTemplateResult,
  MoveTeachingPlanTaskInput,
  OperateTeachingPlanTemplateInput,
  RemoveTeachingPlanTaskInput,
  ReorderTeachingPlanTasksInput,
  SchedulableResourceNode,
  TeachingPlanTask,
  TeachingPlanTemplate,
  TeachingPlanTemplateListParams,
  UpdateTeachingPlanTemplateInput,
} from './types';

export type TeachingPlanDomainErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'DUPLICATE_NAME'
  | 'DUPLICATE_RESOURCE_NODE'
  | 'SUBJECT_LOCKED'
  | 'NOT_EDITABLE'
  | 'INVALID_TRANSITION'
  | 'ACTIVATION_VALIDATION_FAILED';

export class TeachingPlanDomainError extends Error {
  constructor(
    public readonly code: TeachingPlanDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TeachingPlanDomainError';
  }
}

const clone = <T>(value: T): T => structuredClone(value);

const normalizeName = (value: string): string => value.trim();

const normalizeOrders = (tasks: TeachingPlanTask[]): TeachingPlanTask[] => {
  const next = clone(tasks);
  const byWeek = new Map<number, TeachingPlanTask[]>();
  next.forEach((task) => {
    const group = byWeek.get(task.anchorWeek) ?? [];
    group.push(task);
    byWeek.set(task.anchorWeek, group);
  });
  byWeek.forEach((group) => {
    group
      .sort((left, right) => left.order - right.order)
      .forEach((task, index) => {
        task.order = index;
      });
  });
  return next;
};

export class TeachingPlanTemplateStore {
  private templates: TeachingPlanTemplate[];
  private sequence = 0;

  constructor(seed: TeachingPlanTemplate[] = []) {
    this.templates = clone(seed);
  }

  list(params: TeachingPlanTemplateListParams = {}): TeachingPlanTemplate[] {
    return clone(
      this.templates.filter(
        (template) =>
          (!params.subject || template.subject === params.subject) &&
          (!params.status || template.status === params.status),
      ),
    );
  }

  get(id: string): TeachingPlanTemplate {
    return clone(this.find(id));
  }

  create(input: CreateTeachingPlanTemplateInput): TeachingPlanTemplate {
    const name = normalizeName(input.name);
    const subject = input.subject.trim();
    this.validateTemplateBasics({ ...input, name, subject });
    this.assertUniqueName(subject, name);

    const now = this.now();
    const id = this.nextId('teaching-plan');
    const template: TeachingPlanTemplate = {
      id,
      familyId: id,
      version: 1,
      name,
      subject,
      totalWeeks: input.totalWeeks,
      weeklyHours: input.weeklyHours,
      status: 'draft',
      everActivated: false,
      tasks: [],
      schedule: scheduleTeachingPlan({
        totalWeeks: input.totalWeeks,
        weeklyHours: input.weeklyHours,
        tasks: [],
      }),
      createdAt: now,
      updatedAt: now,
      updatedBy: input.operator ?? '系统',
    };
    this.templates.push(template);
    return clone(template);
  }

  update(input: UpdateTeachingPlanTemplateInput): TeachingPlanTemplate {
    const template = this.find(input.id);
    this.assertDraft(template);

    const name =
      input.name === undefined ? template.name : normalizeName(input.name);
    const subject =
      input.subject === undefined ? template.subject : input.subject.trim();
    const totalWeeks = input.totalWeeks ?? template.totalWeeks;
    const weeklyHours = input.weeklyHours ?? template.weeklyHours;
    this.validateTemplateBasics({ name, subject, totalWeeks, weeklyHours });

    if (template.tasks.length > 0 && subject !== template.subject) {
      throw new TeachingPlanDomainError(
        'SUBJECT_LOCKED',
        '模板已有教学任务，不能修改学科',
      );
    }
    this.assertUniqueName(subject, name, template.familyId);

    Object.assign(template, { name, subject, totalWeeks, weeklyHours });
    return this.reschedule(template, input.operator);
  }

  add(input: AddTeachingPlanTaskInput): TeachingPlanTemplate {
    const template = this.find(input.templateId);
    this.assertDraft(template);
    this.assertResourceNodeSelectable(template, input.resourceNode);
    this.assertWeekInPlan(template, input.anchorWeek);

    if (
      template.tasks.some(
        (task) => task.resourceNodeId === input.resourceNode.id,
      )
    ) {
      throw new TeachingPlanDomainError(
        'DUPLICATE_RESOURCE_NODE',
        '同一资源节点在一个模板内只能选择一次',
      );
    }

    const siblings = template.tasks
      .filter((task) => task.anchorWeek === input.anchorWeek)
      .sort((left, right) => left.order - right.order);
    const index = Math.max(
      0,
      Math.min(input.index ?? siblings.length, siblings.length),
    );
    siblings.splice(index, 0, {
      id: this.nextId('teaching-task'),
      resourceNodeId: input.resourceNode.id,
      resourceNodeName: input.resourceNode.name,
      resourceNodeEnabled: input.resourceNode.enabled,
      resourceReferenceMode: 'dynamic',
      hours: input.resourceNode.suggestedHours,
      anchorWeek: input.anchorWeek,
      order: index,
    });
    siblings.forEach((task, order) => {
      task.order = order;
    });
    template.tasks = [
      ...template.tasks.filter((task) => task.anchorWeek !== input.anchorWeek),
      ...siblings,
    ];
    return this.reschedule(template, input.operator);
  }

  move(input: MoveTeachingPlanTaskInput): TeachingPlanTemplate {
    const template = this.find(input.templateId);
    this.assertDraft(template);
    this.assertWeekInPlan(template, input.toWeek);
    const task = template.tasks.find((item) => item.id === input.taskId);
    if (!task) {
      throw new TeachingPlanDomainError('NOT_FOUND', '教学任务不存在');
    }

    const remainingTasks = template.tasks.filter(
      (item) => item.id !== input.taskId,
    );
    const targetSiblings = remainingTasks
      .filter((item) => item.anchorWeek === input.toWeek)
      .sort((left, right) => left.order - right.order);
    const targetIndex = Math.max(
      0,
      Math.min(input.toIndex ?? targetSiblings.length, targetSiblings.length),
    );
    targetSiblings.splice(targetIndex, 0, {
      ...task,
      anchorWeek: input.toWeek,
      order: targetIndex,
    });
    template.tasks = normalizeOrders([
      ...remainingTasks.filter((item) => item.anchorWeek !== input.toWeek),
      ...targetSiblings,
    ]);
    return this.reschedule(template, input.operator);
  }

  reorder(input: ReorderTeachingPlanTasksInput): TeachingPlanTemplate {
    const template = this.find(input.templateId);
    this.assertDraft(template);
    const weekTasks = template.tasks.filter(
      (task) => task.anchorWeek === input.week,
    );
    const currentIds = new Set(weekTasks.map((task) => task.id));
    const requestedIds = new Set(input.taskIds);
    if (
      currentIds.size !== requestedIds.size ||
      [...currentIds].some((id) => !requestedIds.has(id))
    ) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '排序任务必须与该周现有任务完全一致',
      );
    }
    const orderById = new Map(input.taskIds.map((id, index) => [id, index]));
    template.tasks.forEach((task) => {
      if (task.anchorWeek === input.week) {
        task.order = orderById.get(task.id) ?? task.order;
      }
    });
    return this.reschedule(template, input.operator);
  }

  remove(input: RemoveTeachingPlanTaskInput): TeachingPlanTemplate {
    const template = this.find(input.templateId);
    this.assertDraft(template);
    const nextTasks = template.tasks.filter((task) => task.id !== input.taskId);
    if (nextTasks.length === template.tasks.length) {
      throw new TeachingPlanDomainError('NOT_FOUND', '教学任务不存在');
    }
    template.tasks = normalizeOrders(nextTasks);
    return this.reschedule(template, input.operator);
  }

  activate(input: OperateTeachingPlanTemplateInput): TeachingPlanTemplate {
    const template = this.find(input.id);
    this.assertDraft(template);
    return this.activateVersion(template, input.operator);
  }

  stop(input: OperateTeachingPlanTemplateInput): TeachingPlanTemplate {
    const template = this.find(input.id);
    if (template.status !== 'active') {
      throw new TeachingPlanDomainError(
        'INVALID_TRANSITION',
        '只有当前启动版本可以停用',
      );
    }
    template.status = 'stopped';
    template.updatedAt = this.now();
    template.updatedBy = input.operator;
    return clone(template);
  }

  restart(input: OperateTeachingPlanTemplateInput): TeachingPlanTemplate {
    const template = this.find(input.id);
    if (template.status !== 'stopped') {
      throw new TeachingPlanDomainError(
        'INVALID_TRANSITION',
        '只有已停用版本可以重新启动',
      );
    }
    return this.activateVersion(template, input.operator);
  }

  createDraftVersion(input: CreateDraftVersionInput): TeachingPlanTemplate {
    const source = this.find(input.id);
    if (!source.everActivated) {
      throw new TeachingPlanDomainError(
        'INVALID_TRANSITION',
        '只有曾启动的模板版本才能派生新草稿',
      );
    }
    const existingDraft = this.templates.find(
      (template) =>
        template.familyId === source.familyId && template.status === 'draft',
    );
    if (existingDraft) {
      return clone(existingDraft);
    }

    const now = this.now();
    const version = Math.max(
      ...this.templates
        .filter((template) => template.familyId === source.familyId)
        .map((template) => template.version),
    );
    const draft: TeachingPlanTemplate = {
      ...clone(source),
      id: this.nextId('teaching-plan'),
      version: version + 1,
      status: 'draft',
      everActivated: true,
      tasks: source.tasks.map((task) => ({
        ...clone(task),
        id: this.nextId('teaching-task'),
      })),
      activatedSnapshot: undefined,
      activatedAt: undefined,
      activatedBy: undefined,
      createdAt: now,
      updatedAt: now,
      updatedBy: input.operator ?? '系统',
    };
    draft.schedule = scheduleTeachingPlan(draft);
    this.templates.push(draft);
    return clone(draft);
  }

  copy(input: CopyTeachingPlanTemplateInput): TeachingPlanTemplate {
    const source = this.find(input.id);
    const name = normalizeName(input.name);
    this.validateTemplateBasics({ ...source, name });
    this.assertUniqueName(source.subject, name);

    const now = this.now();
    const id = this.nextId('teaching-plan');
    const copied: TeachingPlanTemplate = {
      ...clone(source),
      id,
      familyId: id,
      version: 1,
      name,
      status: 'draft',
      everActivated: false,
      tasks: source.tasks.map((task) => ({
        ...clone(task),
        id: this.nextId('teaching-task'),
      })),
      activatedSnapshot: undefined,
      activatedAt: undefined,
      activatedBy: undefined,
      createdAt: now,
      updatedAt: now,
      updatedBy: input.operator ?? '系统',
    };
    copied.schedule = scheduleTeachingPlan(copied);
    this.templates.push(copied);
    return clone(copied);
  }

  deleteOrArchive(
    id: string,
    operator = '系统',
  ): DeleteOrArchiveTeachingPlanTemplateResult {
    const template = this.find(id);
    if (template.status === 'active') {
      throw new TeachingPlanDomainError(
        'INVALID_TRANSITION',
        '当前启动版本必须先停用，才能归档',
      );
    }
    const familyWasActivated = this.templates.some(
      (item) => item.familyId === template.familyId && item.everActivated,
    );
    if (!familyWasActivated && template.status === 'draft') {
      this.templates = this.templates.filter((item) => item.id !== id);
      return { action: 'deleted' };
    }
    template.status = 'archived';
    template.updatedAt = this.now();
    template.updatedBy = operator;
    return { action: 'archived', template: clone(template) };
  }

  countTaskReferences(resourceNodeIds: Iterable<string>): number {
    const targetIds = new Set(resourceNodeIds);
    return this.templates.reduce(
      (count, template) =>
        count +
        template.tasks.filter((task) => targetIds.has(task.resourceNodeId))
          .length,
      0,
    );
  }

  /** 草稿读取到资源节点最新排期属性后，用此入口同步并重新排期。 */
  refreshDraftResourceNodes(
    id: string,
    nodes: SchedulableResourceNode[],
  ): TeachingPlanTemplate {
    const template = this.find(id);
    this.assertDraft(template);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    let changed = false;
    template.tasks.forEach((task) => {
      const node = byId.get(task.resourceNodeId);
      if (node) {
        if (
          task.resourceNodeName !== node.name ||
          task.resourceNodeEnabled !== node.enabled ||
          task.hours !== node.suggestedHours
        ) {
          task.resourceNodeName = node.name;
          task.resourceNodeEnabled = node.enabled;
          task.hours = node.suggestedHours;
          changed = true;
        }
      } else if (task.resourceNodeEnabled) {
        task.resourceNodeEnabled = false;
        changed = true;
      }
    });
    return changed ? this.reschedule(template, '系统同步') : clone(template);
  }

  /** 启动历史版本时只校验节点当前可用性，不改写其冻结课时和名称。 */
  assertResourceNodesAvailable(
    id: string,
    nodes: SchedulableResourceNode[],
  ): void {
    const template = this.find(id);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const invalidTask = template.tasks.find((task) => {
      const node = byId.get(task.resourceNodeId);
      return (
        !node ||
        !node.enabled ||
        node.subject !== template.subject ||
        !isValidClassHours(node.suggestedHours)
      );
    });
    if (invalidTask) {
      throw new TeachingPlanDomainError(
        'ACTIVATION_VALIDATION_FAILED',
        `资源节点「${invalidTask.resourceNodeName}」当前不可用，不能启动`,
      );
    }
  }

  private reschedule(
    template: TeachingPlanTemplate,
    operator = '系统',
  ): TeachingPlanTemplate {
    template.tasks = normalizeOrders(template.tasks);
    template.schedule = scheduleTeachingPlan(template);
    template.updatedAt = this.now();
    template.updatedBy = operator;
    return clone(template);
  }

  private assertCanActivate(template: TeachingPlanTemplate): void {
    if (template.tasks.length === 0) {
      throw new TeachingPlanDomainError(
        'ACTIVATION_VALIDATION_FAILED',
        '空模板不能启动',
      );
    }
    template.schedule = scheduleTeachingPlan(template);
    if (
      template.schedule.hasConflicts ||
      template.tasks.some((task) => !task.resourceNodeEnabled)
    ) {
      throw new TeachingPlanDomainError(
        'ACTIVATION_VALIDATION_FAILED',
        '模板存在无效资源、排期冲突或超容量，不能启动',
      );
    }
  }

  private activateVersion(
    template: TeachingPlanTemplate,
    operator: string,
  ): TeachingPlanTemplate {
    // 先完成整份校验，再切换当前版本，避免失败时中断线上生效版本。
    this.assertCanActivate(template);

    const activatedAt = this.now();
    this.templates.forEach((item) => {
      if (
        item.familyId === template.familyId &&
        item.id !== template.id &&
        item.status === 'active'
      ) {
        item.status = 'stopped';
        item.updatedAt = activatedAt;
        item.updatedBy = operator;
      }
    });
    template.status = 'active';
    template.everActivated = true;
    template.activatedAt = activatedAt;
    template.activatedBy = operator;
    template.activatedSnapshot = {
      tasks: clone(template.tasks),
      schedule: clone(template.schedule),
      activatedAt,
      activatedBy: operator,
    };
    template.updatedAt = activatedAt;
    template.updatedBy = operator;
    return clone(template);
  }

  private assertResourceNodeSelectable(
    template: TeachingPlanTemplate,
    node: SchedulableResourceNode,
  ): void {
    if (!node.enabled) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '停用的资源节点不能加入教学计划',
      );
    }
    if (node.subject !== template.subject) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '只能选择与模板学科一致的资源节点',
      );
    }
    if (!isValidClassHours(node.suggestedHours)) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '资源节点建议课时必须为大于 0 的 0.5 课时倍数',
      );
    }
  }

  private assertWeekInPlan(template: TeachingPlanTemplate, week: number): void {
    if (!isValidTotalWeeks(week) || week > template.totalWeeks) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '任务锚定周不在模板总周数范围内',
      );
    }
  }

  private assertDraft(template: TeachingPlanTemplate): void {
    if (template.status !== 'draft') {
      throw new TeachingPlanDomainError(
        'NOT_EDITABLE',
        '已启动或历史版本不能原地编辑，请先创建新草稿版本',
      );
    }
  }

  private assertUniqueName(
    subject: string,
    name: string,
    ignoredFamilyId?: string,
  ): void {
    if (
      this.templates.some(
        (template) =>
          template.subject === subject &&
          template.name === name &&
          template.familyId !== ignoredFamilyId,
      )
    ) {
      throw new TeachingPlanDomainError(
        'DUPLICATE_NAME',
        '同一学科下教学计划模板名称不能重复',
      );
    }
  }

  private validateTemplateBasics(input: {
    name: string;
    subject: string;
    totalWeeks: number;
    weeklyHours: number;
  }): void {
    if (!input.name || !input.subject) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '模板名称和学科不能为空',
      );
    }
    if (!isValidTotalWeeks(input.totalWeeks)) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '教学计划总周数必须为正整数',
      );
    }
    if (!isValidClassHours(input.weeklyHours)) {
      throw new TeachingPlanDomainError(
        'INVALID_INPUT',
        '每周平均课时必须为大于 0 的 0.5 课时倍数',
      );
    }
  }

  private find(id: string): TeachingPlanTemplate {
    const template = this.templates.find((item) => item.id === id);
    if (!template) {
      throw new TeachingPlanDomainError('NOT_FOUND', '教学计划模板不存在');
    }
    return template;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${Date.now()}-${this.sequence}`;
  }

  private now(): string {
    return new Date().toISOString();
  }
}
