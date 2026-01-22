// 试题数据结构
export interface Question {
    id: string;
    number: string;           // 题号
    type: string;             // 题型
    stem: string;             // 题干（HTML）
    options?: string[];       // 选项
    answer?: string;          // 答案
    analysis?: string;        // 解析
    paperId?: string;         // 所属试卷ID
    paperName?: string;       // 试卷名称
    subject: string;          // 科目

    // 标签信息
    knowledgePoints?: string[];  // 知识点ID数组
    questionType?: string;       // 题型ID
    difficulty?: 'easy' | 'medium' | 'hard';
    chapters?: string[];         // 教材章节ID数组

    // 标签状态
    tagStatus: 'untagged' | 'partial' | 'complete';
}

// 筛选条件
export interface FilterParams {
    subject?: string;
    paperId?: string;
    tagStatus?: 'all' | 'complete' | 'partial' | 'untagged';
    keyword?: string;
    page: number;
    pageSize: number;
}

// 知识点树节点
export interface KnowledgeNode {
    value: string;
    title: string;
    children?: KnowledgeNode[];
}

// 教材章节节点
export interface ChapterNode {
    value: string;
    label: string;
    children?: ChapterNode[];
}
