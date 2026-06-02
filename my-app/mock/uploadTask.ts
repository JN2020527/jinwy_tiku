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

// ===== stem HTML 模板池：8 道真实长题干，覆盖图片 / MathML / 表格 / 多段落 =====

const STEM_TEMPLATES: string[] = [
  // 0 - 图片 + 多段论述（数学几何证明）
  `<p>如图所示，在锐角三角形 ABC 中，AB = AC = 10，BC = 12。点 D 是 BC 的中点，点 E 在 AC 上，且 DE ⊥ AC。连接 AE 和 BE。</p>
<p><img src="https://placehold.co/420x180/eff6ff/2563eb?text=%E4%B8%89%E8%A7%92%E5%BD%A2+ABC+%E7%A4%BA%E6%84%8F%E5%9B%BE" alt="三角形 ABC 示意图" /></p>
<p>已知：</p>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>线段</th><th>长度</th></tr>
  <tr><td>AB</td><td>10</td></tr>
  <tr><td>AC</td><td>10</td></tr>
  <tr><td>BC</td><td>12</td></tr>
</table>
<p>请回答以下问题：</p>
<p>（1）求 AD 的长度；</p>
<p>（2）求 DE 的长度；</p>
<p>（3）求四边形 ABDE 的面积。</p>`,

  // 1 - 图片 + 数据分析（物理运动学）
  `<p>一辆汽车在平直公路上做直线运动，其速度 v 与时间 t 的关系如图所示。已知汽车在 0~2s 内做匀加速运动，在 2~6s 内做匀速运动，在 6~10s 内做匀减速运动直至停止。</p>
<p><img src="https://placehold.co/420x180/fef3c7/d97706?text=v-t+%E5%9B%BE%E5%83%8F" alt="v-t 图像" /></p>
<p>根据图像回答下列问题：</p>
<p>（1）求汽车在 0~2s 内的加速度大小；</p>
<p>（2）求汽车在 0~10s 内的总位移；</p>
<p>（3）若汽车质量为 1500kg，求在匀减速阶段受到的阻力大小。</p>`,

  // 2 - MathML + 多步推导（函数与导数）
  `<p>已知函数 <math><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mn>3</mn></mfrac><msup><mi>x</mi><mn>3</mn></msup><mo>+</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><msup><mi>x</mi><mn>2</mn></msup><mo>-</mo><mn>2</mn><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>，定义域为 <math><mrow><mi>x</mi><mo>∈</mo><mo>[</mo><mo>-</mo><mn>3</mn><mo>,</mo><mn>2</mn><mo>]</mo></mrow></math>。</p>
<p>请完成以下各题：</p>
<p>（1）求 <math><mrow><msup><mi>f</mi><mo>'</mo></msup><mo>(</mo><mi>x</mi><mo>)</mo></mrow></math> 并化简；</p>
<p>（2）求函数 <math><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo></mrow></math> 的单调递增区间和单调递减区间；</p>
<p>（3）求函数 <math><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo></mrow></math> 在区间 <math><mrow><mo>[</mo><mo>-</mo><mn>3</mn><mo>,</mo><mn>2</mn><mo>]</mo></mrow></math> 上的最大值和最小值；</p>
<p>（4）若方程 <math><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><mi>k</mi></mrow></math> 有三个不同的实数根，求实数 <math><mi>k</mi></math> 的取值范围。</p>`,

  // 3 - MathML + 表格（概率统计）
  `<p>某校对高一年级 600 名学生的数学期末考试成绩进行了统计，成绩 <math><mrow><mi>X</mi></mrow></math> 服从正态分布 <math><mrow><mi>N</mi><mo>(</mo><mn>75</mn><mo>,</mo><msup><mn>10</mn><mn>2</mn></msup><mo>)</mo></mrow></math>。部分统计结果如下表所示：</p>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>分数段</th><th>人数</th><th>频率</th></tr>
  <tr><td>[40, 55)</td><td>24</td><td>0.04</td></tr>
  <tr><td>[55, 65)</td><td>84</td><td>0.14</td></tr>
  <tr><td>[65, 75)</td><td>192</td><td>0.32</td></tr>
  <tr><td>[75, 85)</td><td>192</td><td>0.32</td></tr>
  <tr><td>[85, 95)</td><td>84</td><td>0.14</td></tr>
  <tr><td>[95, 100]</td><td>24</td><td>0.04</td></tr>
</table>
<p>已知正态分布的参考数据：</p>
<p><math><mrow><mi>P</mi><mo>(</mo><mi>μ</mi><mo>-</mo><mi>σ</mi><mo>&lt;</mo><mi>X</mi><mo>≤</mo><mi>μ</mi><mo>+</mo><mi>σ</mi><mo>)</mo><mo>≈</mo><mn>0.6827</mn></mrow></math>，<math><mrow><mi>P</mi><mo>(</mo><mi>μ</mi><mo>-</mo><mn>2</mn><mi>σ</mi><mo>&lt;</mo><mi>X</mi><mo>≤</mo><mi>μ</mi><mo>+</mo><mn>2</mn><mi>σ</mi><mo>)</mo><mo>≈</mo><mn>0.9545</mn></mrow></math></p>
<p>（1）从 600 名学生中随机抽取 1 人，求该生成绩不低于 85 分的概率；</p>
<p>（2）用分层抽样的方法从成绩在 [55, 65) 和 [85, 95) 的学生中抽取 8 人，再从这 8 人中随机选 3 人参加座谈会，求恰好有 2 人来自 [85, 95) 分数段的概率；</p>
<p>（3）若从全校高一 1200 名学生中随机抽取 4 人，记成绩不低于 85 分的人数为 <math><mi>Y</mi></math>，求 <math><mrow><mi>E</mi><mo>(</mo><mi>Y</mi><mo>)</mo></mrow></math>。</p>`,

  // 4 - 图片 + 复杂实验场景（化学实验）
  `<p>某化学兴趣小组利用如图所示装置进行以下实验：将一定质量的锌片放入盛有稀硫酸的烧杯中，用排水集气法收集产生的氢气。</p>
<p><img src="https://placehold.co/420x200/f0fdf4/16a34a?text=%E5%AE%9E%E9%AA%8C%E8%A3%85%E7%BD%AE%E7%A4%BA%E6%84%8F%E5%9B%BE" alt="实验装置示意图" /></p>
<p>实验记录如下：</p>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>时间 / min</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr>
  <tr><th>H₂ 体积 / mL</th><td>0</td><td>22</td><td>44</td><td>62</td><td>76</td><td>84</td><td>84</td></tr>
</table>
<p>已知：锌片质量为 6.5g，稀硫酸足量。标准状况下氢气密度为 0.0899 g/L。</p>
<p>请回答：</p>
<p>（1）写出锌与稀硫酸反应的化学方程式；</p>
<p>（2）计算理论上最多可产生氢气的体积（标准状况）；</p>
<p>（3）分析第 5~6 分钟氢气体积不再变化的原因；</p>
<p>（4）该实验的氢气产率是多少？（保留一位小数）</p>`,

  // 5 - 长文本阅读理解 + 多段（语文/综合）
  `<p><strong>阅读以下材料，回答问题。</strong></p>
<p>小明家装修新房，客厅长 6 米、宽 4.5 米、高 3 米。计划在客厅铺设木地板，四周墙面（除去门窗）刷乳胶漆。已知门窗总面积为 6 平方米。</p>
<p>材料报价如下：</p>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>项目</th><th>单价</th><th>备注</th></tr>
  <tr><td>木地板</td><td>180 元/㎡</td><td>含安装费，损耗按 5% 计</td></tr>
  <tr><td>乳胶漆</td><td>45 元/㎡</td><td>含人工费，涂刷两遍</td></tr>
  <tr><td>踢脚线</td><td>25 元/m</td><td>沿墙周长铺设，门窗处不铺</td></tr>
</table>
<p>请计算：</p>
<p>（1）需要购买多少平方米的木地板？（结果保留一位小数）</p>
<p>（2）需要刷乳胶漆的墙面面积是多少？</p>
<p>（3）踢脚线需要多少米？</p>
<p>（4）以上三项的总费用是多少元？（结果保留整数）</p>`,

  // 6 - 地理图表 + 多问
  `<p>读"中国某地区等高线地形图"（比例尺 1:50000，等高距 50m），回答下列问题。</p>
<p><img src="https://placehold.co/420x220/fdf2f8/db2777?text=%E7%AD%89%E9%AB%98%E7%BA%BF%E5%9C%B0%E5%BD%A2%E5%9B%BE" alt="等高线地形图" /></p>
<p>已知图中 A 点海拔为 350m，B 点海拔为 150m，AB 两点图上距离为 4cm。图中小河自北向南流。</p>
<p>（1）计算 AB 两点的实际水平距离；</p>
<p>（2）计算 AB 两地的相对高度及平均坡度；</p>
<p>（3）判断图中 C 处（等高线向低处凸出）的地形名称，并说明其对交通线路建设的影响；</p>
<p>（4）若要在该区域修建一座水库，大坝应建在哪个位置最合适？请说明理由；</p>
<p>（5）从地形角度分析，甲、乙两个居民点哪个发展前景更好？为什么？</p>`,

  // 7 - 综合应用题（英语完形填空风格，但数学内容）
  `<p>已知数列 <math><mrow><mo>{</mo><msub><mi>a</mi><mi>n</mi></msub><mo>}</mo></mrow></math> 的前 n 项和为 <math><mrow><msub><mi>S</mi><mi>n</mi></msub></mrow></math>，且满足 <math><mrow><msub><mi>S</mi><mi>n</mi></msub><mo>=</mo><mn>2</mn><msub><mi>a</mi><mi>n</mi></msub><mo>-</mo><mn>1</mn></mrow></math>（<math><mrow><mi>n</mi><mo>∈</mo><msup><mi>N</mi><mo>*</mo></msup></mrow></math>）。</p>
<p>设数列 <math><mrow><mo>{</mo><msub><mi>b</mi><mi>n</mi></msub><mo>}</mo></mrow></math> 满足 <math><mrow><msub><mi>b</mi><mi>n</mi></msub><mo>=</mo><msub><mi>a</mi><mi>n</mi></msub><mo>+</mo><msub><mi>a</mi><mi>n</mi><mo>+</mo><mn>1</mn></msub></mrow></math>（<math><mrow><mi>n</mi><mo>≥</mo><mn>1</mn></mrow></math>），数列 <math><mrow><mo>{</mo><msub><mi>c</mi><mi>n</mi></msub><mo>}</mo></mrow></math> 满足 <math><mrow><msub><mi>c</mi><mi>n</mi></msub><mo>=</mo><mfrac><mn>1</mn><mrow><msub><mi>b</mi><mi>n</mi></msub><mo>·</mo><msub><mi>b</mi><mi>n</mi><mo>+</mo><mn>1</mn></msub></mrow></mfrac></mrow></math>。</p>
<p>请完成以下问题：</p>
<p>（1）求数列 <math><mrow><mo>{</mo><msub><mi>a</mi><mi>n</mi></msub><mo>}</mo></mrow></math> 的通项公式；</p>
<p>（2）证明数列 <math><mrow><mo>{</mo><msub><mi>b</mi><mi>n</mi></msub><mo>}</mo></mrow></math> 是等比数列，并求其公比；</p>
<p>（3）求数列 <math><mrow><mo>{</mo><msub><mi>c</mi><mi>n</mi></msub><mo>}</mo></mrow></math> 的前 n 项和 <math><mrow><msub><mi>T</mi><mi>n</mi></msub></mrow></math>；</p>
<p>（4）设 <math><mrow><msub><mi>d</mi><mi>n</mi></msub><mo>=</mo><msub><mi>a</mi><mi>n</mi></msub><mo>·</mo><msub><mi>c</mi><mi>n</mi></msub></mrow></math>，若 <math><mrow><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msub><mi>d</mi><mi>k</mi></msub><mo>&lt;</mo><mi>M</mi></mrow></math> 对任意正整数 n 恒成立，求实数 M 的最小值。</p>`,
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
          // 自动通过：85 分左右，个别维度小扣分
          const minorDeduct = i % 2 === 0 ? 2 : 0;
          base.qualityDimensions = [
            { name: '题干完整度', score: 25, maxScore: 25 },
            { name: '公式/图片正确性', score: 20, maxScore: 20 },
            {
              name: '答案规范性',
              score: 20 - minorDeduct,
              maxScore: 20,
              note: minorDeduct ? '缺少单位' : undefined,
            },
            { name: '解析完整性', score: 20, maxScore: 20 },
          ];
          base.qualityScore = base.qualityDimensions.reduce(
            (s, d) => s + d.score,
            0,
          );
          base.qualityVerdict = 'auto-pass';
        } else if (i <= 7) {
          // 中段：55-75 分，部分维度明显丢分
          base.qualityDimensions =
            i === 6
              ? [
                  {
                    name: '题干完整度',
                    score: 20,
                    maxScore: 25,
                    note: '缺关键条件',
                  },
                  {
                    name: '公式/图片正确性',
                    score: 15,
                    maxScore: 20,
                    note: '公式格式不规范',
                  },
                  { name: '答案规范性', score: 18, maxScore: 20, note: '个别表述不严谨' },
                  {
                    name: '解析完整性',
                    score: 12,
                    maxScore: 20,
                    note: '缺少解题步骤',
                  },
                ]
              : [
                  {
                    name: '题干完整度',
                    score: 18,
                    maxScore: 25,
                    note: '条件不清晰',
                  },
                  { name: '公式/图片正确性', score: 16, maxScore: 20, note: '部分公式排版不规范' },
                  {
                    name: '答案规范性',
                    score: 12,
                    maxScore: 20,
                    note: '缺少单位',
                  },
                  {
                    name: '解析完整性',
                    score: 12,
                    maxScore: 20,
                    note: '缺少解题步骤',
                  },
                ];
          base.qualityScore = base.qualityDimensions.reduce(
            (s, d) => s + d.score,
            0,
          );
          base.qualityVerdict = 'mid-need-review';
        } else {
          // 自动拒绝：30 分，多维度严重丢分
          base.qualityDimensions = [
            {
              name: '题干完整度',
              score: 8,
              maxScore: 25,
              note: '缺失关键信息',
            },
            {
              name: '公式/图片正确性',
              score: 10,
              maxScore: 20,
              note: '图片无法识别',
            },
            {
              name: '答案规范性',
              score: 2,
              maxScore: 20,
              note: '答案格式错误',
            },
            {
              name: '解析完整性',
              score: 10,
              maxScore: 20,
              note: '解析不完整',
            },
          ];
          base.qualityScore = base.qualityDimensions.reduce(
            (s, d) => s + d.score,
            0,
          );
          base.qualityVerdict = 'auto-reject';
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

// ===== Umi mock 路由：列表 / 详情 / 创建 / 阶段题目 + 8 阶段写操作 =====

export default {
  // ----- 列表 / 详情 / 创建（Task 7） -----

  'GET /api/upload-task/list': (req: Request, res: Response) => {
    const statusParam = (req.query.status as string | undefined) ?? 'all';
    const current = Number(req.query.current ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);

    const advanced = tasks.map((t) => {
      const after = lazyAdvance(t);
      return { ...after, status: deriveStatus(after) };
    });
    tasks = advanced;

    const bucketCounts: Record<BucketKey, number> = {
      all: advanced.length,
      'pending-human': 0,
      processing: 0,
      published: 0,
      rejected: 0,
    };
    for (const t of advanced) {
      const b = bucketOf(t.status);
      bucketCounts[b] = (bucketCounts[b] ?? 0) + 1;
    }

    const filtered =
      statusParam === 'all'
        ? advanced
        : advanced.filter((t) => bucketOf(t.status) === statusParam);

    const start = (current - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);

    ok(res, { data: pageData, total: filtered.length, bucketCounts });
  },

  'GET /api/upload-task/:id': (req: Request, res: Response) => {
    const { id } = req.params;
    const found = tasks.find((t) => t.id === id);
    if (!found) {
      fail(res, '任务不存在', 404);
      return;
    }
    const after = lazyAdvance(found);
    const refreshed = { ...after, status: deriveStatus(after) };
    tasks = tasks.map((t) => (t.id === id ? refreshed : t));
    ok(res, refreshed);
  },

  'POST /api/upload-task/create': (req: Request, res: Response) => {
    const body = req.body ?? {};
    const required = ['name', 'fileName', 'subject', 'grade', 'source', 'batch'];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === '') {
        fail(res, `字段 ${k} 不能为空`);
        return;
      }
    }
    const id = genId('task');
    const nowStr = now();
    const progress = initialStageProgress();
    progress.quality = { state: 'processing', startedAt: nowStr };
    const newTask: UploadTask = {
      id,
      name: body.name,
      fileName: body.fileName,
      subject: body.subject,
      grade: body.grade,
      source: body.source,
      sourceNote: body.sourceNote,
      batch: body.batch,
      totalQuestions: 8,
      currentStage: 'quality',
      status: 'pending-human',
      stageProgress: progress,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    const withStatus = { ...newTask, status: deriveStatus(newTask) };

    tasks = [withStatus, ...tasks];
    genQuestionsForTasks([withStatus]);
    ok(res, withStatus);
  },

  'GET /api/upload-task/:id/stage/:stage/questions': (
    req: Request,
    res: Response,
  ) => {
    const { id, stage } = req.params;
    if (!isValidStage(stage)) {
      fail(res, '无效阶段');
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    ok(res, questions[id] ?? []);
  },

  // ----- 质量检测 -----

  'POST /api/upload-task/quality/keep': (req: Request, res: Response) => {
    const { taskId, questionIds } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, qualityKept: true } : q,
    );
    maybeAdvance(taskId, 'quality');
    ok(res, undefined);
  },

  'POST /api/upload-task/quality/reject': (req: Request, res: Response) => {
    const { taskId, questionIds, reason } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    if (!reason || String(reason).trim() === '') {
      fail(res, '删除原因必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, qualityKept: false } : q,
    );
    maybeAdvance(taskId, 'quality');
    ok(res, undefined);
  },

  // ----- 解析审核 -----

  'POST /api/upload-task/parse-review/update': (req: Request, res: Response) => {
    const { taskId, questionId, patch } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      fail(res, 'patch 必须为对象');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged = { ...q, ...patch, parseReviewed: true };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    maybeAdvance(taskId, 'parse-review');
    ok(res, updated);
  },

  'POST /api/upload-task/parse-review/regenerate': (
    req: Request,
    res: Response,
  ) => {
    const { taskId, questionId } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged: TaskQuestion = {
        ...q,
        stem: `${q.stem}<p>（重新生成 v2）</p>`,
        parseConfidence: {
          stem: 0.9,
          options: 0.9,
          answer: 0.9,
          analysis: 0.9,
        },
      };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    maybeAdvance(taskId, 'parse-review');
    ok(res, updated);
  },

  'POST /api/upload-task/parse-review/confirm': (
    req: Request,
    res: Response,
  ) => {
    const { taskId, questionIds } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, parseReviewed: true } : q,
    );
    maybeAdvance(taskId, 'parse-review');
    ok(res, undefined);
  },

  // ----- 打标审核 -----

  'POST /api/upload-task/tag-review/update': (req: Request, res: Response) => {
    const { taskId, questionId, tags } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    if (!tags || typeof tags !== 'object') {
      fail(res, 'tags 必须为对象');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged: TaskQuestion = { ...q, tags };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    maybeAdvance(taskId, 'parse-review');
    ok(res, updated);
  },

  'POST /api/upload-task/tag-review/regenerate': (
    req: Request,
    res: Response,
  ) => {
    const { taskId, questionId } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged: TaskQuestion = {
        ...q,
        tags: {
          knowledgePoints: ['kp-1-1-1', 'kp-2-1'],
          questionType: q.tags?.questionType,
          difficulty: q.tags?.difficulty ?? 3,
          cognitionLevel: '分析',
        },
      };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    maybeAdvance(taskId, 'parse-review');
    ok(res, updated);
  },

  'POST /api/upload-task/tag-review/confirm': (req: Request, res: Response) => {
    const { taskId, questionIds } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, tagReviewed: true } : q,
    );
    maybeAdvance(taskId, 'tag-review');
    ok(res, undefined);
  },

  // ----- 系统态阶段强制推进 -----

  'POST /api/upload-task/advance': (req: Request, res: Response) => {
    const { taskId, stage } = req.body ?? {};
    if (!taskId || !isValidStage(stage)) {
      fail(res, '入参不合法');
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    if (task.currentStage !== stage) {
      fail(res, '阶段不匹配');
      return;
    }
    if (HUMAN_STAGES.has(stage as StageKey)) {
      fail(res, '人工阶段不可自动推进');
      return;
    }
    const advanced = advanceToNext(
      task,
      stage as StageKey,
      genStageSummary(stage as StageKey, questions[taskId]),
    );
    const withStatus = { ...advanced, status: deriveStatus(advanced) };
    tasks = tasks.map((t) => (t.id === taskId ? withStatus : t));
    ok(res, withStatus);
  },

  // ----- 渠道分发 -----

  'GET /api/upload-task/:id/distribute': (req: Request, res: Response) => {
    const { id } = req.params;
    ok(res, distConfigs[id] ?? null);
  },

  'POST /api/upload-task/distribute/save': (req: Request, res: Response) => {
    const body = (req.body ?? {}) as DistributeConfig;
    if (!body.taskId) {
      fail(res, 'taskId 必填');
      return;
    }
    if (!body.scope || !body.scope.institutions) {
      fail(res, 'scope.institutions 必填');
      return;
    }
    if (!Array.isArray(body.channels) || body.channels.length === 0) {
      fail(res, '至少选择一个分发渠道');
      return;
    }
    const task = tasks.find((t) => t.id === body.taskId);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    distConfigs[body.taskId] = { ...body, configuredAt: now() };

    const nowStr = now();
    const updatedTask: UploadTask = {
      ...task,
      currentStage: 'distribute',
      stageProgress: {
        ...task.stageProgress,
        distribute: {
          state: 'done',
          startedAt: task.stageProgress.distribute.startedAt ?? nowStr,
          finishedAt: nowStr,
          summary: `已分发至 ${body.channels.length} 渠道`,
        },
      },
      updatedAt: nowStr,
    };
    const withStatus = { ...updatedTask, status: deriveStatus(updatedTask) };
    tasks = tasks.map((t) => (t.id === body.taskId ? withStatus : t));
    ok(res, withStatus);
  },
};
