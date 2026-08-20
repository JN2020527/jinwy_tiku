const referencedResourceNodeIds = new Set<string>(['rv-1-2-1-math']);

/** 教师教学任务引用独立于平台教学计划模板引用。 */
export const countTeacherTeachingTaskReferences = (
  resourceNodeIds: Iterable<string>,
): number => {
  let count = 0;
  for (const nodeId of resourceNodeIds) {
    if (referencedResourceNodeIds.has(nodeId)) count += 1;
  }
  return count;
};
