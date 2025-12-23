import { request } from '@umijs/max';

export async function getKnowledgeTree() {
    return request('/api/tags/knowledge-tree', {
        method: 'GET',
    });
}

// Replaced getTagAttributes with getTagCategories
export async function getTagCategories() {
    return request('/api/tags/categories', {
        method: 'GET',
    });
}

export async function addTagCategory(data: any) {
    return request('/api/tags/category', {
        method: 'POST',
        data,
    });
}

export async function deleteTagCategory(id: string) {
    return request('/api/tags/category', {
        method: 'DELETE',
        params: { id },
    });
}

export async function addKnowledgeNode(data: any) {
    return request('/api/tags/knowledge-node', {
        method: 'POST',
        data,
    });
}

export async function updateKnowledgeNode(data: any) {
    return request('/api/tags/knowledge-node', {
        method: 'PUT',
        data,
    });
}

export async function deleteKnowledgeNode(id: string) {
    return request('/api/tags/knowledge-node', {
        method: 'DELETE',
        params: { id },
    });
}

// Question Type CRUD
export async function getQuestionTypeTree() {
    return request('/api/tags/question-type-tree', {
        method: 'GET',
    });
}

export async function addQuestionTypeNode(data: any) {
    return request('/api/tags/question-type-node', {
        method: 'POST',
        data,
    });
}

export async function updateQuestionTypeNode(data: any) {
    return request('/api/tags/question-type-node', {
        method: 'PUT',
        data,
    });
}

export async function deleteQuestionTypeNode(id: string) {
    return request('/api/tags/question-type-node', {
        method: 'DELETE',
        params: { id },
    });
}

// Attribute CRUD
export async function addAttribute(data: any) {
    return request('/api/tags/attribute', {
        method: 'POST',
        data,
    });
}

export async function updateAttribute(data: any) {
    return request('/api/tags/attribute', {
        method: 'PUT',
        data,
    });
}

export async function deleteAttribute(id: string, categoryId: string) {
    return request('/api/tags/attribute', {
        method: 'DELETE',
        params: { id, categoryId },
    });
}

// Textbook API
export async function getTextbookVersions() {
    return request('/api/tags/textbook-versions', {
        method: 'GET',
    });
}

export async function getTextbookChapters(version: string) {
    return request('/api/tags/textbook-chapters', {
        method: 'GET',
        params: { version },
    });
}

// Textbook Chapter CRUD
export async function addTextbookChapter(data: any) {
    return request('/api/tags/textbook-chapter', {
        method: 'POST',
        data,
    });
}

export async function updateTextbookChapter(data: any) {
    return request('/api/tags/textbook-chapter', {
        method: 'PUT',
        data,
    });
}

export async function deleteTextbookChapter(id: string) {
    return request('/api/tags/textbook-chapter', {
        method: 'DELETE',
        params: { id },
    });
}
