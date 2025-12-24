import { Request, Response } from 'express';

const genTasks = (total: number) => {
    const tasks = [];
    const types = ['试卷', '教材'];
    const statuses = ['已发布', '待审核', '草稿'];

    for (let i = 0; i < total; i += 1) {
        tasks.push({
            id: i + 40,
            name: `202${3 + (i % 3)}年山西省中考${i % 2 === 0 ? '数学' : '物理'}试卷`,
            type: types[i % 2],
            status: statuses[i % 3],
            updateTime: `2025-12-24 13:${(27 - i).toString().padStart(2, '0')}:40`,
        });
    }
    return tasks;
};

let tasks = genTasks(20);

function getTasks(req: Request, res: Response) {
    const { current = 1, pageSize = 10, name, status } = req.query;
    let dataSource = [...tasks];

    if (name) {
        dataSource = dataSource.filter((item) => item.name.includes(name as string));
    }
    if (status) {
        dataSource = dataSource.filter((item) => item.status === status);
    }

    const total = dataSource.length;
    const startIndex = ((current as number) - 1) * (pageSize as number);
    const endIndex = startIndex + (pageSize as number);
    const list = dataSource.slice(startIndex, endIndex);

    res.json({
        data: list,
        total,
        success: true,
        pageSize: parseInt(`${pageSize}`, 10),
        current: parseInt(`${current}`, 10),
    });
}

function addTask(req: Request, res: Response) {
    const newTask = {
        id: Math.floor(Math.random() * 1000),
        updateTime: new Date().toLocaleString(),
        ...req.body,
    };
    tasks.unshift(newTask);
    res.json({
        success: true,
        data: newTask,
    });
}

function updateTask(req: Request, res: Response) {
    const { id, ...others } = req.body;
    tasks = tasks.map((item) => {
        if (item.id === id) {
            return { ...item, ...others, updateTime: new Date().toLocaleString() };
        }
        return item;
    });
    res.json({
        success: true,
        data: { id, ...others },
    });
}

function deleteTask(req: Request, res: Response) {
    const { id } = req.body;
    tasks = tasks.filter((item) => item.id !== id);
    res.json({
        success: true,
    });
}

export default {
    'GET /api/question-bank/tasks': getTasks,
    'POST /api/question-bank/tasks': addTask,
    'PUT /api/question-bank/tasks': updateTask,
    'DELETE /api/question-bank/tasks': deleteTask,
};
