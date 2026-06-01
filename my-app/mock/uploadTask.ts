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

// ===== 路由（Task 6/7/8 在下方填充） =====

export default {};
