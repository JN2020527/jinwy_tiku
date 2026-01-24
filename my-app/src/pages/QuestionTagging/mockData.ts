import { KnowledgeNode, Question } from './types';

// Mock 试题列表
export const mockQuestions: Question[] = [
  {
    id: 'q1',
    number: '1',
    type: '单选题',
    stem: '<p>下列关于函数的说法中，正确的是（）</p>',
    options: [
      'A. 函数的定义域可以为空集',
      'B. 函数的值域可以为空集',
      'C. 一个函数的定义域和值域可以相同',
      'D. 函数的定义域和值域都不能为空集',
    ],
    answer: 'C',
    analysis:
      '<p>函数的定义域和值域都不能为空集，但可以相同。例如 f(x)=x 的定义域和值域都是 R。</p>',
    subject: '数学',
    paperId: 'paper1',
    paperName: '2023年高考数学全国卷I',
    knowledgePoints: ['kp1', 'kp2'],
    difficulty: 'easy',
    tagStatus: 'complete',
  },
  {
    id: 'q2',
    number: '2',
    type: '填空题',
    stem: '<p>已知函数 f(x) = 2x + 1，则 f(3) = ______。</p>',
    answer: '7',
    analysis: '<p>将 x=3 代入函数式：f(3) = 2×3 + 1 = 7</p>',
    subject: '数学',
    paperId: 'paper1',
    paperName: '2023年高考数学全国卷I',
    knowledgePoints: ['kp1'],
    difficulty: 'easy',
    tagStatus: 'partial',
  },
  {
    id: 'q3',
    number: '3',
    type: '解答题',
    stem: '<p>已知函数 f(x) = x² - 2x + 1</p><p>(1) 求函数的最小值；</p><p>(2) 求函数的单调递增区间。</p>',
    answer: '<p>(1) 最小值为 0</p><p>(2) 单调递增区间为 [1, +∞)</p>',
    analysis:
      '<p>(1) f(x) = (x-1)²，当 x=1 时取得最小值 0</p><p>(2) 由二次函数性质可知，在 [1, +∞) 上单调递增</p>',
    subject: '数学',
    paperId: 'paper1',
    paperName: '2023年高考数学全国卷I',
    tagStatus: 'untagged',
  },
  {
    id: 'q4',
    number: '4',
    type: '单选题',
    stem: '<p>在三角形ABC中，若 a=3, b=4, c=5，则该三角形是（）</p>',
    options: [
      'A. 锐角三角形',
      'B. 直角三角形',
      'C. 钝角三角形',
      'D. 等腰三角形',
    ],
    answer: 'B',
    analysis: '<p>因为 3² + 4² = 5²，满足勾股定理，所以是直角三角形。</p>',
    subject: '数学',
    paperId: 'paper2',
    paperName: '2023年高考数学全国卷II',
    knowledgePoints: ['kp3'],
    difficulty: 'medium',
    chapters: ['ch1'],
    tagStatus: 'complete',
  },
  {
    id: 'q5',
    number: '5',
    type: '单选题',
    stem: '<p>下列函数中，在区间 (0, +∞) 上单调递增的是（）</p>',
    options: ['A. y = -x²', 'B. y = 1/x', 'C. y = ln(x)', 'D. y = -2x + 1'],
    answer: 'C',
    analysis: '<p>对数函数 y = ln(x) 在 (0, +∞) 上单调递增。</p>',
    subject: '数学',
    paperId: 'paper2',
    paperName: '2023年高考数学全国卷II',
    difficulty: 'medium',
    tagStatus: 'partial',
  },
];

// Mock 科目列表
export const mockSubjects = [
  { label: '数学', value: 'math' },
  { label: '语文', value: 'chinese' },
  { label: '英语', value: 'english' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
];

// Mock 试卷列表
export const mockPapers = [
  { label: '2023年高考数学全国卷I', value: 'paper1' },
  { label: '2023年高考数学全国卷II', value: 'paper2' },
  { label: '2023年高考数学全国卷III', value: 'paper3' },
];

// Mock 知识点树
export const mockKnowledgeTree: KnowledgeNode[] = [
  {
    value: 'kp1',
    title: '函数',
    children: [
      { value: 'kp1-1', title: '函数的概念' },
      { value: 'kp1-2', title: '函数的性质' },
      { value: 'kp1-3', title: '基本初等函数' },
    ],
  },
  {
    value: 'kp2',
    title: '导数',
    children: [
      { value: 'kp2-1', title: '导数的概念' },
      { value: 'kp2-2', title: '导数的应用' },
    ],
  },
  {
    value: 'kp3',
    title: '三角函数',
    children: [
      { value: 'kp3-1', title: '三角函数的定义' },
      { value: 'kp3-2', title: '三角恒等变换' },
    ],
  },
];

// Mock 题型树
export const mockQuestionTypes: KnowledgeNode[] = [
  {
    value: 'choice',
    title: '选择题',
    children: [
      { value: 'single-choice', title: '单选题' },
      { value: 'multiple-choice', title: '多选题' },
    ],
  },
  {
    value: 'fill-blank',
    title: '填空题',
  },
  {
    value: 'answer',
    title: '解答题',
    children: [
      { value: 'calculation', title: '计算题' },
      { value: 'proof', title: '证明题' },
      { value: 'comprehensive', title: '综合题' },
    ],
  },
  {
    value: 'true-false',
    title: '判断题',
  },
];

// Mock 专题树
export const mockChapters: KnowledgeNode[] = [
  {
    value: 'ch1',
    title: '必修一',
    children: [
      {
        value: 'ch1-1',
        title: '第一章 集合与函数',
        children: [
          { value: 'ch1-1-1', title: '1.1 集合' },
          { value: 'ch1-1-2', title: '1.2 函数的概念' },
        ],
      },
      {
        value: 'ch1-2',
        title: '第二章 基本初等函数',
        children: [
          { value: 'ch1-2-1', title: '2.1 指数函数' },
          { value: 'ch1-2-2', title: '2.2 对数函数' },
        ],
      },
    ],
  },
  {
    value: 'ch2',
    title: '必修二',
    children: [
      {
        value: 'ch2-1',
        title: '第一章 立体几何',
        children: [
          { value: 'ch2-1-1', title: '1.1 空间几何体' },
          { value: 'ch2-1-2', title: '1.2 点线面的位置关系' },
        ],
      },
    ],
  },
];

// Mock 中考特色标签
export const mockFeatures = [
  { label: '教材母题', value: 'textbook-origin' },
  { label: '跨学科', value: 'cross-subject' },
  { label: '项目化', value: 'project-based' },
  { label: '新题型', value: 'new-type' },
  { label: '大单元', value: 'big-unit' },
];

// Mock 学科考法标签
export const mockExamMethods = [
  { label: '求解化简', value: 'solve-simplify' },
  { label: '方案判断', value: 'scheme-judge' },
  { label: '实际应用', value: 'practical-apply' },
  { label: '证明', value: 'proof' },
  { label: '逻辑思维', value: 'logic-thinking' },
];

// Mock 学科能力标签
export const mockAbilities = [
  { label: '识记', value: 'memorize' },
  { label: '理解', value: 'understand' },
  { label: '综合分析', value: 'comprehensive-analysis' },
  { label: '探究', value: 'explore' },
];
