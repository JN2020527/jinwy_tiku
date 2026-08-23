import type {
  AssetItem,
  AssetType,
  HomeworkDetail,
  KnowledgeBlock,
  KnowledgeTreeNode,
  PublishedQuestion,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
} from '../src/services/resourceAssets';

const now = () => new Date().toISOString();

export const knowledgeTreesBySubject: Record<string, KnowledgeTreeNode[]> = {
  math: [
    {
      key: 'kp-1-knowledge-tree-math',
      title: '数与代数',
      children: [
        {
          key: 'kp-1-1-knowledge-tree-math',
          title: '有理数',
          children: [
            {
              key: 'kp-1-1-1-knowledge-tree-math',
              title: '有理数的概念',
            },
            {
              key: 'kp-1-1-2-knowledge-tree-math',
              title: '数轴与相反数',
            },
          ],
        },
        {
          key: 'kp-1-2-knowledge-tree-math',
          title: '整式',
          children: [
            {
              key: 'kp-1-2-1-knowledge-tree-math',
              title: '整式的加减',
            },
          ],
        },
      ],
    },
    {
      key: 'kp-2-knowledge-tree-math',
      title: '图形与几何',
      children: [
        {
          key: 'kp-2-1-knowledge-tree-math',
          title: '三角形',
          children: [
            {
              key: 'kp-2-1-1-knowledge-tree-math',
              title: '三角形的内角和',
            },
          ],
        },
      ],
    },
  ],
  chinese: [
    {
      key: 'kp-1-knowledge-tree-chinese',
      title: '阅读与鉴赏',
      children: [
        {
          key: 'kp-1-1-knowledge-tree-chinese',
          title: '现代文阅读',
          children: [
            {
              key: 'kp-1-1-1-knowledge-tree-chinese',
              title: '概括文章主旨',
            },
          ],
        },
      ],
    },
  ],
  english: [],
  biology: [],
};

const mathStructure: StudyGuideStructureNode[] = [
  {
    id: 'sg-node-l1-core',
    level: 'level1',
    label: '课前预习',
    referenceId: 'column-math-preview',
    children: [
      {
        id: 'sg-node-l2-base',
        level: 'level2',
        label: '概念与方法',
        referenceId: 'column-math-concept',
        children: [
          {
            id: 'sg-node-l3-rational',
            level: 'level3',
            label: '有理数的概念',
            referenceId: 'column-math-knowledge',
            knowledgeNodeId: 'kp-1-1-1-knowledge-tree-math',
            children: [
              {
                id: 'sg-node-l4-summary',
                level: 'level4',
                label: '课堂小结',
                referenceId: 'column-math-summary',
                children: [],
              },
            ],
          },
          {
            id: 'sg-node-l3-axis',
            level: 'level3',
            label: '数轴与相反数',
            referenceId: 'column-math-knowledge',
            knowledgeNodeId: 'kp-1-1-2-knowledge-tree-math',
            children: [],
          },
        ],
      },
    ],
  },
];

const mathContentBlocks: StudyGuideContentBlock[] = [
  {
    id: 'sg-block-overview',
    kind: 'columnContent',
    structureNodeId: 'sg-node-l2-base',
    knowledgeNodeIds: [],
    html: '<p><strong>本节导读：</strong>从生活中的温度与海拔出发，认识正数、负数和零。</p>',
  },
  {
    id: 'sg-block-comprehensive',
    kind: 'comprehensive',
    structureNodeId: 'sg-node-l2-base',
    knowledgeNodeIds: [
      'kp-1-1-1-knowledge-tree-math',
      'kp-1-1-2-knowledge-tree-math',
    ],
    currentKnowledgeScope: [
      'kp-1-1-1-knowledge-tree-math',
      'kp-1-1-2-knowledge-tree-math',
    ],
    knowledgeBlockId: 'kb-math-comprehensive',
    html: '<p><strong>整体认识：</strong>有理数可以借助数轴形成统一表示，数轴上的方向、原点和单位长度共同决定一个数的位置。</p>',
  },
  {
    id: 'sg-block-single',
    kind: 'single',
    structureNodeId: 'sg-node-l3-rational',
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    knowledgeBlockId: 'kb-math-single',
    html: '<p>整数和分数统称为有理数。正有理数、零、负有理数构成完整分类。</p><table><tbody><tr><th>类别</th><th>示例</th></tr><tr><td>整数</td><td>−2、0、3</td></tr><tr><td>分数</td><td>1/2、−0.75</td></tr></tbody></table>',
  },
  {
    id: 'sg-block-method',
    kind: 'method',
    structureNodeId: 'sg-node-l4-summary',
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    knowledgeBlockId: 'kb-math-method',
    html: '<p><strong>分类方法：</strong>先判断是否为零，再看符号，最后判断整数或分数。</p><p>关系式：<math><mrow><mi>a</mi><mo>&gt;</mo><mn>0</mn></mrow></math></p>',
  },
];

const seededStudyGuide: StudyGuideDetail = {
  id: 'asset-math-study-guide-1',
  subject: 'math',
  type: 'studyGuide',
  status: 'formal',
  name: '有理数单元学案',
  updatedAt: '2026-08-20T09:30:00.000Z',
  source: 'online',
  mountCount: 2,
  platformTemplateCount: 1,
  teacherTaskCount: 3,
  structure: structuredClone(mathStructure),
  contentBlocks: structuredClone(mathContentBlocks),
  skippedColumns: [],
};

const seededAssets: AssetItem[] = [
  seededStudyGuide,
  {
    id: 'asset-math-study-guide-draft',
    subject: 'math',
    type: 'studyGuide',
    status: 'draft',
    name: '整式复习学案',
    updatedAt: '2026-08-20T08:10:00.000Z',
    source: 'online',
    mountCount: 0,
    platformTemplateCount: 0,
    teacherTaskCount: 0,
  },
  {
    id: 'asset-math-homework-1',
    subject: 'math',
    type: 'homework',
    status: 'formal',
    name: '有理数基础作业',
    updatedAt: '2026-08-19T11:00:00.000Z',
    source: 'seed',
    mountCount: 1,
    platformTemplateCount: 0,
    teacherTaskCount: 2,
  },
  {
    id: 'asset-math-ppt-1',
    subject: 'math',
    type: 'ppt',
    status: 'formal',
    name: '有理数课堂课件',
    originalFileName: '有理数课堂课件.pptx',
    updatedAt: '2026-08-19T07:40:00.000Z',
    source: 'seed',
    mountCount: 2,
    platformTemplateCount: 1,
    teacherTaskCount: 0,
  },
  {
    id: 'asset-math-word-1',
    subject: 'math',
    type: 'word',
    status: 'formal',
    name: '课堂观察记录',
    originalFileName: '课堂观察记录.docx',
    updatedAt: '2026-08-18T03:20:00.000Z',
    source: 'seed',
    mountCount: 0,
    platformTemplateCount: 0,
    teacherTaskCount: 0,
  },
  {
    id: 'asset-chinese-audio-1',
    subject: 'chinese',
    type: 'audio',
    status: 'formal',
    name: '古诗朗读示范',
    originalFileName: '古诗朗读示范.mp3',
    updatedAt: '2026-08-18T06:00:00.000Z',
    source: 'seed',
    mountCount: 1,
    platformTemplateCount: 0,
    teacherTaskCount: 1,
  },
];

export const assetStore: AssetItem[] = structuredClone(seededAssets);
export const studyGuideStore: Record<string, StudyGuideDetail> = {
  [seededStudyGuide.id]: structuredClone(seededStudyGuide),
  'asset-math-study-guide-draft': {
    ...structuredClone(seededStudyGuide),
    id: 'asset-math-study-guide-draft',
    status: 'draft',
    name: '整式复习学案',
    updatedAt: '2026-08-20T08:10:00.000Z',
    structure: [
      {
        id: 'sg-draft-l1-preview',
        level: 'level1',
        label: '课前预习',
        referenceId: 'column-math-preview',
        children: [
          {
            id: 'sg-draft-l2-algebra',
            level: 'level2',
            label: '概念与方法',
            referenceId: 'column-math-concept',
            children: [
              {
                id: 'sg-draft-l3-polynomial',
                level: 'level3',
                label: '整式的加减',
                referenceId: 'column-math-knowledge',
                knowledgeNodeId: 'kp-1-2-1-knowledge-tree-math',
                children: [],
              },
            ],
          },
        ],
      },
    ],
    contentBlocks: [
      {
        id: 'sg-draft-block',
        kind: 'single',
        structureNodeId: 'sg-draft-l3-polynomial',
        knowledgeNodeIds: ['kp-1-2-1-knowledge-tree-math'],
        html: '<p>整式加减的关键是先去括号，再合并同类项。</p>',
      },
    ],
    skippedColumns: [],
  },
};

// ---------- 试题资产线（mock）：加工作业数据源 ----------

const QUESTION_TYPE_LABELS = {
  choice: '单选题',
  fill: '填空题',
  solve: '解答题',
} as const;

const QUESTION_SOURCES = [
  '中考真题',
  '高考真题',
  '名校试题',
  '原创好题',
  '期中考试',
  '期末试卷',
  '仿真演练',
];

const QUESTION_YEARS = ['2023', '2024', '2025', '2026'];

interface QuestionSeedInput {
  type: keyof typeof QUESTION_TYPE_LABELS;
  difficulty: 'easy' | 'medium' | 'hard';
  stem: string;
  answer: string;
  explanation: string;
  options?: string[];
}

const buildMathQuestion = (
  seed: QuestionSeedInput,
  index: number,
  knowledgeNodeId: string,
  status: PublishedQuestion['status'] = 'published',
): PublishedQuestion => ({
  id: `question-math-${String(index).padStart(3, '0')}`,
  subject: 'math',
  knowledgeNodeIds: [knowledgeNodeId],
  status,
  source: QUESTION_SOURCES[index % QUESTION_SOURCES.length],
  type: QUESTION_TYPE_LABELS[seed.type],
  difficulty: seed.difficulty,
  year: QUESTION_YEARS[index % QUESTION_YEARS.length],
  stem: seed.stem,
  options: seed.options?.map((text, oi) => ({
    label: String.fromCharCode(65 + oi),
    text,
  })),
  answer: seed.answer,
  explanation: seed.explanation,
  updatedAt: new Date(
    Date.UTC(2025, index % 12, 1 + index, 8, (index * 7) % 60),
  ).toISOString(),
  popularity: 900 - index * 4 + (index % 11) * 13,
});

const MATH_KNOWLEDGE_RATIONAL = 'kp-1-1-1-knowledge-tree-math';
const MATH_KNOWLEDGE_AXIS = 'kp-1-1-2-knowledge-tree-math';
const MATH_KNOWLEDGE_POLYNOMIAL = 'kp-1-2-1-knowledge-tree-math';
const MATH_KNOWLEDGE_TRIANGLE = 'kp-2-1-1-knowledge-tree-math';

// 有理数的概念（16 道）
const rationalSeeds: QuestionSeedInput[] = [
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列各数中，是负有理数的是（　）',
    options: ['0', '-3/4', '3', '0.5'],
    answer: 'B',
    explanation:
      '小于零的有理数称为负有理数，-3/4 是负有理数；0 既不是正数也不是负数。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '在 -2、0、1/2、3.5 中，最小的数是（　）',
    options: ['-2', '0', '1/2', '3.5'],
    answer: 'A',
    explanation: '负数小于 0 和一切正数，-2 是最小的数。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列说法正确的是（　）',
    options: [
      '有理数包括正数和负数',
      '0 不是有理数',
      '分数都是有理数',
      '有理数不包括整数',
    ],
    answer: 'C',
    explanation:
      '整数和分数统称有理数，分数当然都是有理数；A 漏掉了 0，B、D 均错误。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列各数中，属于正整数的是（　）',
    options: ['-1', '0', '1', '1/2'],
    answer: 'C',
    explanation: '大于零的整数是正整数，只有 1 符合。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '下列说法中，错误的是（　）',
    options: [
      '正分数和负分数统称分数',
      '整数和分数统称有理数',
      '0 既不是正数也不是负数',
      '正数和负数统称有理数',
    ],
    answer: 'D',
    explanation: '有理数包括正数、负数和 0，D 把 0 遗漏了。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列数中，既不是正数也不是负数的是（　）',
    options: ['3', '-3', '0', '0.3'],
    answer: 'C',
    explanation: '0 既不是正数也不是负数。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '在 -7、0、0.618、3.14、22/7 中，属于有理数的有 ______ 个。',
    answer: '5',
    explanation: '整数和分数统称有理数，这五个数都是有理数。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '最大的负整数是 ______。',
    answer: '-1',
    explanation: '负整数为 -1、-2、-3、…，其中最大的是 -1。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '有理数中，最小的正整数是 ______。',
    answer: '1',
    explanation: '正整数从 1 开始，1 是最小的正整数。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '若 a 是有理数且 a＞0，则 -a 是 ______ 数（填“正”或“负”）。',
    answer: '负',
    explanation: '正数的相反数一定是负数。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '写出一个比 -1 小的负有理数：______。',
    answer: '-2（答案不唯一）',
    explanation: '小于 -1 的负有理数均可，如 -2、-3/2。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '某仓库运进货物 20 吨记作 +20 吨，那么运出 15 吨记作 ______ 吨。',
    answer: '-15',
    explanation: '具有相反意义的量用正负数表示，运出记作负。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '把下列各数分类：-1、0.5、0、-3/4、8。整数有：______；分数有：______。',
    answer: '整数：-1、0、8；分数：0.5、-3/4',
    explanation: '整数包括正整数、0、负整数；分数包括正分数和负分数。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '用正负数表示：温度上升 3℃ 记作 +3℃，则下降 5℃ 记作 ______。',
    answer: '-5℃',
    explanation: '上升与下降意义相反，上升记正，下降记负。',
  },
  {
    type: 'solve',
    difficulty: 'hard',
    stem: '判断正误并说明理由：“0 是最小的正数”。',
    answer: '错误。0 既不是正数也不是负数，正数都大于 0。',
    explanation: '正数是大于 0 的数，0 不属于正数，因此不存在最小的正数。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '把下列各数填入相应集合：5、-2、0、1/3、-0.5。正整数集合：______；负分数集合：______。',
    answer: '正整数集合：{5}；负分数集合：{-0.5}',
    explanation:
      '5 是正整数；-0.5 = -1/2 是负分数；-2 是负整数，0 既不是正数也不是负数。',
  },
];

// 数轴与相反数（16 道）
const axisSeeds: QuestionSeedInput[] = [
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '数轴上表示 -3 的点到原点的距离是（　）',
    options: ['-3', '3', '1/3', '0'],
    answer: 'B',
    explanation: '数轴上点到原点的距离等于该点表示的数的绝对值，|-3| = 3。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '-2 的相反数是（　）',
    options: ['-2', '2', '1/2', '-1/2'],
    answer: 'B',
    explanation: '只有符号不同的两个数互为相反数，-2 的相反数是 2。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列各组数中，互为相反数的是（　）',
    options: ['3 与 1/3', '-3 与 3', '-3 与 -1/3', '3 与 0'],
    answer: 'B',
    explanation: '-3 与 3 只有符号不同，互为相反数。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '在数轴上，点 A 表示 -1，将点 A 向右移动 4 个单位得到点 B，点 B 表示的数是（　）',
    options: ['3', '-5', '5', '-3'],
    answer: 'A',
    explanation: '向右移动 4 个单位：-1 + 4 = 3。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '数轴上表示 -2 和 5 的两点之间的距离是（　）',
    options: ['3', '7', '-3', '-7'],
    answer: 'B',
    explanation: '距离为 |5 - (-2)| = 7。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '若 a 的相反数是 3，则 a =（　）',
    options: ['3', '-3', '1/3', '-1/3'],
    answer: 'B',
    explanation: '互为相反数的两个数符号相反，3 的相反数是 -3。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '数轴上表示 0 的点叫做 ______。',
    answer: '原点',
    explanation: '数轴上表示 0 的点称为原点。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '-3.5 的相反数是 ______。',
    answer: '3.5',
    explanation: '符号相反、绝对值相同，-3.5 的相反数是 3.5。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '数轴上，到原点距离等于 2 的点表示的数是 ______。',
    answer: '-2 和 2（±2）',
    explanation: '原点左右两侧各有一个距离为 2 的点，分别表示 -2 和 2。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '若 |x| = 4，则 x = ______。',
    answer: '±4（-4 或 4）',
    explanation: '绝对值等于 4 的数有两个：4 和 -4。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '相反数等于它本身的数是 ______。',
    answer: '0',
    explanation: '只有 0 的相反数是它本身。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '在数轴上标出 -2、0.5、3、-1.5 四个点，并用“＜”把它们连接起来。',
    answer: '-2 ＜ -1.5 ＜ 0.5 ＜ 3',
    explanation: '数轴上左边的数小于右边的数，从左到右依次排列。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '求 -7 与 7 的相反数，并比较大小。',
    answer: '-7 的相反数是 7，7 的相反数是 -7，7 ＞ -7',
    explanation: '互为相反数的两个数符号相反，正数大于负数。',
  },
  {
    type: 'solve',
    difficulty: 'hard',
    stem: '已知 |a| = 3，|b| = 2，且 a ＞ b，求 a、b 的值。',
    answer: 'a = 3，b = 2 或 b = -2',
    explanation:
      '|a| = 3 得 a = ±3，|b| = 2 得 b = ±2；满足 a ＞ b 时 a 只能取 3，b 可取 2 或 -2。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '数轴上点 A 表示 -6，点 B 表示 8，求 A、B 两点间的距离。',
    answer: '14',
    explanation: '距离 = |8 - (-6)| = 14。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '若 a、b 互为相反数，则 a + b = ______，并说明理由。',
    answer: '0。互为相反数的两个数符号相反、绝对值相同，和为 0。',
    explanation: '设 a 的相反数为 -a，则 a + (-a) = 0。',
  },
];

// 整式的加减（16 道）
const polynomialSeeds: QuestionSeedInput[] = [
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列各式中，是单项式的是（　）',
    options: ['x + 1', '2ab', '1/x', 'a - b'],
    answer: 'B',
    explanation: '单项式是数与字母的乘积，2ab 符合；1/x 不是整式。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '单项式 -3x²y 的系数是（　）',
    options: ['3', '-3', '2', '1'],
    answer: 'B',
    explanation: '单项式中的数字因数叫系数，-3x²y 的系数是 -3。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '下列各组中，是同类项的是（　）',
    options: ['2x 与 2y', '3ab 与 -5ab', 'x² 与 2x', '3 与 3x'],
    answer: 'B',
    explanation:
      '所含字母相同且相同字母的指数也相同的项是同类项，3ab 与 -5ab 是同类项。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '计算 3a + 2a 的结果是（　）',
    options: ['5a²', '5a', '6a', '3a²'],
    answer: 'B',
    explanation: '合并同类项：系数相加，字母和指数不变，3a + 2a = 5a。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '去括号：-(a - b) 的结果是（　）',
    options: ['-a - b', '-a + b', 'a - b', 'a + b'],
    answer: 'B',
    explanation: '括号前是负号，去括号后各项变号：-(a - b) = -a + b。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '化简 2(x - 1) - 3x 的结果是（　）',
    options: ['-x - 2', '-x + 2', '5x - 2', '-x - 1'],
    answer: 'A',
    explanation: '2(x - 1) - 3x = 2x - 2 - 3x = -x - 2。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '单项式 5x³ 的次数是 ______。',
    answer: '3',
    explanation: '单项式中所有字母的指数和叫次数，5x³ 的次数是 3。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '合并同类项：4m - 3m + 2m = ______。',
    answer: '3m',
    explanation: '系数相加：4 - 3 + 2 = 3，结果为 3m。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '多项式 2x² - 3x + 1 是 ______ 次 ______ 项式。',
    answer: '二；三',
    explanation: '最高次项 2x² 的次数是 2，共有三个单项式，故为二次三项式。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '计算：3(x - 2) - (x + 1) = ______。',
    answer: '2x - 7',
    explanation: '3(x - 2) - (x + 1) = 3x - 6 - x - 1 = 2x - 7。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '若 2a²b 与 -3a²b 是同类项，则它们的和为 ______。',
    answer: '-a²b',
    explanation: '2a²b + (-3a²b) = (2 - 3)a²b = -a²b。',
  },
  {
    type: 'solve',
    difficulty: 'easy',
    stem: '化简：5a + 3b - 2a - b。',
    answer: '3a + 2b',
    explanation: '5a - 2a = 3a，3b - b = 2b，结果为 3a + 2b。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '先化简，再求值：2(x² - 2x) - (x² - 4x)，其中 x = 3。',
    answer: '化简得 x²，代入得 9',
    explanation: '2x² - 4x - x² + 4x = x²；当 x = 3 时，x² = 9。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '已知 A = 3x² - 2x，B = x² + x，求 A - 2B。',
    answer: 'x² - 4x',
    explanation:
      'A - 2B = 3x² - 2x - 2(x² + x) = 3x² - 2x - 2x² - 2x = x² - 4x。',
  },
  {
    type: 'solve',
    difficulty: 'hard',
    stem: '一个长方形的长为 (2a + 3)，宽为 (a - 1)，求它的周长。',
    answer: '6a + 4',
    explanation: '周长 = 2[(2a + 3) + (a - 1)] = 2(3a + 2) = 6a + 4。',
  },
  {
    type: 'solve',
    difficulty: 'hard',
    stem: '若整式 mx² + 3x - 2x² + 5 化简后不含 x² 项，求 m 的值。',
    answer: 'm = 2',
    explanation:
      '合并同类项得 (m - 2)x² + 3x + 5，不含 x² 项需 m - 2 = 0，即 m = 2。',
  },
];

// 三角形的内角和（16 道）
const triangleSeeds: QuestionSeedInput[] = [
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '三角形三个内角的和是（　）',
    options: ['90°', '180°', '270°', '360°'],
    answer: 'B',
    explanation: '三角形内角和定理：三角形三个内角的和等于 180°。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '一个三角形的两个内角分别是 50° 和 60°，第三个内角是（　）',
    options: ['60°', '70°', '80°', '90°'],
    answer: 'B',
    explanation: '180° - 50° - 60° = 70°。',
  },
  {
    type: 'choice',
    difficulty: 'easy',
    stem: '直角三角形中，两个锐角的和为（　）',
    options: ['45°', '60°', '90°', '180°'],
    answer: 'C',
    explanation: '直角为 90°，内角和 180°，两锐角和 = 180° - 90° = 90°。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '等腰三角形的一个底角为 40°，则顶角为（　）',
    options: ['40°', '80°', '100°', '140°'],
    answer: 'C',
    explanation: '两底角相等均为 40°，顶角 = 180° - 40° - 40° = 100°。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '三角形的一个外角等于与它不相邻的两个内角的（　）',
    options: ['差', '和', '积', '商'],
    answer: 'B',
    explanation: '三角形外角定理：外角等于与它不相邻的两个内角的和。',
  },
  {
    type: 'choice',
    difficulty: 'medium',
    stem: '一个三角形的三个内角度数之比为 1:2:3，则它是（　）',
    options: ['锐角三角形', '直角三角形', '钝角三角形', '等腰三角形'],
    answer: 'B',
    explanation: '三个角为 30°、60°、90°，含直角，是直角三角形。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '三角形内角和定理：三角形三个内角的和等于 ______。',
    answer: '180°',
    explanation: '任意三角形三个内角的和恒为 180°。',
  },
  {
    type: 'fill',
    difficulty: 'medium',
    stem: '若三角形的一个内角为 100°，另外两个角相等，则每个角为 ______。',
    answer: '40°',
    explanation: '另外两角和 = 180° - 100° = 80°，各为 40°。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '三角形的一个外角是 120°，与它相邻的内角是 ______。',
    answer: '60°',
    explanation: '外角与相邻内角互补，180° - 120° = 60°。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '在 △ABC 中，∠A = 30°，∠B = 80°，则 ∠C = ______。',
    answer: '70°',
    explanation: '∠C = 180° - 30° - 80° = 70°。',
  },
  {
    type: 'fill',
    difficulty: 'easy',
    stem: '等边三角形的每个内角都是 ______。',
    answer: '60°',
    explanation: '等边三角形三内角相等，180° ÷ 3 = 60°。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '在 △ABC 中，∠A = 40°，∠B = 2∠A，求 ∠C。',
    answer: '∠B = 80°，∠C = 60°',
    explanation: '∠B = 80°，∠C = 180° - 40° - 80° = 60°。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '已知三角形三个内角分别为 (x + 20)°、(2x)°、x°，求 x 的值。',
    answer: 'x = 40',
    explanation: '(x + 20) + 2x + x = 180，4x = 160，x = 40。',
  },
  {
    type: 'solve',
    difficulty: 'hard',
    stem: '若三角形的一个外角等于 110°，且与它不相邻的两个内角相等，求这两个内角。',
    answer: '每个内角为 55°',
    explanation: '外角等于不相邻两内角之和，两角相等：110° ÷ 2 = 55°。',
  },
  {
    type: 'solve',
    difficulty: 'medium',
    stem: '在直角三角形中，一个锐角是另一个锐角的 2 倍，求这两个锐角的度数。',
    answer: '30° 和 60°',
    explanation:
      '两锐角和为 90°，设较小角为 x，则 x + 2x = 90°，x = 30°，另一个为 60°。',
  },
  {
    type: 'solve',
    difficulty: 'hard',
    stem: '一个三角形的三个内角中，最多有几个锐角？说明理由。',
    answer:
      '最多 3 个。若有两个钝角或直角，内角和将超过 180°；三个角都可以小于 90°（锐角三角形）。',
    explanation:
      '任意三角形内角和 180°，钝角或直角至多一个，其余两个必为锐角；锐角三角形中三个角都是锐角，故最多 3 个。',
  },
];

const seededMathQuestions: PublishedQuestion[] = [
  ...rationalSeeds.map((seed, i) =>
    buildMathQuestion(seed, i + 1, MATH_KNOWLEDGE_RATIONAL),
  ),
  ...axisSeeds.map((seed, i) =>
    buildMathQuestion(seed, i + 17, MATH_KNOWLEDGE_AXIS),
  ),
  ...polynomialSeeds.map((seed, i) =>
    buildMathQuestion(seed, i + 33, MATH_KNOWLEDGE_POLYNOMIAL),
  ),
  ...triangleSeeds.map((seed, i) =>
    buildMathQuestion(seed, i + 49, MATH_KNOWLEDGE_TRIANGLE),
  ),
  // 非已发布状态（用于验证 AC-03：只返回 published）
  buildMathQuestion(
    {
      type: 'choice',
      difficulty: 'easy',
      stem: '下列各数中，绝对值最小的是（　）',
      options: ['-2', '1', '-3', '0.5'],
      answer: 'D',
      explanation: '绝对值分别为 2、1、3、0.5，0.5 最小。',
    },
    65,
    MATH_KNOWLEDGE_AXIS,
    'unpublished',
  ),
  buildMathQuestion(
    {
      type: 'fill',
      difficulty: 'easy',
      stem: '计算：(-3) + 5 = ______。',
      answer: '2',
      explanation: '异号两数相加，取绝对值较大数的符号，5 - 3 = 2。',
    },
    66,
    MATH_KNOWLEDGE_RATIONAL,
    'unpublished',
  ),
  buildMathQuestion(
    {
      type: 'solve',
      difficulty: 'medium',
      stem: '化简：-(2x - 3) + (x + 1)。',
      answer: '-x + 4',
      explanation: '-2x + 3 + x + 1 = -x + 4。',
    },
    67,
    MATH_KNOWLEDGE_POLYNOMIAL,
    'unpublished',
  ),
  buildMathQuestion(
    {
      type: 'choice',
      difficulty: 'easy',
      stem: '数轴上表示 0 的数是（　）',
      options: ['原点', '正数', '负数', '无理数'],
      answer: 'A',
      explanation: '数轴上表示 0 的点是原点。',
    },
    68,
    MATH_KNOWLEDGE_AXIS,
    'offline',
  ),
  buildMathQuestion(
    {
      type: 'fill',
      difficulty: 'easy',
      stem: '若 x 的相反数是 -5，则 x = ______。',
      answer: '5',
      explanation: '-5 的相反数是 5。',
    },
    69,
    MATH_KNOWLEDGE_AXIS,
    'offline',
  ),
  buildMathQuestion(
    {
      type: 'solve',
      difficulty: 'easy',
      stem: '求 |-3| + |2| 的值。',
      answer: '5',
      explanation: '|-3| = 3，|2| = 2，和为 5。',
    },
    70,
    MATH_KNOWLEDGE_AXIS,
    'offline',
  ),
];

const buildOtherSubjectQuestion = (
  subject: string,
  seed: QuestionSeedInput,
  index: number,
  knowledgeNodeIds: string[],
): PublishedQuestion => ({
  id: `question-${subject}-${String(index).padStart(3, '0')}`,
  subject,
  knowledgeNodeIds,
  status: 'published',
  source: QUESTION_SOURCES[index % QUESTION_SOURCES.length],
  type: QUESTION_TYPE_LABELS[seed.type],
  difficulty: seed.difficulty,
  year: QUESTION_YEARS[index % QUESTION_YEARS.length],
  stem: seed.stem,
  options: seed.options?.map((text, oi) => ({
    label: String.fromCharCode(65 + oi),
    text,
  })),
  answer: seed.answer,
  explanation: seed.explanation,
  updatedAt: new Date(
    Date.UTC(2025, index % 12, 1 + index, 8, (index * 7) % 60),
  ).toISOString(),
  popularity: 800 - index * 13,
});

const seededOtherSubjectQuestions: PublishedQuestion[] = [
  // 语文
  buildOtherSubjectQuestion(
    'chinese',
    {
      type: 'choice',
      difficulty: 'easy',
      stem: '下列对文章主旨的概括，最准确的一项是（　）',
      options: [
        '赞美自然风光',
        '表达作者思乡之情',
        '揭示人物内心成长',
        '批判社会现象',
      ],
      answer: 'C',
      explanation:
        '文章通过主人公的经历与心理变化，揭示其内心成长这一核心主旨。',
    },
    1,
    ['kp-1-1-1-knowledge-tree-chinese'],
  ),
  buildOtherSubjectQuestion(
    'chinese',
    {
      type: 'fill',
      difficulty: 'easy',
      stem: '概括文章主旨时，应抓住文章的 ______ 和结尾段的议论抒情句。',
      answer: '标题（或：主要内容）',
      explanation: '标题常点明主旨方向，结尾议论抒情句往往直接点题。',
    },
    2,
    ['kp-1-1-1-knowledge-tree-chinese'],
  ),
  buildOtherSubjectQuestion(
    'chinese',
    {
      type: 'solve',
      difficulty: 'medium',
      stem: '请概括《背影》一文的主旨。',
      answer: '通过回忆父亲为“我”买橘子的背影，表现深沉的父爱与父子深情。',
      explanation: '抓住四次背影与三次落泪，体会父爱主题。',
    },
    3,
    ['kp-1-1-1-knowledge-tree-chinese'],
  ),
  buildOtherSubjectQuestion(
    'chinese',
    {
      type: 'solve',
      difficulty: 'medium',
      stem: '概括文章主旨的一般步骤是什么？',
      answer:
        '通读全文把握主要内容 → 分析标题与关键句 → 结合背景归纳中心思想。',
      explanation: '从内容到情感逐层提炼，注意首尾段和反复出现的语句。',
    },
    4,
    ['kp-1-1-1-knowledge-tree-chinese'],
  ),
  // 英语
  buildOtherSubjectQuestion(
    'english',
    {
      type: 'choice',
      difficulty: 'easy',
      stem: '— ______ do you go to school? — By bus.',
      options: ['What', 'How', 'When', 'Where'],
      answer: 'B',
      explanation: '询问交通方式用 How。',
    },
    1,
    [],
  ),
  buildOtherSubjectQuestion(
    'english',
    {
      type: 'choice',
      difficulty: 'easy',
      stem: 'There ______ a meeting tomorrow afternoon.',
      options: ['will be', 'will have', 'is going to have', 'are'],
      answer: 'A',
      explanation: 'there be 结构的将来时用 there will be。',
    },
    2,
    [],
  ),
  buildOtherSubjectQuestion(
    'english',
    {
      type: 'fill',
      difficulty: 'easy',
      stem: 'Tom is ______ (tall) than his brother.',
      answer: 'taller',
      explanation: '两者比较用比较级 taller。',
    },
    3,
    [],
  ),
  buildOtherSubjectQuestion(
    'english',
    {
      type: 'solve',
      difficulty: 'medium',
      stem: 'Translate: 我每天七点起床。',
      answer: 'I get up at seven every day.',
      explanation: 'get up at + 时间点，every day 表频率。',
    },
    4,
    [],
  ),
  // 物理
  buildOtherSubjectQuestion(
    'physics',
    {
      type: 'choice',
      difficulty: 'easy',
      stem: '下列物理量中，属于标量的是（　）',
      options: ['速度', '加速度', '路程', '力'],
      answer: 'C',
      explanation: '标量只有大小没有方向，路程是标量。',
    },
    1,
    [],
  ),
  buildOtherSubjectQuestion(
    'physics',
    {
      type: 'choice',
      difficulty: 'easy',
      stem: '一个物体做匀速直线运动，速度为 5m/s，则 10s 内通过的路程为（　）',
      options: ['2m', '5m', '50m', '0.5m'],
      answer: 'C',
      explanation: 's = vt = 5 × 10 = 50m。',
    },
    2,
    [],
  ),
  buildOtherSubjectQuestion(
    'physics',
    {
      type: 'fill',
      difficulty: 'medium',
      stem: '电阻 R = 10Ω，通过的电流 I = 2A，则两端电压 U = ______ V。',
      answer: '20',
      explanation: 'U = IR = 2 × 10 = 20V。',
    },
    3,
    [],
  ),
  buildOtherSubjectQuestion(
    'physics',
    {
      type: 'solve',
      difficulty: 'medium',
      stem: '一个质量为 2kg 的物体，在 10N 的水平拉力作用下沿光滑水平面运动，求加速度。',
      answer: '5 m/s²',
      explanation: '牛顿第二定律：a = F/m = 10/2 = 5 m/s²。',
    },
    4,
    [],
  ),
];

export const questionStore: PublishedQuestion[] = structuredClone([
  ...seededMathQuestions,
  ...seededOtherSubjectQuestions,
]);

// ---------- 作业资产线（mock）：加工作业 ----------

const seededHomework: HomeworkDetail = {
  id: 'asset-math-homework-1',
  subject: 'math',
  type: 'homework',
  status: 'formal',
  name: '有理数基础作业',
  updatedAt: '2026-08-19T11:00:00.000Z',
  source: 'seed',
  mountCount: 1,
  platformTemplateCount: 0,
  teacherTaskCount: 2,
  questionIds: [
    'question-math-001',
    'question-math-002',
    'question-math-003',
    'question-math-004',
    'question-math-005',
    'question-math-006',
    'question-math-007',
    'question-math-008',
  ],
};

export const homeworkStore: Record<string, HomeworkDetail> = {
  [seededHomework.id]: structuredClone(seededHomework),
};

export const touchHomework = (homework: HomeworkDetail) => {
  homework.updatedAt = now();
  const asset = assetStore.find((item) => item.id === homework.id);
  if (asset) asset.updatedAt = homework.updatedAt;
};

/** AC-15：统计某道试题被多少份作业引用（同一作业内试题不重复，按作业数计数）。 */
export const getHomeworkQuestionReferenceCount = (questionId: string) =>
  Object.values(homeworkStore).filter((homework) =>
    homework.questionIds.includes(questionId),
  ).length;

export const getRegisteredColumnUsageCounts = (subject: string) => {
  const counts: Record<string, number> = {};
  Object.values(studyGuideStore)
    .filter((guide) => guide.subject === subject)
    .flatMap((guide) => guide.structure)
    .forEach(function visit(node) {
      if (node.referenceId) {
        counts[node.referenceId] = (counts[node.referenceId] || 0) + 1;
      }
      node.children.forEach(visit);
    });
  return counts;
};

export const knowledgeBlockStore: KnowledgeBlock[] = [
  {
    id: 'kb-math-single',
    subject: 'math',
    type: 'single',
    html: mathContentBlocks[2].html,
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    referenceStudyGuides: [
      { id: seededStudyGuide.id, name: seededStudyGuide.name },
    ],
    createdAt: '2026-08-18T02:00:00.000Z',
    updatedAt: '2026-08-20T09:30:00.000Z',
  },
  {
    id: 'kb-math-comprehensive',
    subject: 'math',
    type: 'comprehensive',
    html: mathContentBlocks[1].html,
    knowledgeNodeIds: [
      'kp-1-1-1-knowledge-tree-math',
      'kp-1-1-2-knowledge-tree-math',
    ],
    referenceStudyGuides: [
      { id: seededStudyGuide.id, name: seededStudyGuide.name },
    ],
    createdAt: '2026-08-18T02:20:00.000Z',
    updatedAt: '2026-08-20T09:30:00.000Z',
  },
  {
    id: 'kb-math-method',
    subject: 'math',
    type: 'method',
    html: mathContentBlocks[3].html,
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    referenceStudyGuides: [
      { id: seededStudyGuide.id, name: seededStudyGuide.name },
    ],
    createdAt: '2026-08-18T03:00:00.000Z',
    updatedAt: '2026-08-20T09:30:00.000Z',
  },
  {
    id: 'kb-math-example',
    subject: 'math',
    type: 'example',
    html: '<p><strong>例：</strong>将 −3、0、2.5 标在数轴上，并比较大小。</p><ol><li>确定原点和单位长度</li><li>根据符号判断方向</li><li>按绝对值确定距离</li></ol>',
    knowledgeNodeIds: ['kp-1-1-2-knowledge-tree-math'],
    referenceStudyGuides: [],
    createdAt: '2026-08-19T04:00:00.000Z',
    updatedAt: '2026-08-19T04:00:00.000Z',
  },
];

let sequence = 0;
export const nextId = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
};

export const touchAsset = (asset: AssetItem) => {
  asset.updatedAt = now();
  const detail = studyGuideStore[asset.id];
  if (detail) detail.updatedAt = asset.updatedAt;
};

export const clone = <T>(value: T): T => structuredClone(value);

export const findAsset = (id: string, subject: string) =>
  assetStore.find((asset) => asset.id === id && asset.subject === subject);

export const isNameTaken = (
  subject: string,
  type: AssetType,
  name: string,
  excludeId?: string,
) =>
  assetStore.some(
    (asset) =>
      asset.id !== excludeId &&
      asset.subject === subject &&
      asset.type === type &&
      asset.name.trim() === name.trim(),
  );

export const collectLeafIds = (
  nodes: KnowledgeTreeNode[],
  targetId?: string,
): string[] => {
  const target = targetId
    ? (() => {
        const find = (
          list: KnowledgeTreeNode[],
        ): KnowledgeTreeNode | undefined => {
          for (const node of list) {
            if (node.key === targetId) return node;
            const child = find(node.children || []);
            if (child) return child;
          }
          return undefined;
        };
        return find(nodes);
      })()
    : undefined;
  const root = target ? [target] : nodes;
  return root.flatMap((node) =>
    node.children?.length ? collectLeafIds(node.children) : [node.key],
  );
};

export const collectLeaves = (
  nodes: KnowledgeTreeNode[],
  parentPath: string[] = [],
): Array<{ id: string; title: string; path: string[] }> =>
  nodes.flatMap((node) => {
    const path = [...parentPath, node.title];
    return node.children?.length
      ? collectLeaves(node.children, path)
      : [{ id: node.key, title: node.title, path }];
  });

export const getStudyGuideReferenceCounts = (subject: string) => {
  const counts: Record<string, number> = {};
  Object.values(studyGuideStore)
    .filter((guide) => guide.subject === subject)
    .flatMap((guide) => guide.structure)
    .forEach(function visit(node) {
      if (node.knowledgeNodeId) {
        counts[node.knowledgeNodeId] = (counts[node.knowledgeNodeId] || 0) + 1;
      }
      node.children.forEach(visit);
    });
  return counts;
};
