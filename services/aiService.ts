
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

// --- DARK FRONTIERS DNA UPGRADED (STYLE CALIBRATION) ---
const DARK_FRONTIERS_DNA = `
BẠN LÀ CONTENT OFFICER CHO KÊNH "DARK FRONTIERS" (KINH DỊ DÃ SỬ). 
BẮT BUỘC TUÂN THỦ CÁC QUY TẮC PHONG CÁCH SAU (DNA):

1. CẤU TRÚC 4 PHẦN (MỖI PHẦN BẮT ĐẦU BẰNG ##):
   - ## THE HOOK: Dùng ngôi thứ 3 (Narrator). Tóm tắt hiện trường vụ án/kết cục bi thảm. Phải có bằng chứng vật lý kỳ quái (súng bị bẻ cong, xác không máu...). Kết thúc bằng CTA Subscribe.
   - ## THE BODY (MAIN STORY): BẮT BUỘC CHUYỂN SANG NGÔI THỨ 1 ("TÔI"). Đặt tên nhân vật cụ thể (KHÔNG ĐƯỢC DÙNG TÊN "ELIAS"). Nhân vật phải có vai trò lịch sử (lính, thợ mỏ, thợ săn...).
   - ## THE MONSTER: Slow burn. Quái vật thông minh, tâm lý, biết đùa giỡn/bắt chước giọng nói trước khi lộ diện.
   - ## THE OUTRO: Nhân vật sống sót nhưng bị chấn thương tâm lý vĩnh viễn. Kết luận triết lý về nỗi sợ và sự nhỏ bé của con người.

2. TRIẾT LÝ VIẾT: 
   - SHOW, DON'T TELL: Đừng nói "Tôi sợ", hãy mô tả "Tay tôi run đến mức không châm nổi điếu thuốc".
   - TẬP TRUNG GIÁC QUAN (SENSORY): Mô tả kỹ âm thanh (tiếng trườn, tiếng nghiền nát), mùi vị (mùi lưu huỳnh, mùi máu tanh).
   - KHÔNG KỂ LỂ LỊCH SỬ NHƯ PHIM TÀI LIỆU. Hãy ném khán giả vào nỗi sợ thực tế.
   - PHONG CÁCH: Ominous, Gritty, Melancholic, Psychological Horror.
   - TUYỆT ĐỐI KHÔNG VIẾT RÁC KỸ THUẬT [SFX], [Visual] TRONG KỊCH BẢN TTS.
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
    const { title, targetAudience, wordCount, isDarkFrontiers } = params;
    let prompt = isDarkFrontiers 
        ? `${DARK_FRONTIERS_DNA}\nVIẾT KỊCH BẢN CHI TIẾT CHO: "${title}". NGÔN NGỮ: ${targetAudience}. ĐỘ DÀI: ${wordCount} từ.\nLƯU Ý: Phần Body phải dùng ngôi thứ nhất "Tôi".`
        : `Viết kịch bản YouTube về "${title}". Ngôn ngữ: ${targetAudience}. Chia phần ##. KỊCH BẢN SẠCH.`;
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo kịch bản'); }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, targetAudience, isDarkFrontiers } = params;
    let prompt = isDarkFrontiers 
        ? `${DARK_FRONTIERS_DNA}\nTạo dàn ý 4 phần BẮT BUỘC: ## THE HOOK, ## THE BODY, ## THE MONSTER, ## THE OUTRO cho chủ đề: "${title}". Ngôn ngữ: ${targetAudience}.` 
        : `Tạo dàn ý YouTube cho "${title}". Chia phần ##.`;
    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết (Chuẩn bị tạo kịch bản sạch cho TTS)\n\n` + outline;
    } catch (error) { throw handleApiError(error, 'tạo dàn ý'); }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, isDarkFrontiers, title } = params;
    
    let povInstruction = "";
    if (isDarkFrontiers) {
        if (currentPartOutline.toUpperCase().includes("HOOK")) povInstruction = "Sử dụng NGÔI THỨ 3 (Narrator).";
        else povInstruction = "Sử dụng NGÔI THỨ 1 (Nhân vật kể chuyện 'Tôi'). Tập trung vào chi tiết giác quan (âm thanh, mùi).";
    }

    let prompt = isDarkFrontiers 
        ? `${DARK_FRONTIERS_DNA}\nVIẾT TIẾP PHẦN KỊCH BẢN: "${currentPartOutline}".\nCHỦ ĐỀ: ${title}.\nQUY TẮC POV: ${povInstruction}\nNGÔN NGỮ: ${targetAudience}.\nBẮT BUỘC BẮT ĐẦU BẰNG TIÊU ĐỀ ##.`
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
    const prompt = `Chỉnh sửa kịch bản theo yêu cầu: "${revisionPrompt}". \nLƯU Ý: Nếu là kịch bản Dark Frontiers, giữ vững cấu trúc ## và quy tắc ngôi thứ 1 cho phần Body.\nKịch bản:\n${script}`;
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

/**
 * Lấy danh sách giọng nói ElevenLabs với cơ chế tự động xoay key khi lỗi
 */
export const getElevenlabsVoices = async (): Promise<ElevenlabsVoice[]> => {
    const savedKeysJson = localStorage.getItem('ai-api-keys');
    const totalKeys = savedKeysJson ? (JSON.parse(savedKeysJson).elevenlabs?.length || 0) : 0;
    
    // Thử tối đa bằng số lượng key hiện có
    for (let attempt = 0; attempt < Math.max(1, totalKeys); attempt++) {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
        try {
            const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
            
            if (res.status === 401 || res.status === 429) {
                // Key hết hạn hoặc hết quota, báo cáo lỗi để xoay key
                apiKeyManager.reportError('elevenlabs', apiKey);
                releaseKey();
                continue; // Thử với key tiếp theo
            }

            if (!res.ok) throw new Error("Không thể tải danh sách giọng nói.");
            const data = await res.json();
            releaseKey();
            return data.voices || [];
        } catch (error) {
            releaseKey();
            if (attempt === totalKeys - 1) throw error;
        }
    }
    throw new Error("Tất cả API Key ElevenLabs đều bị lỗi hoặc hết hạn.");
};

/**
 * Lấy thông tin một giọng nói cụ thể theo ID
 */
export const getElevenlabsVoiceById = async (voiceId: string): Promise<ElevenlabsVoice> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
            headers: { 'xi-api-key': apiKey }
        });
        if (!res.ok) throw new Error(`Không tìm thấy giọng nói với ID: ${voiceId}`);
        const data = await res.json();
        return data;
    } finally {
        releaseKey();
    }
};

/**
 * Tạo TTS ElevenLabs với cơ chế tự động xoay key khi lỗi
 */
export const generateElevenlabsTts = async (text: string, voiceId: string): Promise<string> => {
    const savedKeysJson = localStorage.getItem('ai-api-keys');
    const totalKeys = savedKeysJson ? (JSON.parse(savedKeysJson).elevenlabs?.length || 0) : 0;

    for (let attempt = 0; attempt < Math.max(1, totalKeys); attempt++) {
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

            if (res.status === 401 || res.status === 429) {
                apiKeyManager.reportError('elevenlabs', apiKey);
                releaseKey();
                continue;
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail?.message || `Lỗi TTS: ${res.status}`);
            }

            const blob = await res.blob();
            releaseKey();
            if (blob.size < 100) throw new Error("Dữ liệu âm thanh nhận được không hợp lệ.");
            return URL.createObjectURL(blob);
        } catch (error) {
            releaseKey();
            if (attempt === totalKeys - 1) throw error;
        }
    }
    throw new Error("Tất cả API Key ElevenLabs đều bị lỗi hoặc hết quota.");
};

export const scoreScript = async (script: string, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Bạn là Content Officer của Dark Frontiers. Hãy chấm điểm kịch bản này dựa trên DNA mới:
    1. Cấu trúc 4 phần (## THE HOOK, ## THE BODY, ## THE MONSTER, ## THE OUTRO)?
    2. Ngôi kể: Hook (3rd POV), Body (1st POV "Tôi")?
    3. Sensory Details (Âm thanh, mùi vị)?
    4. Không kể rác SFX/Visual?
    5. Show, Don't Tell?
    Hãy đưa ra nhận xét khắt khe.`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'chấm điểm kịch bản'); }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Tạo video prompt cho: "${scene.summary}".`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'tạo prompt video'); }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
