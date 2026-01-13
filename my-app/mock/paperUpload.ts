import { Request, Response } from 'express';

const genQuestions = () => {
    return [
        {
            id: 'q1',
            number: '1',
            type: '单选题',
            stem: '<p>1. 下列图形中，是中心对称图形的是（    ）</p><p>A. 等边三角形    B. 平行四边形</p><p>C. 等腰三角形    D. 直角三角形</p>',
            answer: 'B',
            analysis: '<p>平行四边形绕对角线交点旋转180度能与自身重合。</p>',
            difficulty: 2,
            knowledgePoints: ['kp1'],
        },
        {
            id: 'q2',
            number: '2',
            type: '单选题',
            stem: '<p>2. 计算 |-5| 的结果是（    ）</p><p>A. 5    B. -5    C. 0    D. 1/5</p>',
            answer: 'A',
            difficulty: 1,
        },
        {
            id: 'q3',
            number: '3',
            type: '阅读理解',
            stem: '<p>阅读下列材料，回答3-4题：</p><p>Last Sunday, Tom went to the park...</p>',
            children: [
                {
                    id: 'q3-1',
                    number: '3',
                    type: '单选题',
                    stem: '<p>3. Who did Tom go to the park with?</p><p>A. His father. B. His dog.</p>',
                    answer: 'B',
                    parentId: 'q3',
                },
                {
                    id: 'q3-2',
                    number: '4',
                    type: '单选题',
                    stem: '<p>4. What happened suddenly?</p><p>A. It snowed. B. It rained.</p>',
                    answer: 'B',
                    parentId: 'q3',
                },
            ],
        },
    ];
};

export default {
    'POST /api/paper/upload': (req: Request, res: Response) => {
        res.json({
            success: true,
            data: {
                taskId: 'mock-task-id-12345',
            },
        });
    },

    'GET /api/paper/result/:taskId': (req: Request, res: Response) => {
        res.json({
            success: true,
            data: {
                taskId: req.params.taskId,
                status: 'success',
                metadata: {
                    name: '2025年山西省中考数学模拟卷',
                    subject: '数学',
                    year: '2025',
                    mode: 'paper',
                },
                questions: genQuestions(),
            },
        });
    },

    'POST /api/paper/submit': (req: Request, res: Response) => {
        res.json({
            success: true,
        });
    },
};
