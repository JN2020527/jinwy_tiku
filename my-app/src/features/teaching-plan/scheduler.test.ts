import assert from 'node:assert/strict';
import test from 'node:test';

import { scheduleTeachingPlan } from './scheduler';

test('按人工锚定周排期，并把跨周续排放在下一周顶部', () => {
  const schedule = scheduleTeachingPlan({
    totalWeeks: 3,
    weeklyHours: 4,
    tasks: [
      {
        id: 'task-a',
        resourceNodeId: 'node-a',
        resourceNodeName: '中国古代史',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 5,
        anchorWeek: 1,
        order: 0,
      },
      {
        id: 'task-b',
        resourceNodeId: 'node-b',
        resourceNodeName: '中国近现代史',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 3,
        anchorWeek: 2,
        order: 0,
      },
      {
        id: 'task-c',
        resourceNodeId: 'node-c',
        resourceNodeName: '世界现代史',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 0.5,
        anchorWeek: 3,
        order: 0,
      },
    ],
  });

  assert.deepEqual(
    schedule.weeks.map((week) =>
      week.segments.map((segment) => ({
        taskId: segment.taskId,
        hours: segment.hours,
        continuation: segment.continuation,
      })),
    ),
    [
      [{ taskId: 'task-a', hours: 4, continuation: false }],
      [
        { taskId: 'task-a', hours: 1, continuation: true },
        { taskId: 'task-b', hours: 3, continuation: false },
      ],
      [{ taskId: 'task-c', hours: 0.5, continuation: false }],
    ],
  );
  assert.equal(schedule.hasConflicts, false);
  assert.equal(schedule.unallocatedHours, 3.5);
});

test('保留主动空周，并在续排占用锚定周时自动顺延后续任务', () => {
  const schedule = scheduleTeachingPlan({
    totalWeeks: 3,
    weeklyHours: 2,
    tasks: [
      {
        id: 'task-a',
        resourceNodeId: 'node-a',
        resourceNodeName: '跨周任务',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 3,
        anchorWeek: 1,
        order: 0,
      },
      {
        id: 'task-b',
        resourceNodeId: 'node-b',
        resourceNodeName: '第二周人工任务甲',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 1,
        anchorWeek: 2,
        order: 0,
      },
      {
        id: 'task-c',
        resourceNodeId: 'node-c',
        resourceNodeName: '第二周人工任务乙',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 1,
        anchorWeek: 2,
        order: 1,
      },
    ],
  });

  assert.deepEqual(
    schedule.weeks.map((week) =>
      week.segments.map((segment) => ({
        taskId: segment.taskId,
        hours: segment.hours,
        continuation: segment.continuation,
      })),
    ),
    [
      [{ taskId: 'task-a', hours: 2, continuation: false }],
      [
        { taskId: 'task-a', hours: 1, continuation: true },
        { taskId: 'task-b', hours: 1, continuation: false },
      ],
      [{ taskId: 'task-c', hours: 1, continuation: false }],
    ],
  );
  assert.equal(schedule.hasConflicts, false);
  assert.equal(schedule.unscheduledHours, 0);
  assert.equal(schedule.unallocatedHours, 1);
});

test('课时容量统一采用 0.5 课时步长', () => {
  assert.throws(
    () => scheduleTeachingPlan({ totalWeeks: 2, weeklyHours: 1.25, tasks: [] }),
    /0\.5 课时倍数/,
  );
});

test('前一任务刚好排满本周时，后续任务自动顺延但不误标为续排', () => {
  const schedule = scheduleTeachingPlan({
    totalWeeks: 2,
    weeklyHours: 4,
    tasks: [
      {
        id: 'task-full',
        resourceNodeId: 'node-full',
        resourceNodeName: '排满本周',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 4,
        anchorWeek: 1,
        order: 0,
      },
      {
        id: 'task-next',
        resourceNodeId: 'node-next',
        resourceNodeName: '下一周开始',
        resourceNodeEnabled: true,
        resourceReferenceMode: 'dynamic',
        hours: 1,
        anchorWeek: 1,
        order: 1,
      },
    ],
  });

  assert.deepEqual(
    schedule.weeks.map((week) =>
      week.segments.map((segment) => ({
        taskId: segment.taskId,
        hours: segment.hours,
        continuation: segment.continuation,
      })),
    ),
    [
      [{ taskId: 'task-full', hours: 4, continuation: false }],
      [{ taskId: 'task-next', hours: 1, continuation: false }],
    ],
  );
});
