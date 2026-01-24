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
    subject: 'math',
    paperId: 'paper1',
    paperName: '2023年高考数学全国卷I',
    year: '2023',
    region: '北京',
    source: '中考模拟',
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
    subject: 'math',
    paperId: 'paper1',
    paperName: '2023年高考数学全国卷I',
    year: '2023',
    region: '上海',
    source: '名校试题',
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
    subject: 'math',
    paperId: 'paper1',
    paperName: '2023年高考数学全国卷I',
    year: '2024',
    region: '广东',
    source: '仿真演练',
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
    subject: 'math',
    paperId: 'paper2',
    paperName: '2023年高考数学全国卷II',
    year: '2024',
    region: '江苏',
    source: '期中',
    knowledgePoints: ['kp3'],
    difficulty: 'medium',
    chapters: 'ch1',
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
    subject: 'math',
    paperId: 'paper2',
    paperName: '2023年高考数学全国卷II',
    year: '2023',
    region: '浙江',
    source: '原创好题',
    difficulty: 'medium',
    tagStatus: 'partial',
  },
  // 语文试题
  {
    id: 'q6',
    number: '1',
    type: '单选题',
    stem: '<p>下列词语中加点字的读音完全正确的一项是（）</p>',
    options: [
      'A. 憎恶(zēng) 狭隘(ài)',
      'B. 粗犷(guǎng) 模样(mú)',
      'C. 着落(zhuó) 惬意(qiè)',
      'D. 拮据(jū) 倔强(juè)',
    ],
    answer: 'C',
    analysis: '<p>A项"憎"应读zēng；B项"犷"应读guǎng；D项"倔"应读jué。</p>',
    subject: 'chinese',
    paperId: 'paper3',
    paperName: '2023年中考语文模拟卷',
    year: '2023',
    region: '北京',
    source: '中考模拟',
    tagStatus: 'untagged',
  },
  {
    id: 'q7',
    number: '2',
    type: '填空题',
    stem: '<p>默写古诗文。</p><p>(1) 海内存知己，______。（王勃《送杜少府之任蜀州》）</p>',
    answer: '天涯若比邻',
    analysis: '<p>出自王勃《送杜少府之任蜀州》，表达友情不受距离限制。</p>',
    subject: 'chinese',
    paperId: 'paper3',
    paperName: '2023年中考语文模拟卷',
    year: '2023',
    region: '上海',
    source: '名校试题',
    tagStatus: 'untagged',
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

// Mock 试卷列表（按学科分类）
export const mockPapersBySubject: Record<string, { label: string; value: string }[]> = {
  math: [
    { label: '2023年高考数学全国卷I', value: 'paper1' },
    { label: '2023年高考数学全国卷II', value: 'paper2' },
  ],
  chinese: [
    { label: '2023年中考语文模拟卷', value: 'paper3' },
    { label: '2023年高考语文全国卷', value: 'paper4' },
  ],
  english: [
    { label: '2023年中考英语模拟卷', value: 'paper5' },
  ],
  physics: [
    { label: '2023年中考物理模拟卷', value: 'paper6' },
  ],
  chemistry: [
    { label: '2023年中考化学模拟卷', value: 'paper7' },
  ],
};

// Mock 试卷列表（兼容旧代码）
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

// ========== 按学科分类的标签数据 ==========

// 知识点树（按学科）
export const knowledgeTreeBySubject: Record<string, KnowledgeNode[]> = {
  math: [
    {
      value: 'math-kp1',
      title: '函数',
      children: [
        { value: 'math-kp1-1', title: '函数的概念' },
        { value: 'math-kp1-2', title: '函数的性质' },
        { value: 'math-kp1-3', title: '基本初等函数' },
      ],
    },
    {
      value: 'math-kp2',
      title: '导数',
      children: [
        { value: 'math-kp2-1', title: '导数的概念' },
        { value: 'math-kp2-2', title: '导数的应用' },
      ],
    },
    {
      value: 'math-kp3',
      title: '三角函数',
      children: [
        { value: 'math-kp3-1', title: '三角函数的定义' },
        { value: 'math-kp3-2', title: '三角恒等变换' },
      ],
    },
    {
      value: 'math-kp4',
      title: '几何',
      children: [
        { value: 'math-kp4-1', title: '平面几何' },
        { value: 'math-kp4-2', title: '立体几何' },
      ],
    },
  ],
  chinese: [
    {
      value: 'chinese-kp1',
      title: '基础知识',
      children: [
        { value: 'chinese-kp1-1', title: '字音字形' },
        { value: 'chinese-kp1-2', title: '词语运用' },
        { value: 'chinese-kp1-3', title: '病句辨析' },
      ],
    },
    {
      value: 'chinese-kp2',
      title: '古诗文',
      children: [
        { value: 'chinese-kp2-1', title: '古诗词鉴赏' },
        { value: 'chinese-kp2-2', title: '文言文阅读' },
        { value: 'chinese-kp2-3', title: '名句默写' },
      ],
    },
    {
      value: 'chinese-kp3',
      title: '现代文阅读',
      children: [
        { value: 'chinese-kp3-1', title: '记叙文阅读' },
        { value: 'chinese-kp3-2', title: '说明文阅读' },
        { value: 'chinese-kp3-3', title: '议论文阅读' },
      ],
    },
  ],
  english: [
    {
      value: 'english-kp1',
      title: '语法',
      children: [
        { value: 'english-kp1-1', title: '时态' },
        { value: 'english-kp1-2', title: '从句' },
        { value: 'english-kp1-3', title: '非谓语动词' },
      ],
    },
    {
      value: 'english-kp2',
      title: '阅读理解',
      children: [
        { value: 'english-kp2-1', title: '细节理解' },
        { value: 'english-kp2-2', title: '推理判断' },
        { value: 'english-kp2-3', title: '主旨大意' },
      ],
    },
  ],
  physics: [
    {
      value: 'physics-kp1',
      title: '力学',
      children: [
        { value: 'physics-kp1-1', title: '运动学' },
        { value: 'physics-kp1-2', title: '牛顿定律' },
        { value: 'physics-kp1-3', title: '功和能' },
      ],
    },
    {
      value: 'physics-kp2',
      title: '电学',
      children: [
        { value: 'physics-kp2-1', title: '电路' },
        { value: 'physics-kp2-2', title: '电磁感应' },
      ],
    },
  ],
  chemistry: [
    {
      value: 'chemistry-kp1',
      title: '物质结构',
      children: [
        { value: 'chemistry-kp1-1', title: '原子结构' },
        { value: 'chemistry-kp1-2', title: '化学键' },
      ],
    },
    {
      value: 'chemistry-kp2',
      title: '化学反应',
      children: [
        { value: 'chemistry-kp2-1', title: '氧化还原反应' },
        { value: 'chemistry-kp2-2', title: '离子反应' },
      ],
    },
  ],
};

// 题型树（按学科）
export const questionTypesBySubject: Record<string, KnowledgeNode[]> = {
  math: [
    {
      value: 'math-choice',
      title: '选择题',
      children: [
        { value: 'math-single-choice', title: '单选题' },
        { value: 'math-multiple-choice', title: '多选题' },
      ],
    },
    { value: 'math-fill-blank', title: '填空题' },
    {
      value: 'math-answer',
      title: '解答题',
      children: [
        { value: 'math-calculation', title: '计算题' },
        { value: 'math-proof', title: '证明题' },
        { value: 'math-comprehensive', title: '综合题' },
      ],
    },
  ],
  chinese: [
    { value: 'chinese-choice', title: '选择题' },
    { value: 'chinese-fill-blank', title: '填空题' },
    { value: 'chinese-reading', title: '阅读理解' },
    { value: 'chinese-writing', title: '作文' },
    { value: 'chinese-dictation', title: '默写题' },
  ],
  english: [
    { value: 'english-choice', title: '选择题' },
    { value: 'english-cloze', title: '完形填空' },
    { value: 'english-reading', title: '阅读理解' },
    { value: 'english-writing', title: '书面表达' },
    { value: 'english-listening', title: '听力题' },
  ],
  physics: [
    { value: 'physics-choice', title: '选择题' },
    { value: 'physics-fill-blank', title: '填空题' },
    { value: 'physics-experiment', title: '实验题' },
    { value: 'physics-calculation', title: '计算题' },
  ],
  chemistry: [
    { value: 'chemistry-choice', title: '选择题' },
    { value: 'chemistry-fill-blank', title: '填空题' },
    { value: 'chemistry-experiment', title: '实验题' },
    { value: 'chemistry-inference', title: '推断题' },
  ],
};

// 专题树（按学科）
export const chaptersBySubject: Record<string, KnowledgeNode[]> = {
  math: [
    {
      value: 'math-ch1',
      title: '必修一',
      children: [
        { value: 'math-ch1-1', title: '第一章 集合与函数' },
        { value: 'math-ch1-2', title: '第二章 基本初等函数' },
      ],
    },
    {
      value: 'math-ch2',
      title: '必修二',
      children: [
        { value: 'math-ch2-1', title: '第一章 立体几何' },
        { value: 'math-ch2-2', title: '第二章 平面解析几何' },
      ],
    },
  ],
  chinese: [
    {
      value: 'chinese-ch1',
      title: '七年级上册',
      children: [
        { value: 'chinese-ch1-1', title: '第一单元' },
        { value: 'chinese-ch1-2', title: '第二单元' },
      ],
    },
    {
      value: 'chinese-ch2',
      title: '七年级下册',
      children: [
        { value: 'chinese-ch2-1', title: '第一单元' },
        { value: 'chinese-ch2-2', title: '第二单元' },
      ],
    },
  ],
  english: [
    { value: 'english-ch1', title: 'Unit 1' },
    { value: 'english-ch2', title: 'Unit 2' },
    { value: 'english-ch3', title: 'Unit 3' },
  ],
  physics: [
    { value: 'physics-ch1', title: '第一章 机械运动' },
    { value: 'physics-ch2', title: '第二章 声现象' },
    { value: 'physics-ch3', title: '第三章 物态变化' },
  ],
  chemistry: [
    { value: 'chemistry-ch1', title: '第一章 走进化学世界' },
    { value: 'chemistry-ch2', title: '第二章 我们周围的空气' },
    { value: 'chemistry-ch3', title: '第三章 物质构成的奥秘' },
  ],
};

// 中考特色标签（按学科）
export const featuresBySubject: Record<string, { label: string; value: string }[]> = {
  math: [
    { label: '教材母题', value: 'textbook-origin' },
    { label: '跨学科', value: 'cross-subject' },
    { label: '新题型', value: 'new-type' },
    { label: '压轴题', value: 'final-question' },
  ],
  chinese: [
    { label: '教材母题', value: 'textbook-origin' },
    { label: '跨学科', value: 'cross-subject' },
    { label: '名著阅读', value: 'classic-reading' },
    { label: '综合性学习', value: 'comprehensive-learning' },
  ],
  english: [
    { label: '教材母题', value: 'textbook-origin' },
    { label: '跨学科', value: 'cross-subject' },
    { label: '情境交际', value: 'situational' },
  ],
  physics: [
    { label: '教材母题', value: 'textbook-origin' },
    { label: '跨学科', value: 'cross-subject' },
    { label: '实验探究', value: 'experiment' },
    { label: '生活应用', value: 'life-application' },
  ],
  chemistry: [
    { label: '教材母题', value: 'textbook-origin' },
    { label: '跨学科', value: 'cross-subject' },
    { label: '实验探究', value: 'experiment' },
    { label: '工业流程', value: 'industrial-process' },
  ],
};

// 学科考法标签（按学科）
export const examMethodsBySubject: Record<string, { label: string; value: string }[]> = {
  math: [
    { label: '求解化简', value: 'solve-simplify' },
    { label: '方案判断', value: 'scheme-judge' },
    { label: '实际应用', value: 'practical-apply' },
    { label: '证明', value: 'proof' },
    { label: '数形结合', value: 'number-shape' },
  ],
  chinese: [
    { label: '理解分析', value: 'understand-analyze' },
    { label: '鉴赏评价', value: 'appreciate-evaluate' },
    { label: '表达应用', value: 'express-apply' },
    { label: '探究创新', value: 'explore-innovate' },
  ],
  english: [
    { label: '词汇运用', value: 'vocabulary' },
    { label: '语法填空', value: 'grammar-fill' },
    { label: '阅读技巧', value: 'reading-skill' },
    { label: '写作表达', value: 'writing-express' },
  ],
  physics: [
    { label: '概念理解', value: 'concept' },
    { label: '公式计算', value: 'formula-calc' },
    { label: '实验分析', value: 'experiment-analyze' },
    { label: '综合应用', value: 'comprehensive-apply' },
  ],
  chemistry: [
    { label: '概念辨析', value: 'concept-distinguish' },
    { label: '方程式书写', value: 'equation-write' },
    { label: '实验设计', value: 'experiment-design' },
    { label: '计算推断', value: 'calc-inference' },
  ],
};

// 学科能力标签（按学科）
export const abilitiesBySubject: Record<string, { label: string; value: string }[]> = {
  math: [
    { label: '运算能力', value: 'calculation' },
    { label: '逻辑推理', value: 'logic-reasoning' },
    { label: '空间想象', value: 'spatial-imagination' },
    { label: '数据分析', value: 'data-analysis' },
  ],
  chinese: [
    { label: '识记', value: 'memorize' },
    { label: '理解', value: 'understand' },
    { label: '分析综合', value: 'analyze-synthesize' },
    { label: '鉴赏评价', value: 'appreciate-evaluate' },
    { label: '表达应用', value: 'express-apply' },
  ],
  english: [
    { label: '听力理解', value: 'listening' },
    { label: '阅读理解', value: 'reading' },
    { label: '书面表达', value: 'writing' },
    { label: '语言运用', value: 'language-use' },
  ],
  physics: [
    { label: '观察能力', value: 'observation' },
    { label: '实验能力', value: 'experiment' },
    { label: '分析能力', value: 'analysis' },
    { label: '应用能力', value: 'application' },
  ],
  chemistry: [
    { label: '观察能力', value: 'observation' },
    { label: '实验能力', value: 'experiment' },
    { label: '推理能力', value: 'reasoning' },
    { label: '计算能力', value: 'calculation' },
  ],
};

// 获取学科标签数据的辅助函数
export const getSubjectTagData = (subject: string) => {
  return {
    knowledgeTree: knowledgeTreeBySubject[subject] || [],
    questionTypes: questionTypesBySubject[subject] || [],
    chapters: chaptersBySubject[subject] || [],
    features: featuresBySubject[subject] || [],
    examMethods: examMethodsBySubject[subject] || [],
    abilities: abilitiesBySubject[subject] || [],
  };
};
