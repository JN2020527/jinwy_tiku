export interface ParsedStem {
    cleanStem: string;
    answer?: string;
    difficulty?: string;
    knowledgePoints?: string[];
    detailed?: string;
    analysis?: string;
}

export function parseStem(html: string): ParsedStem {
    const result: ParsedStem = {
        cleanStem: html,
    };

    const patterns = {
        答案: /【答案】\s*([\s\S]*?)(?=(?:【(?:难度|知识点|详解|解析)】|$))/,
        难度: /【难度】\s*([\s\S]*?)(?=(?:【(?:答案|知识点|详解|解析)】|$))/,
        知识点: /【知识点】\s*([\s\S]*?)(?=(?:【(?:答案|难度|详解|解析)】|$))/,
        详解: /【详解】\s*([\s\S]*?)(?=(?:【(?:答案|难度|知识点|解析)】|$))/,
        解析: /【解析】\s*([\s\S]*?)(?=(?:【(?:答案|难度|知识点|详解)】|$))/,
    };

    const extractContent = (regex: RegExp) => {
        const match = html.match(regex);
        return match ? match[1].trim() : undefined;
    };

    result.answer = extractContent(patterns.答案);
    result.difficulty = extractContent(patterns.难度);
    const knowledgeText = extractContent(patterns.知识点);
    if (knowledgeText) {
        result.knowledgePoints = knowledgeText.split(/[,，;；、]/).map(k => k.trim()).filter(k => k);
    }
    result.detailed = extractContent(patterns.详解);
    result.analysis = extractContent(patterns.解析);

    result.cleanStem = html
        .replace(/【答案】[\s\S]*?(?=【(?:难度|知识点|详解|解析)】|$)/g, '')
        .replace(/【难度】[\s\S]*?(?=【(?:答案|知识点|详解|解析)】|$)/g, '')
        .replace(/【知识点】[\s\S]*?(?=【(?:答案|难度|详解|解析)】|$)/g, '')
        .replace(/【详解】[\s\S]*?(?=【(?:答案|难度|知识点|解析)】|$)/g, '')
        .replace(/【解析】[\s\S]*?(?=【(?:答案|难度|知识点|详解)】|$)/g, '')
        .trim();

    return result;
}
