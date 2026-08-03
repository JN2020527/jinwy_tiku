import {
  CLASS_HOUR_STEP,
  ScheduleTeachingPlanInput,
  TeachingPlanSchedule,
  TeachingPlanScheduleConflict,
  TeachingPlanTask,
} from './types';

export const isValidClassHours = (value: number): boolean =>
  Number.isFinite(value) &&
  value > 0 &&
  Number.isInteger(value / CLASS_HOUR_STEP);

export const isValidTotalWeeks = (value: number): boolean =>
  Number.isInteger(value) && value > 0;

const sortTasks = (tasks: TeachingPlanTask[]): TeachingPlanTask[] =>
  [...tasks].sort(
    (left, right) =>
      left.anchorWeek - right.anchorWeek ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );

export const scheduleTeachingPlan = ({
  totalWeeks,
  weeklyHours,
  tasks,
}: ScheduleTeachingPlanInput): TeachingPlanSchedule => {
  if (!isValidTotalWeeks(totalWeeks)) {
    throw new Error('教学计划总周数必须为正整数');
  }
  if (!isValidClassHours(weeklyHours)) {
    throw new Error('每周平均课时必须为大于 0 的 0.5 课时倍数');
  }

  const weeks = Array.from({ length: totalWeeks }, (_, index) => ({
    week: index + 1,
    capacity: weeklyHours,
    usedHours: 0,
    remainingHours: weeklyHours,
    segments: [],
    hasConflict: false,
  })) as TeachingPlanSchedule['weeks'];
  const conflicts: TeachingPlanScheduleConflict[] = [];
  let unscheduledHours = 0;

  const seenResourceNodeIds = new Set<string>();
  const groups = new Map<number, TeachingPlanTask[]>();
  for (const task of sortTasks(tasks)) {
    if (seenResourceNodeIds.has(task.resourceNodeId)) {
      conflicts.push({
        type: 'duplicate-resource-node',
        taskId: task.id,
        week: task.anchorWeek,
        message: `资源节点「${task.resourceNodeName}」在模板内重复`,
      });
    }
    seenResourceNodeIds.add(task.resourceNodeId);

    if (!task.resourceNodeEnabled) {
      conflicts.push({
        type: 'invalid-resource-node',
        taskId: task.id,
        week: task.anchorWeek,
        message: `资源节点「${task.resourceNodeName}」已停用`,
      });
    }
    if (!isValidClassHours(task.hours)) {
      conflicts.push({
        type: 'invalid-task-hours',
        taskId: task.id,
        week: task.anchorWeek,
        message: `任务「${task.resourceNodeName}」课时必须为 0.5 的倍数`,
      });
      continue;
    }
    if (!isValidTotalWeeks(task.anchorWeek) || task.anchorWeek > totalWeeks) {
      conflicts.push({
        type: 'invalid-anchor-week',
        taskId: task.id,
        week: task.anchorWeek,
        message: `任务「${task.resourceNodeName}」的锚定周不在计划范围内`,
      });
      unscheduledHours += task.hours;
      continue;
    }
    const group = groups.get(task.anchorWeek) ?? [];
    group.push(task);
    groups.set(task.anchorWeek, group);
  }

  for (const [anchorWeek, group] of [...groups.entries()].sort(
    ([left], [right]) => left - right,
  )) {
    let cursorWeek = anchorWeek;
    let groupWeekRemaining = weeklyHours;

    for (const task of sortTasks(group)) {
      let taskRemaining = task.hours;
      let part = 1;
      while (taskRemaining > 0 && cursorWeek <= totalWeeks) {
        if (groupWeekRemaining === 0) {
          cursorWeek += 1;
          groupWeekRemaining = weeklyHours;
          if (cursorWeek > totalWeeks) break;
        }
        const hours = Math.min(taskRemaining, groupWeekRemaining);
        weeks[cursorWeek - 1].segments.push({
          taskId: task.id,
          resourceNodeId: task.resourceNodeId,
          resourceNodeName: task.resourceNodeName,
          hours,
          anchorWeek: task.anchorWeek,
          continuation: part > 1 || cursorWeek > task.anchorWeek,
          part,
        });
        taskRemaining -= hours;
        groupWeekRemaining -= hours;
        if (taskRemaining > 0) {
          cursorWeek += 1;
          groupWeekRemaining = weeklyHours;
          part += 1;
        }
      }
      if (taskRemaining > 0) {
        unscheduledHours += taskRemaining;
        conflicts.push({
          type: 'outside-plan',
          taskId: task.id,
          week: totalWeeks,
          message: `任务「${task.resourceNodeName}」有 ${taskRemaining} 课时超出计划范围`,
        });
      }
    }
  }

  for (const week of weeks) {
    week.usedHours = week.segments.reduce(
      (sum, segment) => sum + segment.hours,
      0,
    );
    week.remainingHours = Math.max(0, week.capacity - week.usedHours);
    if (week.usedHours > week.capacity) {
      week.hasConflict = true;
      conflicts.push({
        type: 'week-over-capacity',
        week: week.week,
        message: `第 ${week.week} 周超出 ${
          week.usedHours - week.capacity
        } 课时`,
      });
    }
  }

  const scheduledHours = weeks.reduce((sum, week) => sum + week.usedHours, 0);
  const unallocatedHours = weeks.reduce(
    (sum, week) => sum + week.remainingHours,
    0,
  );

  return {
    weeks,
    totalCapacity: totalWeeks * weeklyHours,
    scheduledHours,
    unallocatedHours,
    unscheduledHours,
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
};
