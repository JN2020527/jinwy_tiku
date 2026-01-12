import { request } from '@umijs/max';

export interface Question {
    id?: number;
    type: string;
    content: string; // HTML or structured content
    options?: string[]; // For choice questions
    answer: string;
    analysis?: string;
    difficulty: string;
    subject: string;
    grade: string;
    tags?: string[]; // Tag IDs or Names
    score?: number;
    paperId?: number; // Optional link to a paper
    status?: 'tagged' | 'untagged';
}

export interface PaperSection {
    name: string;
    questions: Question[];
}

export interface Paper {
    id?: number;
    title: string;
    subject: string;
    year: string;
    region: string;
    totalScore: number;
    sections: PaperSection[];
}

// Question API
export async function getQuestions(
    params: {
        current?: number;
        pageSize?: number;
        subject?: string;
        grade?: string;
        type?: string;
        difficulty?: string;
        tags?: string; // Comma separated
        status?: string;
    },
    options?: { [key: string]: any },
) {
    return request<{
        data: Question[];
        total?: number;
        success?: boolean;
    }>('/api/question-bank/questions', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

export async function getQuestion(id: number, options?: { [key: string]: any }) {
    return request<{ data: Question; success: boolean }>(`/api/question-bank/questions/${id}`, {
        method: 'GET',
        ...(options || {}),
    });
}

export async function addQuestion(data: Question, options?: { [key: string]: any }) {
    return request<Record<string, any>>('/api/question-bank/questions', {
        method: 'POST',
        data,
        ...(options || {}),
    });
}

export async function updateQuestion(data: Question, options?: { [key: string]: any }) {
    return request<Record<string, any>>('/api/question-bank/questions', {
        method: 'PUT',
        data,
        ...(options || {}),
    });
}

export async function deleteQuestion(id: number, options?: { [key: string]: any }) {
    return request<Record<string, any>>(`/api/question-bank/questions/${id}`, {
        method: 'DELETE',
        ...(options || {}),
    });
}

export async function batchTagQuestions(data: { ids: number[]; tags: string[] }, options?: { [key: string]: any }) {
    return request<Record<string, any>>('/api/question-bank/questions/batch-tag', {
        method: 'POST',
        data,
        ...(options || {}),
    });
}

// Paper API
export async function getPapers(
    params: {
        current?: number;
        pageSize?: number;
        subject?: string;
        year?: string;
        region?: string;
    },
    options?: { [key: string]: any },
) {
    return request<{
        data: Paper[];
        total?: number;
        success?: boolean;
    }>('/api/question-bank/papers', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

export async function getPaper(id: number, options?: { [key: string]: any }) {
    return request<{ data: Paper; success: boolean }>(`/api/question-bank/papers/${id}`, {
        method: 'GET',
        ...(options || {}),
    });
}

export async function addPaper(data: Paper, options?: { [key: string]: any }) {
    return request<Record<string, any>>('/api/question-bank/papers', {
        method: 'POST',
        data,
        ...(options || {}),
    });
}

// Mock OCR API
export async function parsePaper(file: File, options?: { [key: string]: any }) {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ data: Paper; success: boolean }>('/api/question-bank/ocr/parse', {
        method: 'POST',
        data: formData,
        requestType: 'form',
        ...(options || {}),
    });
}
