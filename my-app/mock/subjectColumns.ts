import { Request, Response } from 'express';
import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnMoveDirection,
} from '../src/services/subjectColumns';
import { getRegisteredColumnUsageCounts } from './resourceAssetsStore';

const subjectColumnStore: Record<string, SubjectColumn[]> = {
  math: [
    {
      id: 'column-math-goal',
      subject: 'math',
      name: '学习目标',
      level: 1,
      parentId: null,
      type: 'knowledge',
      sort: 0,
      usedCount: 2,
    },
    {
      id: 'column-math-preview',
      subject: 'math',
      name: '课前预习',
      level: 1,
      parentId: null,
      type: 'knowledge',
      sort: 1,
      usedCount: 0,
    },
    {
      id: 'column-math-practice',
      subject: 'math',
      name: '巩固练习',
      level: 4,
      parentId: 'column-math-goal',
      type: 'question',
      sort: 0,
      usedCount: 1,
    },
    {
      id: 'column-math-example',
      subject: 'math',
      name: '典型例题',
      level: 4,
      parentId: 'column-math-preview',
      type: 'question',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-math-summary',
      subject: 'math',
      name: '课堂小结',
      level: 4,
      parentId: 'column-math-preview',
      type: 'knowledge',
      sort: 1,
      usedCount: 0,
    },
  ],
  chinese: [
    {
      id: 'column-chinese-goal',
      subject: 'chinese',
      name: '学习目标',
      level: 1,
      parentId: null,
      type: 'knowledge',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-chinese-reading',
      subject: 'chinese',
      name: '阅读鉴赏',
      level: 1,
      parentId: null,
      type: 'knowledge',
      sort: 1,
      usedCount: 1,
    },
    {
      id: 'column-chinese-ancient',
      subject: 'chinese',
      name: '文言文精读',
      level: 4,
      parentId: 'column-chinese-reading',
      type: 'knowledge',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-chinese-modern',
      subject: 'chinese',
      name: '现代文阅读',
      level: 4,
      parentId: 'column-chinese-reading',
      type: 'knowledge',
      sort: 1,
      usedCount: 0,
    },
  ],
  english: [
    {
      id: 'column-english-language',
      subject: 'english',
      name: '语言积累',
      level: 1,
      parentId: null,
      type: 'knowledge',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-english-training',
      subject: 'english',
      name: '专项训练',
      level: 1,
      parentId: null,
      type: 'question',
      sort: 1,
      usedCount: 0,
    },
    {
      id: 'column-english-vocab',
      subject: 'english',
      name: '词汇辨析',
      level: 4,
      parentId: 'column-english-language',
      type: 'knowledge',
      sort: 0,
      usedCount: 0,
    },
  ],
};

let subjectColumnSequence = 0;

const getQueryValue = (value: unknown) =>
  Array.isArray(value) ? String(value[0] || '') : String(value || '');

const getSubjectColumns = (subject: string) => {
  const columns = (subjectColumnStore[subject] ||= []);
  const usageCounts = getRegisteredColumnUsageCounts(subject);
  columns.forEach((column) => {
    column.usedCount = usageCounts[column.id] || 0;
  });
  return columns;
};

const cloneColumns = (columns: SubjectColumn[]) =>
  columns.map((column) => ({ ...column }));

/** 供同一 Mock 进程内的学案上传与组合编辑器读取当前注册栏目。 */
export const getSubjectColumnsSnapshot = (subject: string) =>
  cloneColumns(getSubjectColumns(subject));

const normalizeSiblingSort = (columns: SubjectColumn[]) => {
  const groups = new Map<string, SubjectColumn[]>();
  columns.forEach((column) => {
    const groupKey = column.parentId || '__root__';
    groups.set(groupKey, [...(groups.get(groupKey) || []), column]);
  });
  groups.forEach((siblings) => {
    siblings
      .sort((left, right) => left.sort - right.sort)
      .forEach((column, index) => {
        column.sort = index;
      });
  });
};

const getValidationError = (
  columns: SubjectColumn[],
  input: SaveSubjectColumnInput,
  editingId?: string,
) => {
  const name = input.name.trim();
  if (!input.subject) return '请选择学科';
  if (!name) return '请输入栏目名称';
  if (![1, 4].includes(input.level)) return '只支持注册一级、四级栏目';
  if (!['knowledge', 'question'].includes(input.type)) {
    return '请选择有效的栏目类型';
  }
  if (
    columns.some(
      (column) => column.id !== editingId && column.name.trim() === name,
    )
  ) {
    return '当前学科已存在同名栏目';
  }

  if (input.level === 1) {
    if (input.parentId) return '一级栏目不能选择父栏目';
  } else if (input.level === 4) {
    if (!input.parentId) return '四级栏目必须选择同学科一级栏目';
    const parent = columns.find((column) => column.id === input.parentId);
    if (!parent) return '归属一级不存在或不属于当前学科';
    if (parent.level !== 1) return '四级栏目只能归属一级栏目';
  }

  if (!editingId) return null;
  const current = columns.find((column) => column.id === editingId);
  if (!current) return '栏目不存在或不属于当前学科';
  if (current.level !== input.level) return '栏目层级创建后不可修改';
  if (current.usedCount > 0 && current.type !== input.type) {
    return `该栏目已被 ${current.usedCount} 处学案使用，不能修改栏目类型`;
  }
  if (
    current.usedCount > 0 &&
    current.parentId !== (input.level === 1 ? null : input.parentId)
  ) {
    return `该四级栏目已被 ${current.usedCount} 处学案使用，不能调整归属一级；请先解除使用关系`;
  }

  return null;
};

const sendFailure = (res: Response, message: string) =>
  res.send({ success: false, message, data: null });

export default {
  'GET /api/subject-columns': (req: Request, res: Response) => {
    const subject = getQueryValue(req.query.subject).trim();
    if (!subject) {
      sendFailure(res, '请选择学科');
      return;
    }
    const columns = getSubjectColumns(subject);
    normalizeSiblingSort(columns);
    res.send({
      success: true,
      message: '栏目加载成功',
      data: cloneColumns(columns),
    });
  },

  'POST /api/subject-columns': (req: Request, res: Response) => {
    const input = req.body as SaveSubjectColumnInput;
    const subject = String(input.subject || '').trim();
    const columns = getSubjectColumns(subject);
    const normalizedInput = {
      ...input,
      subject,
      name: String(input.name || '').trim(),
      parentId: input.level === 1 ? null : input.parentId,
    };
    const error = getValidationError(columns, normalizedInput);
    if (error) {
      sendFailure(res, error);
      return;
    }

    subjectColumnSequence += 1;
    const siblings = columns.filter(
      (column) => column.parentId === normalizedInput.parentId,
    );
    const column: SubjectColumn = {
      id: `column-${subject}-${Date.now()}-${subjectColumnSequence}`,
      ...normalizedInput,
      sort: siblings.length,
      usedCount: 0,
    };
    columns.push(column);
    normalizeSiblingSort(columns);
    res.send({
      success: true,
      message: '栏目新增成功',
      data: cloneColumns(columns),
    });
  },

  'PUT /api/subject-columns': (req: Request, res: Response) => {
    const input = req.body as SaveSubjectColumnInput & { id: string };
    const subject = String(input.subject || '').trim();
    const columns = getSubjectColumns(subject);
    const current = columns.find((column) => column.id === input.id);
    if (!current) {
      sendFailure(res, '栏目不存在或不属于当前学科');
      return;
    }

    const normalizedInput = {
      ...input,
      subject,
      name: String(input.name || '').trim(),
      parentId: input.level === 1 ? null : input.parentId,
    };
    const error = getValidationError(columns, normalizedInput, input.id);
    if (error) {
      sendFailure(res, error);
      return;
    }

    const parentChanged = current.parentId !== normalizedInput.parentId;
    const nextColumns = cloneColumns(columns);
    const nextCurrent = nextColumns.find((column) => column.id === input.id)!;
    Object.assign(nextCurrent, {
      name: normalizedInput.name,
      level: normalizedInput.level,
      parentId: normalizedInput.parentId,
      type: normalizedInput.type,
    });
    if (parentChanged) {
      nextCurrent.sort = nextColumns.filter(
        (column) =>
          column.id !== input.id &&
          column.parentId === normalizedInput.parentId,
      ).length;
    }
    normalizeSiblingSort(nextColumns);
    subjectColumnStore[subject] = nextColumns;
    res.send({
      success: true,
      message: parentChanged ? '栏目已移动到目标同组末尾' : '栏目修改成功',
      data: cloneColumns(nextColumns),
    });
  },

  'PUT /api/subject-columns/move': (req: Request, res: Response) => {
    const id = String(req.body?.id || '');
    const subject = String(req.body?.subject || '').trim();
    const direction = req.body?.direction as SubjectColumnMoveDirection;
    const columns = getSubjectColumns(subject);
    const current = columns.find((column) => column.id === id);
    if (!current) {
      sendFailure(res, '栏目不存在或不属于当前学科');
      return;
    }
    if (!['up', 'down'].includes(direction)) {
      sendFailure(res, '排序方向无效');
      return;
    }

    const siblings = columns
      .filter((column) => column.parentId === current.parentId)
      .sort((left, right) => left.sort - right.sort);
    const currentIndex = siblings.findIndex((column) => column.id === id);
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      sendFailure(
        res,
        direction === 'up' ? '当前栏目已在同组首位' : '当前栏目已在同组末位',
      );
      return;
    }

    const target = siblings[targetIndex];
    const currentSort = current.sort;
    current.sort = target.sort;
    target.sort = currentSort;
    normalizeSiblingSort(columns);
    res.send({
      success: true,
      message: direction === 'up' ? '栏目已上移' : '栏目已下移',
      data: cloneColumns(columns),
    });
  },

  'DELETE /api/subject-columns': (req: Request, res: Response) => {
    const id = getQueryValue(req.query.id);
    const subject = getQueryValue(req.query.subject).trim();
    const columns = getSubjectColumns(subject);
    const current = columns.find((column) => column.id === id);
    if (!current) {
      sendFailure(res, '栏目不存在或不属于当前学科');
      return;
    }
    const childCount = columns.filter(
      (column) => column.parentId === id,
    ).length;
    if (childCount > 0) {
      sendFailure(
        res,
        `该一级栏目下还有 ${childCount} 个四级栏目，不能删除；请先处理后再删除`,
      );
      return;
    }
    if (current.usedCount > 0) {
      sendFailure(res, `该栏目已被 ${current.usedCount} 处学案使用，不能删除`);
      return;
    }

    subjectColumnStore[subject] = columns.filter((column) => column.id !== id);
    normalizeSiblingSort(subjectColumnStore[subject]);
    res.send({ success: true, message: '栏目删除成功', data: null });
  },
};
