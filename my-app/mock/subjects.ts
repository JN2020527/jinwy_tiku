import { Request, Response } from 'express';
import type { SystemSubject } from '../src/services/subjects';

const systemSubjects: SystemSubject[] = [
  { id: 'subject-chinese', name: '语文', code: 'chinese', sort: 1 },
  { id: 'subject-math', name: '数学', code: 'math', sort: 2 },
  { id: 'subject-english', name: '英语', code: 'english', sort: 3 },
  { id: 'subject-physics', name: '物理', code: 'physics', sort: 4 },
  { id: 'subject-chemistry', name: '化学', code: 'chemistry', sort: 5 },
  { id: 'subject-biology', name: '生物', code: 'biology', sort: 6 },
  { id: 'subject-history', name: '历史', code: 'history', sort: 7 },
  { id: 'subject-geography', name: '地理', code: 'geography', sort: 8 },
  { id: 'subject-politics', name: '道德与法治', code: 'politics', sort: 9 },
];

export default {
  'GET /api/system/subjects': (_req: Request, res: Response) => {
    res.send({
      success: true,
      message: '学科目录加载成功',
      data: systemSubjects.map((subject) => ({ ...subject })),
    });
  },
};
