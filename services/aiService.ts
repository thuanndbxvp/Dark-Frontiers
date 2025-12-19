
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerationParams, VisualPrompt, AllVisualPromptsResult, ScriptPartSummary, StyleOptions, TopicSuggestionItem, AiProvider, ElevenlabsVoice, Expression, SummarizeConfig, SceneSummary, ScenarioType } from '../types';
import { EXPRESSION_OPTIONS, STYLE_OPTIONS } from '../constants';
import { apiKeyManager } from './apiKeyManager';

/**
 * Helper to extract JSON from AI response that might contain conversational text.
 */
const cleanJsonResponse = (text: string): string => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) return jsonMatch[1].trim();
    
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');
    const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) ? firstBracket : firstBrace;
    
    const lastBracket = text.lastIndexOf(']');
    const lastBrace = text.lastIndexOf('}');
    const end = Math.max(lastBracket, lastBrace);
    
    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1).trim();
    }
    
    return text.trim();
};

const handleApiError = (error: any, action: string) => {
    console.error(`Error during ${action}:`, error);
    if (error instanceof Error) return error;
    return new Error(`Lỗi khi ${action}: ${error?.message || 'Không xác định'}`);
};

const callApi = async (prompt: string, provider: AiProvider, model: string): Promise<string> => {
    if (provider === 'gemini') {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('gemini');
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });
            return response.text || '';
        } finally {
            releaseKey();
        }
    } else if (provider === 'openai') {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('openai');
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'OpenAI API Error');
            return data.choices[0].message.content;
        } finally {
            releaseKey();
        }
    }
    throw new Error(`Provider ${provider} không được hỗ trợ.`);
};

export const validateApiKey = async (key: string, provider: AiProvider): Promise<boolean> => {
    if (provider === 'gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping' });
            return true;
        } catch (e) { throw new Error("Gemini API Key không hợp lệ."); }
    } else if (provider === 'openai') {
        try {
            const res = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
            return res.ok;
        } catch (e) { return false; }
    } else if (provider === 'elevenlabs') {
        try {
            const res = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } });
            return res.ok;
        } catch (e) { return false; }
    }
    return false;
};

const DARK_FRONTIERS_DNA = `
Bạn là Content Officer cho kênh "Dark Frontiers", chuyên gia về Kinh dị Dã sử.
TRIẾT LÝ: Bán nỗi sợ núp bóng lịch sử.
PHONG CÁCH: Ominous, Gritty, Melancholic.
QUY TẮC CẤU TRÚC (BẮT BUỘC):
- Phải chia kịch bản thành các phần rõ ràng.
- MỖI PHẦN PHẢI BẮT ĐẦU BẰNG TIÊU ĐỀ: ## [TÊN PHẦN] (Ví dụ: ## THE HOOK).
- Tuyệt đối không viết rác kỹ thuật [SFX], [Visual].
`;

const SOCIAL_REALISM_TEMPLATE = `19th century social realism painting style, dark historical realism.
Muted sepia, brown and dirty earth tones, very low saturation.
Rough painterly oil painting texture, visible brush strokes, aged canvas surface.
Imperfect anatomy, weathered skin, signs of hardship and poverty.
Flat, natural light, no cinematic lighting, no dramatic rim light.
Somber, heavy atmosphere, quiet suffering, human fragility.
Old illustration and engraving influence, documentary feeling, raw and unpolished.
No beauty idealization, no fine art photography look. No modern aesthetics.
Aspect ratio 16:9.
[INSERT IMAGE CONTENT HERE]`;

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;
    let prompt = isDarkFrontiers ? `${DARK_FRONTIERS_DNA} HÃY VIẾT KỊCH BẢN SẠCH CHO: "${title}". NGÔN NGỮ: ${targetAudience}. ĐỘ DÀI: ${wordCount} từ. BẮT BUỘC chia phần ##.` 
                               : `Viết kịch bản YouTube về "${title}". Ngôn ngữ: ${targetAudience}. Chia phần ##. KỊCH BẢN SẠCH.`;
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo kịch bản'); }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, targetAudience, isDarkFrontiers } = params;
    let prompt = isDarkFrontiers ? `${DARK_FRONTIERS_DNA} Tạo dàn ý 5 phần ## cho "${title}". Ngôn ngữ: ${targetAudience}.` 
                               : `Tạo dàn ý YouTube cho "${title}". Chia phần ##.`;
    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết (Chuẩn bị tạo kịch bản sạch cho TTS)\n\n` + outline;
    } catch (error) { throw handleApiError(error, 'tạo dàn ý'); }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, wordCount, isDarkFrontiers, title } = params;
    const estPartWords = Math.round(parseInt(wordCount) / 5);
    let prompt = isDarkFrontiers ? `${DARK_FRONTIERS_DNA} VIẾT TIẾP PHẦN KỊCH BẢN: "${title}". BẮT BUỘC BẮT ĐẦU BẰNG TIÊU ĐỀ ##. Phần: ${currentPartOutline}. Ngôn ngữ: ${targetAudience}.`
                               : `Viết tiếp phần này cho kịch bản "${title}". BẮT BUỘC bắt đầu bằng ##.`;
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo phần kịch bản'); }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Gợi ý 5 ý tưởng video YouTube kinh dị dã sử. JSON: { title, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'gợi ý chủ đề'); }
};

export const reviseScript = async (script: string, revisionPrompt: string, params: any, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chỉnh sửa kịch bản: "${revisionPrompt}". Giữ cấu trúc ##.\nKịch bản:\n${script}`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'sửa kịch bản'); }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Trích xuất lời dẫn SẠCH từ kịch bản sau. JSON: { "Phần": "Nội dung" }.\nKỊCH BẢN:\n${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tách lời thoại'); }
};

export const generateKeywordSuggestions = async (title: string, provider: AiProvider, model: string): Promise<string[]> => {
    const prompt = `Gợi ý 10 từ khóa SEO cho video "${title}".`;
    try {
        const response = await callApi(prompt, provider, model);
        return response.split(',').map(k => k.trim());
    } catch (e) { throw handleApiError(e, 'gợi ý từ khóa'); }
};

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt[]> => {
    const prompt = `Tạo 4 prompt hình ảnh Social Realism từ trích đoạn này. JSON: [ { "english": "...", "vietnamese": "..." } ].\nKỊCH BẢN: "${sceneDescription}"`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tạo prompt hình ảnh'); }
};

export const generateAllVisualPrompts = async (script: string, provider: AiProvider, model: string): Promise<AllVisualPromptsResult[]> => {
    const prompt = `Tạo prompts hình ảnh cho các cảnh chính. JSON array: { scene, english, vietnamese }. Phong cách Social Realism.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tạo tất cả prompt'); }
};

export const summarizeScriptForScenes = async (script: string, config: SummarizeConfig, provider: AiProvider, model: string): Promise<ScriptPartSummary[]> => {
    const prompt = `Phân tích kịch bản thành cảnh quay. JSON ScriptPartSummary. Phong cách ảnh: ${SOCIAL_REALISM_TEMPLATE}.\nKỊCH BẢN:\n${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tóm tắt kịch bản'); }
};

export const suggestStyleOptions = async (title: string, provider: AiProvider, model: string): Promise<StyleOptions> => {
    const prompt = `Gợi ý Expression và Style cho "${title}". JSON: { "expression": "...", "style": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'gợi ý phong cách'); }
};

export const parseIdeasFromFile = async (content: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Trích xuất ý tưởng video. JSON: { title, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'phân tích file'); }
};

export const getElevenlabsVoices = async (): Promise<ElevenlabsVoice[]> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
        if (!res.ok) throw new Error("Không thể tải danh sách giọng nói.");
        const data = await res.json();
        return data.voices || [];
    } finally { releaseKey(); }
};

export const generateElevenlabsTts = async (text: string, voiceId: string): Promise<string> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'xi-api-key': apiKey,
                'accept': 'audio/mpeg'
            },
            body: JSON.stringify({ 
                text, 
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || `Lỗi TTS: ${res.status}`);
        }

        const blob = await res.blob();
        if (blob.size < 100) throw new Error("Dữ liệu âm thanh nhận được không hợp lệ.");
        return URL.createObjectURL(blob);
    } finally { releaseKey(); }
};

export const scoreScript = async (script: string, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chấm điểm DNA Dark Frontiers cho kịch bản này.`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'chấm điểm kịch bản'); }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Tạo video prompt cho: "${scene.summary}".`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'tạo prompt video'); }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
