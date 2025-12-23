import { Request, Response } from 'express';

// Mock Data for Knowledge Points (Tree Structure)
let knowledgePoints = [
    {
        id: 'kp-1',
        title: '数与代数',
        key: 'kp-1',
        value: 'kp-1',
        children: [
            {
                id: 'kp-1-1',
                title: '实数',
                key: 'kp-1-1',
                value: 'kp-1-1',
                children: [
                    { id: 'kp-1-1-1', title: '有理数', key: 'kp-1-1-1', value: 'kp-1-1-1' },
                    { id: 'kp-1-1-2', title: '无理数', key: 'kp-1-1-2', value: 'kp-1-1-2' },
                    { id: 'kp-1-1-3', title: '实数的运算', key: 'kp-1-1-3', value: 'kp-1-1-3' },
                ],
            },
            {
                id: 'kp-1-2',
                title: '代数式',
                key: 'kp-1-2',
                value: 'kp-1-2',
                children: [
                    { id: 'kp-1-2-1', title: '整式', key: 'kp-1-2-1', value: 'kp-1-2-1' },
                    { id: 'kp-1-2-2', title: '分式', key: 'kp-1-2-2', value: 'kp-1-2-2' },
                ],
            },
        ],
    },
    {
        id: 'kp-2',
        title: '图形与几何',
        key: 'kp-2',
        value: 'kp-2',
        children: [
            {
                id: 'kp-2-1',
                title: '图形的性质',
                key: 'kp-2-1',
                value: 'kp-2-1',
                children: [
                    { id: 'kp-2-1-1', title: '三角形', key: 'kp-2-1-1', value: 'kp-2-1-1' },
                    { id: 'kp-2-1-2', title: '四边形', key: 'kp-2-1-2', value: 'kp-2-1-2' },
                ]
            },
        ],
    },
];

// Mock Data for Question Types (Tree Structure) [Simplified]
let questionTypeTree = [
    {
        title: '客观题',
        key: 'qt-1',
        children: [
            { title: '单选题', key: 'qt-1-1' },
            { title: '多选题', key: 'qt-1-2' },
            { title: '判断题', key: 'qt-1-3' },
        ]
    },
    {
        title: '主观题',
        key: 'qt-2',
        children: [
            { title: '填空题', key: 'qt-2-1' },
            { title: '解答题', key: 'qt-2-2' },
            { title: '计算题', key: 'qt-2-3' },
            { title: '证明题', key: 'qt-2-4' },
            { title: '应用题', key: 'qt-2-5' },
        ]
    }
];

// Mock Data for Tag Categories (Dynamic List) [Refactored]
let tagCategories = [
    {
        id: 'cat-1',
        name: '难度',
        tags: [
            { id: 'diff-1', name: '容易', star: 1, color: 'green' },
            { id: 'diff-2', name: '较易', star: 2, color: 'cyan' },
            { id: 'diff-3', name: '中等', star: 3, color: 'blue' },
            { id: 'diff-4', name: '较难', star: 4, color: 'orange' },
            { id: 'diff-5', name: '困难', star: 5, color: 'red' },
        ]
    },
    {
        id: 'cat-2',
        name: '考查能力',
        tags: [
            { id: 'comp-1', name: '运算能力', color: 'purple' },
            { id: 'comp-2', name: '逻辑推理', color: 'geekblue' },
            { id: 'comp-3', name: '空间观念', color: 'magenta' },
            { id: 'comp-4', name: '数据分析', color: 'gold' },
        ]
    },
    {
        id: 'cat-3',
        name: '题源类型',
        tags: [
            { id: 'src-1', name: '中考真题', color: 'default' },
            { id: 'src-2', name: '一模/二模', color: 'default' },
            { id: 'src-3', name: '期中/期末', color: 'default' },
            { id: 'src-4', name: '名校试题', color: 'default' },
        ]
    },
    {
        id: 'cat-4',
        name: '地区',
        tags: [
            { id: 'prov-1', name: '北京', color: 'default' },
            { id: 'prov-2', name: '上海', color: 'default' },
            { id: 'prov-3', name: '江苏', color: 'default' },
            { id: 'prov-4', name: '浙江', color: 'default' },
        ]
    },
    {
        id: 'cat-7',
        name: '试题场景',
        tags: [
            { id: 'scene-1', name: '预习', color: 'default' },
            { id: 'scene-2', name: '作业', color: 'default' },
            { id: 'scene-3', name: '单元测', color: 'default' },
            { id: 'scene-4', name: '月考', color: 'default' },
            { id: 'scene-5', name: '期中', color: 'default' },
            { id: 'scene-6', name: '期末', color: 'default' },
            { id: 'scene-7', name: '开学考', color: 'default' },
            { id: 'scene-8', name: '模拟', color: 'default' },
            { id: 'scene-9', name: '真题', color: 'default' },
            { id: 'scene-10', name: '学业考', color: 'default' },
            { id: 'scene-11', name: '假期', color: 'default' },
        ]
    }
];

// Mock Data for Textbook Versions
let textbookVersions = [
    { label: '人教版', value: 'renjiao' },
    { label: '北师大版', value: 'beishida' },
    { label: '苏科版', value: 'suke' },
];

// Mock Data for Textbook Chapters (Tree Structure)
let textbookChapters: any = {
    'renjiao': [
        {
            title: '七年级上册',
            key: 'rj-7-1',
            children: [
                { title: '第一章 有理数', key: 'rj-7-1-1' },
                { title: '第二章 整式的加减', key: 'rj-7-1-2' },
            ]
        },
        {
            title: '七年级下册',
            key: 'rj-7-2',
            children: [
                { title: '第五章 相交线与平行线', key: 'rj-7-2-5' },
            ]
        }
    ],
    'beishida': [
        {
            title: '七年级上册',
            key: 'bsd-7-1',
            children: [
                { title: '第一章 丰富的图形世界', key: 'bsd-7-1-1' },
            ]
        }
    ]
};

export default {
    'GET /api/tags/knowledge-tree': (req: Request, res: Response) => {
        res.send({
            success: true,
            data: knowledgePoints,
        });
    },
    // Replaced /api/tags/attributes with /api/tags/categories
    'GET /api/tags/categories': (req: Request, res: Response) => {
        res.send({
            success: true,
            data: tagCategories,
        });
    },
    // Category CRUD
    'POST /api/tags/category': (req: Request, res: Response) => {
        const { name } = req.body;
        const newCat = { id: `cat-${Date.now()}`, name, tags: [] };
        tagCategories.push(newCat);
        res.send({ success: true, message: 'Category created successfully' });
    },
    'DELETE /api/tags/category': (req: Request, res: Response) => {
        const { id } = req.query;
        tagCategories = tagCategories.filter(c => c.id !== id);
        res.send({ success: true, message: 'Category deleted successfully' });
    },

    'POST /api/tags/knowledge-node': (req: Request, res: Response) => {
        const { parentId, title, description } = req.body;
        const newNode = {
            id: `kp-${Date.now()}`,
            key: `kp-${Date.now()}`,
            title,
            value: `kp-${Date.now()}`,
            children: []
        };

        if (parentId) {
            const addNode = (nodes: any[]) => {
                for (const node of nodes) {
                    if (node.key === parentId) {
                        if (!node.children) node.children = [];
                        node.children.push(newNode);
                        return true;
                    }
                    if (node.children && node.children.length > 0) {
                        if (addNode(node.children)) return true;
                    }
                }
                return false;
            };
            addNode(knowledgePoints);
        } else {
            knowledgePoints.push(newNode);
        }
        res.send({ success: true, message: 'Node created successfully' });
    },
    'PUT /api/tags/knowledge-node': (req: Request, res: Response) => {
        const { id, title, description } = req.body;
        const updateNode = (nodes: any[]) => {
            for (const node of nodes) {
                if (node.key === id) {
                    node.title = title;
                    return true;
                }
                if (node.children && node.children.length > 0) {
                    if (updateNode(node.children)) return true;
                }
            }
            return false;
        };
        updateNode(knowledgePoints);
        res.send({ success: true, message: 'Node updated successfully' });
    },
    'DELETE /api/tags/knowledge-node': (req: Request, res: Response) => {
        const { id } = req.query;
        const deleteNode = (nodes: any[]) => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].key === id) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children && nodes[i].children.length > 0) {
                    if (deleteNode(nodes[i].children)) return true;
                }
            }
            return false;
        };
        deleteNode(knowledgePoints);
        res.send({ success: true, message: 'Node deleted successfully' });
    },

    // Question Type CRUD
    'GET /api/tags/question-type-tree': (req: Request, res: Response) => {
        res.send({ success: true, data: questionTypeTree });
    },
    'POST /api/tags/question-type-node': (req: Request, res: Response) => {
        const { parentId, title, description } = req.body;
        const newNode = {
            title,
            key: `qt-${Date.now()}`,
            children: []
        };

        if (parentId) {
            const addNode = (nodes: any[]) => {
                for (const node of nodes) {
                    if (node.key === parentId) {
                        if (!node.children) node.children = [];
                        node.children.push(newNode);
                        return true;
                    }
                    if (node.children && node.children.length > 0) {
                        if (addNode(node.children)) return true;
                    }
                }
                return false;
            };
            addNode(questionTypeTree);
        } else {
            questionTypeTree.push(newNode);
        }
        res.send({ success: true, message: 'Question Type created successfully' });
    },
    'PUT /api/tags/question-type-node': (req: Request, res: Response) => {
        const { id, title, description } = req.body;
        const updateNode = (nodes: any[]) => {
            for (const node of nodes) {
                if (node.key === id) {
                    node.title = title;
                    return true;
                }
                if (node.children && node.children.length > 0) {
                    if (updateNode(node.children)) return true;
                }
            }
            return false;
        };
        updateNode(questionTypeTree);
        res.send({ success: true, message: 'Question Type updated successfully' });
    },
    'DELETE /api/tags/question-type-node': (req: Request, res: Response) => {
        const { id } = req.query;
        const deleteNode = (nodes: any[]) => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].key === id) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children && nodes[i].children.length > 0) {
                    if (deleteNode(nodes[i].children)) return true;
                }
            }
            return false;
        };
        deleteNode(questionTypeTree);
        res.send({ success: true, message: 'Question Type deleted successfully' });
    },

    // Attribute CRUD (Updated to use categoryId)
    'POST /api/tags/attribute': (req: Request, res: Response) => {
        const { categoryId, name, color } = req.body;
        const category = tagCategories.find(c => c.id === categoryId);
        if (category) {
            category.tags.push({ id: `tag-${Date.now()}`, name, color: color || 'default' });
        }
        res.send({ success: true, message: 'Attribute created successfully' });
    },
    'PUT /api/tags/attribute': (req: Request, res: Response) => {
        const { id, categoryId, name } = req.body;
        const category = tagCategories.find(c => c.id === categoryId);
        if (category) {
            const tag = category.tags.find((t: any) => t.id === id);
            if (tag) {
                tag.name = name;
            }
        }
        res.send({ success: true, message: 'Attribute updated successfully' });
    },
    'DELETE /api/tags/attribute': (req: Request, res: Response) => {
        const { id, categoryId } = req.query;
        const category = tagCategories.find(c => c.id === categoryId);
        if (category) {
            category.tags = category.tags.filter((t: any) => t.id !== id);
        }
        res.send({ success: true, message: 'Attribute deleted successfully' });
    },

    // Textbook API
    'GET /api/tags/textbook-versions': (req: Request, res: Response) => {
        res.send({ success: true, data: textbookVersions });
    },
    'GET /api/tags/textbook-chapters': (req: Request, res: Response) => {
        const { version } = req.query;
        const data = textbookChapters[version as string] || [];
        res.send({ success: true, data });
    },
    // Textbook Chapter CRUD
    'POST /api/tags/textbook-chapter': (req: Request, res: Response) => {
        const { version, parentId, title, description } = req.body;
        const chapters = textbookChapters[version];
        const newNode = {
            title,
            key: `ch-${Date.now()}`,
            children: []
        };

        if (parentId) {
            const addNode = (nodes: any[]) => {
                for (const node of nodes) {
                    if (node.key === parentId) {
                        if (!node.children) node.children = [];
                        node.children.push(newNode);
                        return true;
                    }
                    if (node.children && node.children.length > 0) {
                        if (addNode(node.children)) return true;
                    }
                }
                return false;
            };
            if (chapters) addNode(chapters);
        } else {
            if (chapters) chapters.push(newNode);
        }
        res.send({ success: true, message: 'Chapter created successfully' });
    },
    'PUT /api/tags/textbook-chapter': (req: Request, res: Response) => {
        const { version, id, title, description } = req.body;
        const chapters = textbookChapters[version];
        const updateNode = (nodes: any[]) => {
            for (const node of nodes) {
                if (node.key === id) {
                    node.title = title;
                    return true;
                }
                if (node.children && node.children.length > 0) {
                    if (updateNode(node.children)) return true;
                }
            }
            return false;
        };
        if (chapters) updateNode(chapters);
        res.send({ success: true, message: 'Chapter updated successfully' });
    },
    'DELETE /api/tags/textbook-chapter': (req: Request, res: Response) => {
        const { id } = req.query; // Note: In real app, we might need version here too if IDs aren't globally unique
        // For mock, we'll search all versions or assume version is passed. 
        // Let's iterate all versions for simplicity in mock
        Object.values(textbookChapters).forEach((chapters: any) => {
            const deleteNode = (nodes: any[]) => {
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].key === id) {
                        nodes.splice(i, 1);
                        return true;
                    }
                    if (nodes[i].children && nodes[i].children.length > 0) {
                        if (deleteNode(nodes[i].children)) return true;
                    }
                }
                return false;
            };
            deleteNode(chapters);
        });
        res.send({ success: true, message: 'Chapter deleted successfully' });
    },
};
