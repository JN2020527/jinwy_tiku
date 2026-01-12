
// Mock Data Store
let questions: any[] = [
    {
        id: 1,
        content: '<p>已知函数 $f(x) = x^2 - 2x + 1$，则 $f(1)$ 的值为（   ）</p>',
        type: '单选题',
        difficulty: '简单',
        subject: '数学',
        grade: '初二',
        tags: ['二次函数', '函数值'],
        options: ['0', '1', '2', '3'],
        answer: 'A',
        analysis: '将 x=1 代入函数表达式，得 f(1) = 1^2 - 2*1 + 1 = 0。',
        createTime: '2023-10-01 10:00:00',
        status: 'tagged',
    },
    {
        id: 2,
        content: '<p>下列成语中，没有错别字的一项是（   ）</p>',
        type: '单选题',
        difficulty: '中等',
        subject: '语文',
        grade: '初三',
        tags: ['成语', '字形'],
        options: ['A. 谈笑风声', 'B. 甘拜下风', 'C. 一愁莫展', 'D. 穿流不息'],
        answer: 'B',
        analysis: 'A. 谈笑风生；C. 一筹莫展；D. 川流不息。',
        createTime: '2023-10-02 14:30:00',
        status: 'untagged',
    },
    {
        id: 3,
        content: '<p>What is the main idea of the passage?</p>',
        type: '单选题',
        difficulty: '困难',
        subject: '英语',
        grade: '初三',
        tags: ['阅读理解', '主旨大意'],
        options: [
            'The importance of healthy eating.',
            'How to exercise properly.',
            'The history of fast food.',
            'Benefits of sleeping early.'
        ],
        answer: 'A',
        analysis: 'The passage discusses various benefits of a balanced diet, so the main idea is the importance of healthy eating.',
        createTime: '2023-10-03 09:15:00',
        status: 'tagged',
    },
    {
        id: 4,
        content: '<p>如图所示，物体 A 在水平面上做匀速直线运动，下列说法正确的是（   ）</p>',
        type: '多选题',
        difficulty: '中等',
        subject: '物理',
        grade: '初二',
        tags: ['力学', '牛顿第一定律'],
        options: [
            '物体 A 受到平衡力的作用',
            '物体 A 的动能保持不变',
            '物体 A 受到摩擦力的方向与运动方向相反',
            '物体 A 的机械能守恒'
        ],
        answer: 'ABC',
        analysis: '物体做匀速直线运动，受平衡力，A正确；速度不变质量不变，动能不变，B正确；摩擦力阻碍相对运动，C正确；高度不变动能不变，机械能不变，但机械能守恒通常指只有重力做功，此处有摩擦力做功，严格来说机械能不守恒（转化为内能），但在初中物理语境下，若不考虑内能转化，D可能有争议，标准答案选ABC。',
        createTime: '2023-10-04 16:45:00',
        status: 'untagged',
    },
    {
        id: 5,
        content: '<p>请简述光合作用的意义。</p>',
        type: '简答题',
        difficulty: '中等',
        subject: '生物',
        grade: '初一',
        tags: ['光合作用', '生命活动'],
        options: [],
        answer: '1. 制造有机物，为植物自身和动物提供食物来源；2. 转化能量，将光能转化为化学能；3. 维持大气中碳-氧平衡。',
        analysis: '光合作用是生物界最基本的物质代谢和能量代谢。',
        createTime: '2023-10-05 11:20:00',
        status: 'tagged',
    }
];

let papers: any[] = [
    {
        id: 1,
        title: '2023-2024学年第一学期期末考试数学试卷',
        subject: '数学',
        grade: '初二',
        year: '2023',
        createTime: '2023-12-01 09:00:00',
        questionCount: 25,
    },
    {
        id: 2,
        title: '2024届初三第一次模拟考试语文试卷',
        subject: '语文',
        grade: '初三',
        year: '2024',
        createTime: '2024-03-15 14:00:00',
        questionCount: 22,
    }
];

export default {
    'GET /api/question-entry/questions': (req: any, res: any) => {
        res.json({
            success: true,
            data: questions,
            total: questions.length,
        });
    },

    'GET /api/question-entry/questions/:id': (req: any, res: any) => {
        const id = Number(req.params.id);
        const question = questions.find((q) => q.id === id);
        if (question) {
            res.json({
                success: true,
                data: question,
            });
        } else {
            res.json({
                success: false,
                errorMessage: 'Question not found',
            });
        }
    },

    'POST /api/question-entry/questions': (req: any, res: any) => {
        const newQuestion = {
            id: questions.length + 1,
            ...req.body,
            createTime: new Date().toLocaleString(),
            status: 'untagged',
        };
        questions.unshift(newQuestion);
        res.json({
            success: true,
            data: newQuestion,
        });
    },

    'PUT /api/question-entry/questions': (req: any, res: any) => {
        const { id, ...updates } = req.body;
        const index = questions.findIndex((q) => q.id === id);
        if (index > -1) {
            questions[index] = { ...questions[index], ...updates };
            res.json({
                success: true,
                data: questions[index],
            });
        } else {
            res.json({
                success: false,
                errorMessage: 'Question not found',
            });
        }
    },

    'DELETE /api/question-entry/questions/:id': (req: any, res: any) => {
        const id = Number(req.params.id);
        questions = questions.filter((q) => q.id !== id);
        res.json({
            success: true,
        });
    },

    'POST /api/question-entry/questions/batch-tag': (req: any, res: any) => {
        const { ids, tags } = req.body;
        questions = questions.map((q) => {
            if (ids.includes(q.id)) {
                return { ...q, tags: [...new Set([...(q.tags || []), ...tags])], status: 'tagged' };
            }
            return q;
        });
        res.json({
            success: true,
        });
    },

    'GET /api/question-entry/papers': (req: any, res: any) => {
        res.json({
            success: true,
            data: papers,
            total: papers.length,
        });
    },

    'POST /api/question-entry/papers/ocr': (req: any, res: any) => {
        // Mock OCR result
        const mockParsedData = {
            title: '识别结果：2023年数学期末试卷',
            sections: [
                {
                    name: '一、选择题',
                    questions: [
                        {
                            content: '1. 下列计算正确的是（ ）',
                            options: ['A. a+a=a^2', 'B. a^2*a^3=a^6', 'C. (a^2)^3=a^6', 'D. a^6/a^2=a^3'],
                            answer: 'C',
                            analysis: 'A. 2a; B. a^5; D. a^4.',
                            type: '单选题',
                            difficulty: '简单',
                        },
                        {
                            content: '2. 如图，已知 AB//CD，∠1=50°，则∠2=（ ）',
                            options: ['A. 40°', 'B. 50°', 'C. 130°', 'D. 140°'],
                            answer: 'B',
                            analysis: '两直线平行，同位角相等。',
                            type: '单选题',
                            difficulty: '简单',
                        }
                    ]
                },
                {
                    name: '二、填空题',
                    questions: [
                        {
                            content: '3. 分解因式：x^2 - 4 = ______。',
                            options: [],
                            answer: '(x+2)(x-2)',
                            analysis: '平方差公式。',
                            type: '简答题',
                            difficulty: '简单',
                        }
                    ]
                }
            ]
        };

        setTimeout(() => {
            res.json({
                success: true,
                data: mockParsedData,
            });
        }, 1500);
    },
};
