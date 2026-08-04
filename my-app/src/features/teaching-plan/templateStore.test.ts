import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TeachingPlanDomainError,
  TeachingPlanTemplateStore,
} from './templateStore';

const historyNode = {
  id: 'history-ancient',
  name: '中国古代史',
  path: ['历史', '中国史', '中国古代史'],
  subject: 'history',
  suggestedHours: 4.5,
  enabled: true,
};

test('草稿允许保存排期冲突，但启动必须通过完整校验并冻结排期', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '历史基础复习',
    subject: 'history',
    totalWeeks: 1,
    weeklyHours: 4,
  });

  const conflicted = store.add({
    templateId: draft.id,
    resourceNode: historyNode,
    anchorWeek: 1,
  });
  assert.equal(conflicted.schedule.hasConflicts, true);
  assert.equal(conflicted.schedule.unscheduledHours, 0.5);
  assert.throws(
    () => store.activate({ id: draft.id, operator: '运营甲' }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'ACTIVATION_VALIDATION_FAILED',
  );

  store.update({ id: draft.id, weeklyHours: 5 });
  const active = store.activate({ id: draft.id, operator: '运营甲' });
  assert.equal(active.status, 'active');
  assert.equal(active.activatedSnapshot?.tasks[0].hours, 4.5);
  assert.equal(active.activatedSnapshot?.schedule.hasConflicts, false);
  assert.equal(active.tasks[0].resourceReferenceMode, 'dynamic');
});

test('任务可在周内移动到指定顺序，且不改变人工锚定周以外的任务', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '历史任务排序',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
  });
  const first = store.add({
    templateId: draft.id,
    resourceNode: historyNode,
    anchorWeek: 1,
  });
  const second = store.add({
    templateId: draft.id,
    resourceNode: {
      ...historyNode,
      id: 'history-modern',
      name: '中国近现代史',
      suggestedHours: 1,
    },
    anchorWeek: 1,
  });
  const secondTask = second.tasks.find(
    (task) => task.resourceNodeId === 'history-modern',
  );
  assert.ok(secondTask);

  const moved = store.move({
    templateId: draft.id,
    taskId: secondTask.id,
    toWeek: 1,
    toIndex: 0,
  });

  assert.deepEqual(
    moved.tasks
      .filter((task) => task.anchorWeek === 1)
      .sort((left, right) => left.order - right.order)
      .map((task) => task.resourceNodeId),
    ['history-modern', historyNode.id],
  );
  assert.equal(first.tasks[0].anchorWeek, 1);
});

test('全周画布支持按落点新增、周内重排和跨周移动并实时重算续排', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '全周拖拽模板',
    subject: 'history',
    totalWeeks: 3,
    weeklyHours: 2,
  });
  const firstWeekNode = {
    ...historyNode,
    id: 'history-spanning',
    name: '跨周任务',
    suggestedHours: 2.5,
  };
  const secondWeekFirstNode = {
    ...historyNode,
    id: 'history-second-first',
    name: '第二周任务甲',
    suggestedHours: 1,
  };
  const secondWeekInsertedNode = {
    ...historyNode,
    id: 'history-second-inserted',
    name: '第二周任务乙',
    suggestedHours: 0.5,
  };

  store.add({
    templateId: draft.id,
    resourceNode: secondWeekFirstNode,
    anchorWeek: 2,
  });
  const inserted = store.add({
    templateId: draft.id,
    resourceNode: secondWeekInsertedNode,
    anchorWeek: 2,
    index: 0,
  });
  assert.deepEqual(
    inserted.tasks
      .filter((task) => task.anchorWeek === 2)
      .sort((left, right) => left.order - right.order)
      .map((task) => task.resourceNodeId),
    [secondWeekInsertedNode.id, secondWeekFirstNode.id],
  );
  assert.equal(inserted.schedule.weeks[0].usedHours, 0);

  const withContinuation = store.add({
    templateId: draft.id,
    resourceNode: firstWeekNode,
    anchorWeek: 1,
  });
  assert.deepEqual(
    withContinuation.schedule.weeks[1].segments.map((segment) => ({
      resourceNodeId: segment.resourceNodeId,
      continuation: segment.continuation,
    })),
    [
      { resourceNodeId: firstWeekNode.id, continuation: true },
      { resourceNodeId: secondWeekInsertedNode.id, continuation: false },
      { resourceNodeId: secondWeekFirstNode.id, continuation: false },
    ],
  );

  const firstTask = withContinuation.tasks.find(
    (task) => task.resourceNodeId === secondWeekFirstNode.id,
  );
  const insertedTask = withContinuation.tasks.find(
    (task) => task.resourceNodeId === secondWeekInsertedNode.id,
  );
  assert.ok(firstTask);
  assert.ok(insertedTask);
  store.move({
    templateId: draft.id,
    taskId: firstTask.id,
    toWeek: 3,
    toIndex: 0,
  });
  const moved = store.move({
    templateId: draft.id,
    taskId: insertedTask.id,
    toWeek: 3,
    toIndex: 0,
  });
  assert.deepEqual(
    moved.tasks
      .filter((task) => task.anchorWeek === 3)
      .sort((left, right) => left.order - right.order)
      .map((task) => task.resourceNodeId),
    [secondWeekInsertedNode.id, secondWeekFirstNode.id],
  );
  assert.equal(moved.schedule.weeks[1].usedHours, 0.5);

  const reordered = store.reorder({
    templateId: draft.id,
    week: 3,
    taskIds: [firstTask.id, insertedTask.id],
  });
  assert.deepEqual(
    reordered.tasks
      .filter((task) => task.anchorWeek === 3)
      .sort((left, right) => left.order - right.order)
      .map((task) => task.resourceNodeId),
    [secondWeekFirstNode.id, secondWeekInsertedNode.id],
  );
  assert.throws(
    () =>
      store.add({
        templateId: draft.id,
        resourceNode: firstWeekNode,
        anchorWeek: 3,
        index: 0,
      }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'DUPLICATE_RESOURCE_NODE',
  );
});

test('模板名称与资源节点不可重复，有任务后学科锁定', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '唯一模板',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
  });
  assert.throws(
    () =>
      store.create({
        name: '唯一模板',
        subject: 'history',
        totalWeeks: 3,
        weeklyHours: 4,
      }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'DUPLICATE_NAME',
  );

  store.add({
    templateId: draft.id,
    resourceNode: historyNode,
    anchorWeek: 1,
  });
  assert.throws(
    () =>
      store.add({
        templateId: draft.id,
        resourceNode: historyNode,
        anchorWeek: 2,
      }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'DUPLICATE_RESOURCE_NODE',
  );
  assert.throws(
    () => store.update({ id: draft.id, subject: 'geography' }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'SUBJECT_LOCKED',
  );
});

test('模板记录最后更新人，启动和停用操作同步覆盖', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '更新人模板',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
    operator: '运营甲',
  });
  assert.equal(draft.updatedBy, '运营甲');

  const configured = store.add({
    templateId: draft.id,
    resourceNode: { ...historyNode, suggestedHours: 1 },
    anchorWeek: 1,
    operator: '运营乙',
  });
  assert.equal(configured.updatedBy, '运营乙');

  const active = store.activate({ id: draft.id, operator: '运营丙' });
  assert.equal(active.updatedBy, '运营丙');
  const stopped = store.stop({ id: active.id, operator: '运营丁' });
  assert.equal(stopped.updatedBy, '运营丁');
});

test('已启动版本不可原地编辑，新草稿启动时原子替换当前版本', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '版本化模板',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
  });
  store.add({
    templateId: draft.id,
    resourceNode: { ...historyNode, suggestedHours: 1 },
    anchorWeek: 1,
  });
  const activeV1 = store.activate({ id: draft.id, operator: '运营甲' });

  assert.throws(
    () => store.deleteOrArchive(activeV1.id),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'INVALID_TRANSITION',
  );

  assert.throws(
    () => store.update({ id: activeV1.id, weeklyHours: 5 }),
    (error) =>
      error instanceof TeachingPlanDomainError && error.code === 'NOT_EDITABLE',
  );
  const draftV2 = store.createDraftVersion({ id: activeV1.id });
  assert.equal(draftV2.version, 2);
  assert.equal(
    store.createDraftVersion({ id: activeV1.id }).id,
    draftV2.id,
    '重复进入编辑应复用同一份草稿',
  );
  assert.equal(store.get(activeV1.id).status, 'active');

  const activeV2 = store.activate({ id: draftV2.id, operator: '运营乙' });
  assert.equal(activeV2.status, 'active');
  assert.equal(store.get(activeV1.id).status, 'stopped');
  assert.equal(
    store
      .list()
      .filter(
        (template) =>
          template.familyId === activeV1.familyId &&
          template.status === 'active',
      ).length,
    1,
  );

  const restartedV1 = store.restart({ id: activeV1.id, operator: '运营甲' });
  assert.equal(restartedV1.status, 'active');
  assert.equal(store.get(activeV2.id).status, 'stopped');

  const copied = store.copy({ id: restartedV1.id, name: '独立复制模板' });
  assert.notEqual(copied.familyId, restartedV1.familyId);
  assert.equal(store.deleteOrArchive(copied.id).action, 'deleted');
  assert.equal(store.deleteOrArchive(activeV2.id).action, 'archived');
});

test('新草稿启动校验失败时保留原启动版本', () => {
  const store = new TeachingPlanTemplateStore();
  const draftV1 = store.create({
    name: '原子切换模板',
    subject: 'history',
    totalWeeks: 1,
    weeklyHours: 4,
  });
  store.add({
    templateId: draftV1.id,
    resourceNode: { ...historyNode, suggestedHours: 4 },
    anchorWeek: 1,
  });
  const activeV1 = store.activate({ id: draftV1.id, operator: '运营甲' });
  const draftV2 = store.createDraftVersion({ id: activeV1.id });
  store.update({ id: draftV2.id, weeklyHours: 3.5 });

  assert.throws(
    () => store.activate({ id: draftV2.id, operator: '运营乙' }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'ACTIVATION_VALIDATION_FAILED',
  );
  assert.equal(store.get(activeV1.id).status, 'active');
  assert.equal(store.get(draftV2.id).status, 'draft');
});

test('草稿跟随资源节点最新课时和状态，停用节点阻止启动', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '节点同步模板',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
  });
  store.add({
    templateId: draft.id,
    resourceNode: { ...historyNode, suggestedHours: 1 },
    anchorWeek: 1,
  });

  const refreshed = store.refreshDraftResourceNodes(draft.id, [
    {
      ...historyNode,
      name: '中国古代史（新版）',
      suggestedHours: 2.5,
      enabled: false,
    },
  ]);

  assert.equal(refreshed.tasks[0].resourceNodeName, '中国古代史（新版）');
  assert.equal(refreshed.tasks[0].hours, 2.5);
  assert.equal(refreshed.tasks[0].resourceNodeEnabled, false);
  assert.throws(
    () => store.activate({ id: draft.id, operator: '运营甲' }),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'ACTIVATION_VALIDATION_FAILED',
  );
});

test('停用版本重启时校验当前节点有效性但不改写冻结课时', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '重启校验模板',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
  });
  store.add({
    templateId: draft.id,
    resourceNode: { ...historyNode, suggestedHours: 1 },
    anchorWeek: 1,
  });
  const active = store.activate({ id: draft.id, operator: '运营甲' });
  store.stop({ id: active.id, operator: '运营甲' });

  assert.throws(
    () =>
      store.assertResourceNodesAvailable(active.id, [
        { ...historyNode, suggestedHours: 2, enabled: false },
      ]),
    (error) =>
      error instanceof TeachingPlanDomainError &&
      error.code === 'ACTIVATION_VALIDATION_FAILED',
  );

  store.assertResourceNodesAvailable(active.id, [
    { ...historyNode, suggestedHours: 2, enabled: true },
  ]);
  const restarted = store.restart({ id: active.id, operator: '运营乙' });
  assert.equal(restarted.tasks[0].hours, 1);
  assert.equal(restarted.activatedSnapshot?.tasks[0].hours, 1);
});

test('资源树删除保护可以统计仍被模板版本引用的节点', () => {
  const store = new TeachingPlanTemplateStore();
  const draft = store.create({
    name: '引用保护模板',
    subject: 'history',
    totalWeeks: 2,
    weeklyHours: 4,
  });
  store.add({
    templateId: draft.id,
    resourceNode: { ...historyNode, suggestedHours: 1 },
    anchorWeek: 1,
  });

  assert.equal(store.countTaskReferences([historyNode.id]), 1);
  assert.equal(store.countTaskReferences(['unrelated-node']), 0);
  store.deleteOrArchive(draft.id);
  assert.equal(store.countTaskReferences([historyNode.id]), 0);
});
