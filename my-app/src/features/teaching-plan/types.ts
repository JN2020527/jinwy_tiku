export const CLASS_HOUR_STEP = 0.5;

export type TeachingPlanTemplateStatus =
  | 'draft'
  | 'active'
  | 'stopped'
  | 'archived';

export interface SchedulableResourceNode {
  id: string;
  name: string;
  path: string[];
  subject: string;
  suggestedHours: number;
  enabled: boolean;
}

export interface TeachingPlanTask {
  id: string;
  resourceNodeId: string;
  resourceNodeName: string;
  resourceNodeEnabled: boolean;
  /** 节点下的课件、学案等内容始终按当前资源动态读取。 */
  resourceReferenceMode: 'dynamic';
  hours: number;
  /** 人工选择任务时所在的周；自动排期不得改写该锚点。 */
  anchorWeek: number;
  order: number;
}

export interface TeachingPlanTaskSegment {
  taskId: string;
  resourceNodeId: string;
  resourceNodeName: string;
  hours: number;
  anchorWeek: number;
  continuation: boolean;
  part: number;
}

export type TeachingPlanScheduleConflictType =
  | 'duplicate-resource-node'
  | 'invalid-resource-node'
  | 'invalid-task-hours'
  | 'invalid-anchor-week'
  | 'week-over-capacity'
  | 'outside-plan';

export interface TeachingPlanScheduleConflict {
  type: TeachingPlanScheduleConflictType;
  message: string;
  taskId?: string;
  week?: number;
}

export interface TeachingPlanWeek {
  week: number;
  capacity: number;
  usedHours: number;
  remainingHours: number;
  segments: TeachingPlanTaskSegment[];
  hasConflict: boolean;
}

export interface TeachingPlanSchedule {
  weeks: TeachingPlanWeek[];
  totalCapacity: number;
  scheduledHours: number;
  unallocatedHours: number;
  unscheduledHours: number;
  hasConflicts: boolean;
  conflicts: TeachingPlanScheduleConflict[];
}

export interface ActivatedTeachingPlanSnapshot {
  tasks: TeachingPlanTask[];
  schedule: TeachingPlanSchedule;
  activatedAt: string;
  activatedBy: string;
}

export interface TeachingPlanTemplate {
  id: string;
  /** 同一模板所有版本共享的身份。 */
  familyId: string;
  version: number;
  name: string;
  subject: string;
  totalWeeks: number;
  weeklyHours: number;
  status: TeachingPlanTemplateStatus;
  everActivated: boolean;
  tasks: TeachingPlanTask[];
  schedule: TeachingPlanSchedule;
  activatedSnapshot?: ActivatedTeachingPlanSnapshot;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  activatedBy?: string;
}

export interface ScheduleTeachingPlanInput {
  totalWeeks: number;
  weeklyHours: number;
  tasks: TeachingPlanTask[];
}

export interface CreateTeachingPlanTemplateInput {
  name: string;
  subject: string;
  totalWeeks: number;
  weeklyHours: number;
}

export interface UpdateTeachingPlanTemplateInput {
  id: string;
  name?: string;
  subject?: string;
  totalWeeks?: number;
  weeklyHours?: number;
}

export interface AddTeachingPlanTaskInput {
  templateId: string;
  resourceNode: SchedulableResourceNode;
  anchorWeek: number;
  index?: number;
}

export interface MoveTeachingPlanTaskInput {
  templateId: string;
  taskId: string;
  toWeek: number;
  toIndex?: number;
}

export interface ReorderTeachingPlanTasksInput {
  templateId: string;
  week: number;
  taskIds: string[];
}

export interface RemoveTeachingPlanTaskInput {
  templateId: string;
  taskId: string;
}

export interface OperateTeachingPlanTemplateInput {
  id: string;
  operator: string;
}

export interface CreateDraftVersionInput {
  id: string;
}

export interface CopyTeachingPlanTemplateInput {
  id: string;
  name: string;
}

export interface TeachingPlanTemplateListParams {
  subject?: string;
  status?: TeachingPlanTemplateStatus;
}

export interface DeleteOrArchiveTeachingPlanTemplateResult {
  action: 'deleted' | 'archived';
  template?: TeachingPlanTemplate;
}
