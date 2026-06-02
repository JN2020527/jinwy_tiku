export type DirectoryItem = {
  id: string;
  name: string;
  parentId?: string;
  sort: number;
  createTime: string;
  qrCodeUrl?: string;
};

export type VideoQuestionItem = {
  id: string;
  time: string;
  title: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  analysis: string;
};

export type VideoSummaryItem = {
  id: string;
  startTime: string;
  endTime: string;
  content: string;
};

export type AnswerItem = {
  id: string;
  name: string;
  type: string;
  answerType: string;
  size: string;
  directoryId: string | null;
  updateTime: string;
  allowDownload?: boolean;
  videoSummary?: VideoSummaryItem[];
  questions?: VideoQuestionItem[];
  qrCodeUrl?: string;
  sort: number;
};
