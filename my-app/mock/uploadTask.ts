import { Request, Response } from 'express';
import {
  HUMAN_STAGES,
  SIMULATED_DURATION_MS,
  STAGE_KEYS,
  bucketOf,
  deriveStatus,
  isValidStage,
  nextStageOf,
} from '../src/pages/UploadTask/constants';
import type {
  BucketKey,
  DistributeConfig,
  StageKey,
  StageProgress,
  TaskQuestion,
  UploadTask,
} from '../src/pages/UploadTask/types';

// ===== 模块级状态：dev server 启动时由 seedInitialTasks() 重置 =====

let tasks: UploadTask[] = [];
let questions: Record<string, TaskQuestion[]> = {};
let distConfigs: Record<string, DistributeConfig> = {};

// ===== 通用 helper =====

function ok<T>(res: Response, data: T) {
  res.json({ success: true, message: '', data });
}

function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, message, data: null });
}

function now(): string {
  return new Date().toISOString();
}

// 闭包计数器：deterministic ID，避免热重载时 ID 漂移
const makeCounter = () => {
  let n = 0;
  return () => ++n;
};
const taskCounter = makeCounter();
const questionCounter = makeCounter();
function genId(prefix: 'task' | 'q' | 'dist'): string {
  if (prefix === 'task') return `task-${taskCounter()}`;
  if (prefix === 'q') return `q-${questionCounter()}`;
  return `dist-${Date.now()}`;
}

function initialStageProgress(): Record<StageKey, StageProgress> {
  return STAGE_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: { state: 'pending' } }),
    {} as Record<StageKey, StageProgress>,
  );
}

// ===== stem HTML 模板池：3 段 <img> / 2 段 MathML / 3 段纯文本 =====

const STEM_TEMPLATES: string[] = [
  // 0 - 图片
  '<p>如图所示，已知三角形 ABC 中，AB = AC。求证角 B 等于角 C。</p><p><img src="https://placehold.co/400x200" alt="三角形 ABC" /></p>',
  // 1 - 图片
  '<p>下图是一辆小车沿直线运动的位移-时间图像，求小车在 0~5 秒内的平均速度。</p><p><img src="https://placehold.co/400x200" alt="s-t 图" /></p>',
  // 2 - MathML
  '<p>已知函数 <math><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>2</mn><mi>x</mi><mo>-</mo><mn>3</mn></mrow></math>，求 f(x) 的最小值。</p>',
  // 3 - MathML
  '<p>解不等式 <math><mrow><mfrac><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><mrow><mi>x</mi><mo>-</mo><mn>2</mn></mrow></mfrac><mo>&gt;</mo><mn>0</mn></mrow></math>。</p>',
  // 4 - 图片
  '<p>如下图所示电路，已知 R1 = 10Ω，R2 = 20Ω，电源电压 6V，求干路电流。</p><p><img src="https://placehold.co/400x200" alt="电路图" /></p>',
  // 5 - 纯文本
  '<p>一个长方形的长是 12 厘米，宽是 8 厘米，求它的周长和面积。</p>',
  // 6 - 纯文本
  '<p>小明从家到学校用了 15 分钟，速度为每分钟 80 米，求小明家到学校的距离。</p>',
  // 7 - 纯文本
  '<p>下列说法中正确的是（    ）：质量是物体的固有属性，与位置无关。重力的方向总是指向地心。</p>',
];

// ===== 状态机：advanceToNext / lazyAdvance / maybeAdvance =====

function advanceToNext(
  task: UploadTask,
  stageJustDone: StageKey,
  summary: string,
): UploadTask {
  const nowStr = now();
  const next = nextStageOf(stageJustDone);

  const doneProgress: StageProgress = {
    ...task.stageProgress[stageJustDone],
    state: 'done',
    finishedAt: nowStr,
    summary,
  };

  if (next === null) {
    // distribute 是终态：stamp done 后不再前进
    return {
      ...task,
      stageProgress: { ...task.stageProgress, [stageJustDone]: doneProgress },
      updatedAt: nowStr,
    };
  }

  // 下一阶段是系统态：自动开跑（state='processing' + startedAt）
  // 下一阶段是人工态：state='pending'，等用户进入页面操作
  const isNextSystem = !HUMAN_STAGES.has(next);
  const nextProgress: StageProgress = isNextSystem
    ? { state: 'processing', startedAt: nowStr }
    : { state: 'pending' };

  return {
    ...task,
    currentStage: next,
    stageProgress: {
      ...task.stageProgress,
      [stageJustDone]: doneProgress,
      [next]: nextProgress,
    },
    updatedAt: nowStr,
  };
}

function genStageSummary(stage: StageKey, qs: TaskQuestion[] | undefined): string {
  const list = qs ?? [];
  switch (stage) {
    case 'quality': {
      const kept = list.filter((q) => q.qualityKept === true).length;
      const removed = list.filter((q) => q.qualityKept === false).length;
      return `通过 ${kept} / 删除 ${removed}`;
    }
    case 'dedupe': {
      const dup = list.filter((q) => !!q.duplicateOf).length;
      return `发现 ${dup} 道重复题`;
    }
    case 'parse': {
      const lowConf = list.filter((q) => {
        const c = q.parseConfidence ?? {};
        return Object.values(c).some((v) => (v ?? 1) < 0.8);
      }).length;
      return `解析准确率 96% · 低置信字段 ${lowConf} 处`;
    }
    case 'parse-review':
      return `解析审核完成 · 已确认 ${list.filter((q) => q.parseReviewed).length} 题`;
    case 'tag': {
      const needReview = list.filter((q) => !q.tagReviewed).length;
      return `打标完成 · 待复核 ${needReview} 题`;
    }
    case 'tag-review':
      return `打标审核完成 · 已确认 ${list.filter((q) => q.tagReviewed).length} 题`;
    case 'publish':
      return '已发布至题库';
    case 'distribute':
      return '已配置分发渠道';
    default:
      return '';
  }
}

function lazyAdvance(task: UploadTask): UploadTask {
  const cur = task.currentStage;
  // 人工态：必须等用户点确认
  if (HUMAN_STAGES.has(cur)) return task;
  const sp = task.stageProgress[cur];
  if (sp.state !== 'processing' || !sp.startedAt) return task;

  const elapsed = Date.now() - new Date(sp.startedAt).getTime();
  const target = SIMULATED_DURATION_MS[cur] ?? 3000;
  if (elapsed < target) return task;

  // 注：原型简化——单次最多推一段。如果用户停留 10s 跨越多段，下次 GET 继续推。
  return advanceToNext(task, cur, genStageSummary(cur, questions[task.id]));
}

function isStageReviewed(q: TaskQuestion, stage: StageKey): boolean {
  switch (stage) {
    case 'quality':
      return q.qualityKept !== undefined;
    case 'parse-review':
      return q.parseReviewed === true;
    case 'tag-review':
      return q.tagReviewed === true;
    default:
      return true;
  }
}

function isKeptForStage(q: TaskQuestion, stage: StageKey): boolean {
  switch (stage) {
    case 'quality':
      return q.qualityKept === true;
    case 'parse-review':
    case 'tag-review':
      return true;
    default:
      return true;
  }
}

function maybeAdvance(taskId: string, stage: StageKey): void {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  const qs = questions[taskId] ?? [];
  const allReviewed = qs.every((q) => isStageReviewed(q, stage));
  if (!allReviewed) return;

  const keptCount = qs.filter((q) => isKeptForStage(q, stage)).length;
  if (keptCount === 0) {
    // 全部被拒：currentStage 不前进，state 标 rejected
    const rejectedProgress: StageProgress = {
      ...task.stageProgress[stage],
      state: 'rejected',
      finishedAt: now(),
      summary: '所有题目均被拒绝',
    };
    tasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            stageProgress: { ...t.stageProgress, [stage]: rejectedProgress },
            updatedAt: now(),
          }
        : t,
    );
    return;
  }

  const advanced = advanceToNext(task, stage, genStageSummary(stage, qs));
  tasks = tasks.map((t) => (t.id === taskId ? advanced : t));
}

// ===== 样本数据生成 =====

function genQuestionsForTasks(seedTasks: UploadTask[]): void {
  for (const task of seedTasks) {
    const stageIdx = STAGE_KEYS.indexOf(task.currentStage);
    // 关键区分：
    // - hasQualityScore: AI 质量评分已生成 —— currentStage 在或晚于 quality
    //   （quality processing 阶段就要给评分，否则 BatchReview 空表）
    // - qualityResolved: 人工质检已落决策 —— currentStage 严格晚于 quality
    const hasQualityScore = stageIdx >= STAGE_KEYS.indexOf('quality');
    const qualityResolved = stageIdx > STAGE_KEYS.indexOf('quality');
    const passedDedupe = stageIdx > STAGE_KEYS.indexOf('dedupe');
    const passedParse = stageIdx > STAGE_KEYS.indexOf('parse');
    const passedTag = stageIdx > STAGE_KEYS.indexOf('tag');

    const qs: TaskQuestion[] = [];
    for (let i = 1; i <= 8; i++) {
      // 题型分布：1,2 单选 / 3,4 多选 / 5,6 填空 / 7,8 解答
      let qType: 'single' | 'multi' | 'fill' | 'essay';
      if (i <= 2) qType = 'single';
      else if (i <= 4) qType = 'multi';
      else if (i <= 6) qType = 'fill';
      else qType = 'essay';

      const base: TaskQuestion = {
        id: `${task.id}-q-${i}`,
        taskId: task.id,
        index: i,
        stem: STEM_TEMPLATES[i - 1],
      };

      if (qType === 'single') {
        base.options = ['A. 选项一', 'B. 选项二', 'C. 选项三', 'D. 选项四'];
        base.answer = 'B';
        base.analysis = '<p>本题考查基础概念，正确答案为 B。</p>';
      } else if (qType === 'multi') {
        base.options = ['A. 选项一', 'B. 选项二', 'C. 选项三', 'D. 选项四'];
        base.answer = 'AC';
        base.analysis = '<p>本题考查综合判断，正确答案为 AC。</p>';
      } else if (qType === 'fill') {
        base.answer = '12 厘米';
        base.analysis = '<p>代入公式直接得到结果。</p>';
      } else {
        base.answer = '<p>解：由题意可得 ...（详见解析）</p>';
        base.analysis = '<p>本题考查综合应用能力，解题步骤分三步：① ... ② ... ③ ...</p>';
      }

      // AI 质量评分 + 自动判定：currentStage 在或晚于 quality 时即生成
      if (hasQualityScore) {
        if (i <= 5) {
          // 自动通过：80+ 分
          base.qualityScore = 80 + i;
          base.qualityVerdict = 'auto-pass';
        } else if (i <= 7) {
          // 中段：55-75 分，2 条扣分（人工待决）
          base.qualityScore = i === 6 ? 65 : 58;
          base.qualityVerdict = 'mid-need-review';
          base.qualityDeductions = [
            { rule: '缺解析说明', points: 15 },
            { rule: '选项格式不规范', points: 20 },
          ];
        } else {
          // 自动拒绝：30 分
          base.qualityScore = 30;
          base.qualityVerdict = 'auto-reject';
          base.qualityDeductions = [
            { rule: '题干缺失关键信息', points: 40 },
            { rule: '答案不规范', points: 30 },
          ];
        }
      }

      // 人工质检决策（qualityKept）：
      // - quality 已结束的任务：auto-pass → true，auto-reject → false，mid → true（已通过审核）
      // - quality 正在进行的任务：auto-pass → true（AI 直接放行），auto-reject → false（AI 直接拒绝），
      //   mid-need-review → undefined（等待人工决策，BatchReview 表里的就是这批）
      if (hasQualityScore) {
        if (base.qualityVerdict === 'auto-pass') {
          base.qualityKept = true;
        } else if (base.qualityVerdict === 'auto-reject') {
          base.qualityKept = false;
        } else if (qualityResolved) {
          // 中段题：阶段已结束意味着人工已选保留
          base.qualityKept = true;
        }
        // 否则（mid + currentStage='quality'）：保持 undefined，等用户在 BatchReview 操作
      }

      // 重复检测产物：已过 dedupe 的任务，index=3 的题打 duplicateOf
      if (passedDedupe && i === 3) {
        base.duplicateOf = 'other-task-q-id';
      }

      // 解析产物：已过 parse 的任务
      if (passedParse) {
        // 每题至少 1 个字段 < 0.8（用 i%4 选）
        const lowField = (['stem', 'options', 'answer', 'analysis'] as const)[i % 4];
        const conf: Partial<
          Record<'stem' | 'options' | 'answer' | 'analysis', number>
        > = {
          stem: 0.95,
          options: 0.92,
          answer: 0.93,
          analysis: 0.9,
        };
        conf[lowField] = 0.65;
        base.parseConfidence = conf;
      }

      // 打标产物：已过 tag 的任务
      // 知识点 ID 来自 mock/tagSystem.ts 真实树（kp-1-1-1 / kp-1-2 / kp-2-1 均已确认存在）
      if (passedTag) {
        const kpSamples = [
          ['kp-1-1-1'],
          ['kp-1-2'],
          ['kp-2-1'],
          ['kp-1-1-1', 'kp-1-2'],
        ];
        base.tags = {
          knowledgePoints: kpSamples[i % kpSamples.length],
          questionType:
            qType === 'single'
              ? '单选题'
              : qType === 'multi'
                ? '多选题'
                : qType === 'fill'
                  ? '填空题'
                  : '解答题',
          difficulty: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          cognitionLevel: i % 2 === 0 ? '理解' : '应用',
        };
        base.tagConfidence = {
          knowledgePoints: 0.88,
          questionType: 0.95,
          difficulty: 0.72,
        };
      }

      qs.push(base);
    }
    questions[task.id] = qs;
  }
}

// ===== 10 个示例任务 =====

interface SeedConfig {
  name: string;
  fileName: string;
  subject: UploadTask['subject'];
  grade: UploadTask['grade'];
  source: UploadTask['source'];
  batch: string;
  currentStage: StageKey;
  curState: StageProgress['state'];
  withDistConfig?: boolean;
}

const SEED_CONFIGS: SeedConfig[] = [
  // 2 个 quality 待人工
  {
    name: '2024 中考数学 A 卷',
    fileName: '2024-中考数学-A.docx',
    subject: '数学',
    grade: '初中',
    source: '原创',
    batch: 'batch-2024-12-A',
    currentStage: 'quality',
    curState: 'processing',
  },
  {
    name: '2024 中考物理 B 卷',
    fileName: '2024-中考物理-B.docx',
    subject: '物理',
    grade: '初中',
    source: '改编',
    batch: 'batch-2024-12-B',
    currentStage: 'quality',
    curState: 'processing',
  },
  // 1 个 parse-review
  {
    name: '高一数学期中模拟',
    fileName: 'g1-math-mid.docx',
    subject: '数学',
    grade: '高中',
    source: '原创',
    batch: 'batch-2024-12-C',
    currentStage: 'parse-review',
    curState: 'processing',
  },
  // 2 个 tag 系统处理中
  {
    name: '初二英语单元卷',
    fileName: 'g8-en-unit3.docx',
    subject: '英语',
    grade: '初中',
    source: '引用',
    batch: 'batch-2024-12-D',
    currentStage: 'tag',
    curState: 'processing',
  },
  {
    name: '高三化学一轮复习',
    fileName: 'g12-chem-r1.docx',
    subject: '化学',
    grade: '高中',
    source: '改编',
    batch: 'batch-2024-12-E',
    currentStage: 'tag',
    curState: 'processing',
  },
  // 3 个 published（distribute pending）
  {
    name: '小学六年级语文阅读',
    fileName: 'g6-chinese-read.docx',
    subject: '语文',
    grade: '小学',
    source: '原创',
    batch: 'batch-2024-11-F',
    currentStage: 'distribute',
    curState: 'pending',
  },
  {
    name: '初一生物期末卷',
    fileName: 'g7-bio-final.docx',
    subject: '生物',
    grade: '初中',
    source: '引用',
    batch: 'batch-2024-11-G',
    currentStage: 'distribute',
    curState: 'pending',
  },
  {
    name: '高二历史模拟卷',
    fileName: 'g11-history-mock.docx',
    subject: '历史',
    grade: '高中',
    source: '改编',
    batch: 'batch-2024-11-H',
    currentStage: 'distribute',
    curState: 'pending',
  },
  // 2 个 distributed（终态）
  {
    name: '高考地理真题汇编',
    fileName: 'gk-geo-real.docx',
    subject: '地理',
    grade: '高中',
    source: '引用',
    batch: 'batch-2024-10-I',
    currentStage: 'distribute',
    curState: 'done',
    withDistConfig: true,
  },
  {
    name: '中考政治速记卷',
    fileName: 'zk-poli-quick.docx',
    subject: '政治',
    grade: '初中',
    source: '原创',
    batch: 'batch-2024-10-J',
    currentStage: 'distribute',
    curState: 'done',
    withDistConfig: true,
  },
];

function buildSeedTask(cfg: SeedConfig): UploadTask {
  const id = genId('task');
  const nowStr = now();
  const progress = initialStageProgress();
  const curIdx = STAGE_KEYS.indexOf(cfg.currentStage);

  // 把 currentStage 之前的所有阶段都 stamp done + summary
  for (let i = 0; i < curIdx; i++) {
    const key = STAGE_KEYS[i];
    progress[key] = {
      state: 'done',
      startedAt: nowStr,
      finishedAt: nowStr,
      summary: `已完成（示例数据）`,
    };
  }

  // 当前阶段
  const isSystem = !HUMAN_STAGES.has(cfg.currentStage);
  if (cfg.curState === 'processing') {
    progress[cfg.currentStage] = {
      state: 'processing',
      startedAt: isSystem
        ? new Date(Date.now() - 500).toISOString() // 系统态刚开始跑（不要立即触发 lazyAdvance）
        : nowStr,
    };
  } else if (cfg.curState === 'done') {
    progress[cfg.currentStage] = {
      state: 'done',
      startedAt: nowStr,
      finishedAt: nowStr,
      summary: '已配置分发渠道',
    };
  } else {
    progress[cfg.currentStage] = { state: 'pending' };
  }

  const task: UploadTask = {
    id,
    name: cfg.name,
    fileName: cfg.fileName,
    subject: cfg.subject,
    grade: cfg.grade,
    source: cfg.source,
    batch: cfg.batch,
    totalQuestions: 8,
    currentStage: cfg.currentStage,
    status: 'processing', // 占位，下面 deriveStatus 重算
    stageProgress: progress,
    createdAt: nowStr,
    updatedAt: nowStr,
  };
  return { ...task, status: deriveStatus(task) };
}

function seedInitialTasks(): void {
  const seeded = SEED_CONFIGS.map(buildSeedTask);
  tasks = seeded;
  genQuestionsForTasks(seeded);

  // 为 withDistConfig 的任务生成最小分发配置
  for (let i = 0; i < SEED_CONFIGS.length; i++) {
    if (SEED_CONFIGS[i].withDistConfig) {
      const t = seeded[i];
      distConfigs[t.id] = {
        taskId: t.id,
        scope: {
          institutions: 'all',
          grades: [t.grade],
          subjects: [t.subject],
          roles: ['teacher', 'student'],
        },
        channels: ['paper-bank', 'export'],
        configuredAt: now(),
      };
    }
  }
}

seedInitialTasks();

// ===== 路由（Task 6/7/8 在下方填充） =====

export default {};
