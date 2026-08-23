import { Request, Response } from 'express';
import {
  getCreateSubjectColumnError,
  getSubjectLevelCodeRulesError,
  getUpdateSubjectColumnError,
  moveSubjectColumnWithinLevel,
  normalizeApplicableLevels,
  normalizeSubjectColumnSort,
} from '../src/features/subject-columns/model';
import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnLevel,
  SubjectColumnMoveDirection,
  SubjectLevelCodeRule,
  UpdateSubjectColumnInput,
} from '../src/services/subjectColumns';
import {
  cloneSubjectColumns,
  getMutableSubjectColumns,
  getSubjectLevelCodeRulesSnapshot,
  nextSubjectColumnId,
  replaceSubjectColumns,
  replaceSubjectLevelCodeRules,
} from './subjectColumnsStore';

const getQueryValue = (value: unknown) =>
  Array.isArray(value) ? String(value[0] || '') : String(value || '');

const sendFailure = (res: Response, message: string) =>
  res.send({ success: false, message, data: null });

export default {
  'GET /api/subject-columns': (req: Request, res: Response) => {
    const subject = getQueryValue(req.query.subject).trim();
    if (!subject) {
      sendFailure(res, '请选择学科');
      return;
    }
    const columns = getMutableSubjectColumns(subject);
    normalizeSubjectColumnSort(columns);
    res.send({
      success: true,
      message: '栏目加载成功',
      data: cloneSubjectColumns(columns),
    });
  },

  'POST /api/subject-columns': (req: Request, res: Response) => {
    const input = req.body as SaveSubjectColumnInput;
    const subject = String(input.subject || '').trim();
    const columns = getMutableSubjectColumns(subject);
    const normalizedInput: SaveSubjectColumnInput = {
      subject,
      name: String(input.name || '').trim(),
      applicableLevels: normalizeApplicableLevels(
        (Array.isArray(input.applicableLevels)
          ? input.applicableLevels
          : []
        ).map(Number) as SubjectColumnLevel[],
      ),
      type: input.type,
      dataSource: input.dataSource,
    };
    const error = getCreateSubjectColumnError(columns, normalizedInput);
    if (error) {
      sendFailure(res, error);
      return;
    }

    const column: SubjectColumn = {
      id: nextSubjectColumnId(subject),
      ...normalizedInput,
      sortByLevel: Object.fromEntries(
        normalizedInput.applicableLevels.map((level) => [
          level,
          columns.filter((item) => item.applicableLevels.includes(level))
            .length,
        ]),
      ),
      usedCount: 0,
      usedCountByLevel: {},
    };
    columns.push(column);
    normalizeSubjectColumnSort(columns);
    res.send({
      success: true,
      message: '栏目新增成功',
      data: cloneSubjectColumns(columns),
    });
  },

  'PUT /api/subject-columns': (req: Request, res: Response) => {
    const input = req.body as UpdateSubjectColumnInput;
    const subject = String(input.subject || '').trim();
    const columns = getMutableSubjectColumns(subject);
    const normalizedInput: UpdateSubjectColumnInput = {
      id: String(input.id || ''),
      subject,
      name: String(input.name || '').trim(),
      applicableLevels: normalizeApplicableLevels(
        (Array.isArray(input.applicableLevels)
          ? input.applicableLevels
          : []
        ).map(Number) as SubjectColumnLevel[],
      ),
    };
    const error = getUpdateSubjectColumnError(columns, normalizedInput);
    if (error) {
      sendFailure(res, error);
      return;
    }

    const nextColumns = cloneSubjectColumns(columns);
    const nextCurrent = nextColumns.find(
      (column) => column.id === normalizedInput.id,
    )!;
    nextCurrent.name = normalizedInput.name;
    nextCurrent.sortByLevel = Object.fromEntries(
      normalizedInput.applicableLevels.map((level) => [
        level,
        nextCurrent.sortByLevel[level] ??
          nextColumns.filter(
            (column) =>
              column.id !== nextCurrent.id &&
              column.applicableLevels.includes(level),
          ).length,
      ]),
    );
    nextCurrent.applicableLevels = normalizedInput.applicableLevels;
    normalizeSubjectColumnSort(nextColumns);
    replaceSubjectColumns(subject, nextColumns);
    res.send({
      success: true,
      message: '栏目编辑成功',
      data: cloneSubjectColumns(nextColumns),
    });
  },

  'PUT /api/subject-columns/move': (req: Request, res: Response) => {
    const id = String(req.body?.id || '');
    const subject = String(req.body?.subject || '').trim();
    const level = Number(req.body?.level) as SubjectColumnLevel;
    const direction = req.body?.direction as SubjectColumnMoveDirection;
    const result = moveSubjectColumnWithinLevel(
      getMutableSubjectColumns(subject),
      id,
      level,
      direction,
    );
    if (!result.success) {
      sendFailure(res, result.message);
      return;
    }
    replaceSubjectColumns(subject, result.data);
    res.send({
      success: true,
      message: direction === 'up' ? '栏目已上移' : '栏目已下移',
      data: cloneSubjectColumns(result.data),
    });
  },

  'GET /api/subject-columns/level-code-rules': (
    req: Request,
    res: Response,
  ) => {
    const subject = getQueryValue(req.query.subject).trim();
    if (!subject) {
      sendFailure(res, '请选择学科');
      return;
    }
    res.send({
      success: true,
      message: '层级编码规则加载成功',
      data: getSubjectLevelCodeRulesSnapshot(subject),
    });
  },

  'PUT /api/subject-columns/level-code-rules': (
    req: Request,
    res: Response,
  ) => {
    const subject = String(req.body?.subject || '').trim();
    const rules = (Array.isArray(req.body?.rules) ? req.body.rules : []).map(
      (rule: SubjectLevelCodeRule) => ({
        level: Number(rule.level) as SubjectColumnLevel,
        codeStyle: rule.codeStyle || null,
      }),
    );
    if (!subject) {
      sendFailure(res, '请选择学科');
      return;
    }
    const error = getSubjectLevelCodeRulesError(rules);
    if (error) {
      sendFailure(res, error);
      return;
    }
    replaceSubjectLevelCodeRules(subject, rules);
    res.send({
      success: true,
      message: '层级编码规则已保存',
      data: getSubjectLevelCodeRulesSnapshot(subject),
    });
  },

  'DELETE /api/subject-columns': (req: Request, res: Response) => {
    const id = getQueryValue(req.query.id);
    const subject = getQueryValue(req.query.subject).trim();
    const columns = getMutableSubjectColumns(subject);
    const current = columns.find((column) => column.id === id);
    if (!current) {
      sendFailure(res, '栏目不存在或不属于当前学科');
      return;
    }
    if (current.usedCount > 0) {
      sendFailure(res, `该栏目已被 ${current.usedCount} 处学案引用，不能删除`);
      return;
    }

    const nextColumns = columns.filter((column) => column.id !== id);
    normalizeSubjectColumnSort(nextColumns);
    replaceSubjectColumns(subject, nextColumns);
    res.send({ success: true, message: '栏目删除成功', data: null });
  },
};
