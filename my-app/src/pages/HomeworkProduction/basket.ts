export const HOMEWORK_BASKET_MAX_COUNT = 60;

export const HOMEWORK_BASKET_LIMIT_MESSAGE = `作业最多可添加 ${HOMEWORK_BASKET_MAX_COUNT} 道题`;

export const HOMEWORK_BASKET_EMPTY_MESSAGE = '作业篮暂无试题';

export type AddResult = {
  added: boolean;
  limitReached: boolean;
};

/** 加入单题：已在列表中则忽略（禁止重复），达到 60 道上限则阻止。 */
export function addQuestionId(
  currentIds: string[],
  questionId: string,
): AddResult {
  if (currentIds.includes(questionId)) {
    return { added: false, limitReached: false };
  }
  if (currentIds.length >= HOMEWORK_BASKET_MAX_COUNT) {
    return { added: false, limitReached: true };
  }
  return { added: true, limitReached: false };
}

/** 移除单题（不存在时原样返回）。 */
export function removeQuestionId(currentIds: string[], questionId: string) {
  return currentIds.filter((id) => id !== questionId);
}

/** 上移/下移：按当前列表顺序调整。 */
export function moveQuestionId(
  currentIds: string[],
  fromIndex: number,
  direction: -1 | 1,
): string[] {
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || fromIndex >= currentIds.length) return currentIds;
  if (toIndex < 0 || toIndex >= currentIds.length) return currentIds;

  const next = [...currentIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** 顺序敏感比较，用于判断题目列表相对已保存状态是否变化。 */
export function sameOrderedIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}
