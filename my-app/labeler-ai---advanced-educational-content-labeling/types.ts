
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  code: string;
  title: string;
  subject: string;
  status: 'Completed' | 'AI Suggested' | 'Active' | 'Pending';
  content: string;
  equation: string;
  analysis: {
    formula: string;
    steps: string[];
    result: string;
  };
  tags: string[];
  difficulty: Difficulty;
  year: number;
  region: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'folder' | 'item';
  icon?: string;
  aiMatch?: boolean;
  children?: KnowledgeNode[];
}

export type ViewMode = 'single' | 'batch';
