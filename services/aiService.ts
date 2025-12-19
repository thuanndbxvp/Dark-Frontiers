
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

// --- DARK FRONTIERS DNA: REFINED FOR CINEMATIC AUDIO EXPERIENCE ---
const DARK_FRONTIERS_DNA = `
BẠN LÀ CONTENT OFFICER CHO KÊNH "DARK FRONTIERS". 
TRIẾT LÝ: "Chúng ta bán Nỗi sợ về những điều chưa biết (Fear of the Unknown) núp bóng dưới vỏ bọc Lịch sử."

1. CỐT LÕI NỘI DUNG:
   - Historical Fiction Horror: Sự kiện có thật + Địa điểm có thật + Sinh vật huyền bí (Cryptids).
   - BỐI CẢNH: 1800s - 1950s. Tuyệt đối không có công nghệ hiện đại (GPS, ĐT vệ tinh). Chỉ có súng trường, đèn dầu, la bàn cơ học.
   - CHỦ ĐỀ: Lost Expeditions, Industrial Horror, War & Monsters.

2. CẤU TRÚC 5 GIAI ĐOẠN (THE NARRATIVE ARC):
   - ## THE HOOK: "Fake Peak" (Ngôi thứ 3 - Narrator). 
     + Tóm tắt ngay kết cục bi thảm. 
     + Phải có chi tiết vật lý kỳ quái (Vd: Súng bị bẻ cong, xác chết không máu...).
     + Kết thúc bằng: "So before we continue into the dark, make sure to subscribe to Dark Frontiers."
   
   - ## THE SLOW BURN: "The Descent" (BẮT BUỘC NGÔI THỨ 1 - Survivor).
     + Nhân vật có tên cụ thể (KHÔNG DÙNG "ELIAS"). Vai trò rõ ràng (Lính, thợ mỏ...).
     + Sự im lặng bất thường, mùi lạ, dấu chân bí ẩn.
   
   - ## THE SIEGE: "The Trap" (Ngôi thứ 1). 
     + Căng thẳng leo dốc. Quái vật vờn mồi, tấn công tâm lý từ bóng tối.
   
   - ## THE CLIMAX: "The Face of Fear" (Ngôi thứ 1).
     + Đối mặt trực diện. Quái vật thông minh, có thể bắt chước tiếng người thân. 
   
   - ## THE SCAR: "The Aftermath" (Ngôi thứ 1).
     + Kết luận ám ảnh, triết lý u ám. Nhân vật sống sót nhưng bị thay đổi vĩnh viễn.

3. QUY TẮC VIẾT (AUDIO CINEMA DNA):
   - SHOW, DON'T TELL: Đừng nói "tôi sợ", hãy tả "tay tôi run đến mức không thể châm nổi điếu thuốc".
   - GIÁC QUAN (SENSORY): Tập trung sâu vào Âm thanh (tiếng gió rít, tiếng cào cửa) và Mùi vị (mùi lưu huỳnh, mùi máu tanh, mùi rêu ẩm).
   - TÔNG GIỌNG: Regretful Survivor (Mệt mỏi, ám ảnh, hối tiếc).
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
        ? `${DARK_FRONTIERS_DNA}\nVIẾT KỊCH BẢN CHI TIẾT THEO CẤU TRÚC 5 GIAI ĐOẠN CHO: "${title}". NGÔN NGỮ: ${targetAudience}. ĐỘ DÀI: ${wordCount} từ.\nTUÂN THỦ POV VÀ CHI TIẾT GIÁC QUAN.`
        : `Viết kịch bản YouTube về "${title}". Ngôn ngữ: ${targetAudience}. Chia phần ##. KỊCH BẢN SẠCH.`;
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo kịch bản'); }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, targetAudience, isDarkFrontiers } = params;
    let prompt = isDarkFrontiers 
        ? `${DARK_FRONTIERS_DNA}\nTạo dàn ý 5 phần đúng cấu trúc: ## THE HOOK (Ngôi 3), ## THE SLOW BURN (Ngôi 1), ## THE SIEGE (Ngôi 1), ## THE CLIMAX (Ngôi 1), ## THE SCAR (Ngôi 1) cho chủ đề: "${title}". Ngôn ngữ: ${targetAudience}.` 
        : `Tạo dàn ý YouTube cho "${title}". Chia phần ##.`;
    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết (Chuẩn bị tạo kịch bản sạch cho TTS)\n\n` + outline;
    } catch (error) { throw handleApiError(error, 'tạo dàn ý'); }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, isDarkFrontiers, title } = params;
    
    let arcInstruction = "";
    if (isDarkFrontiers) {
        const upperPart = currentPartOutline.toUpperCase();
        if (upperPart.includes("HOOK")) {
            arcInstruction = "Giai đoạn HOOK: POV Ngôi thứ 3. Mô tả hiện trường tàn khốc với chi tiết vật lý kỳ quái. Kết thúc bằng CTA Subscribe.";
        } else if (upperPart.includes("BURN")) {
            arcInstruction = "Giai đoạn SLOW BURN: POV Ngôi thứ 1. Tên nhân vật mới (không Elias). Nhân vật mệt mỏi, hối tiếc. Mô tả âm thanh và mùi vị điềm báo.";
        } else if (upperPart.includes("SIEGE")) {
            arcInstruction = "Giai đoạn SIEGE: POV Ngôi thứ 1. Căng thẳng leo dốc. Quái vật vờn mồi từ bóng tối. Tay chân run rẩy, hơi thở dồn dập.";
        } else if (upperPart.includes("CLIMAX")) {
            arcInstruction = "Giai đoạn CLIMAX: POV Ngôi thứ 1. Đối mặt trực diện. Quái vật bắt chước tiếng người thân. Trốn thoát trong gang tấc.";
        } else if (upperPart.includes("SCAR")) {
            arcInstruction = "Giai đoạn SCAR: POV Ngôi thứ 1. Hậu quả tâm lý, ám ảnh, triết lý u ám.";
        }
    }

    let prompt = isDarkFrontiers 
        ? `${DARK_FRONTIERS_DNA}\nVIẾT TIẾP PHẦN KỊCH BẢN: "${currentPartOutline}".\nCHỦ ĐỀ: ${title}.\nCHỈ DẪN ARC: ${arcInstruction}\nNGÔN NGỮ: ${targetAudience}.\nBẮT BUỘC BẮT ĐẦU BẰNG TIÊU ĐỀ ##.`
        : `Viết tiếp phần này cho kịch bản "${title}". BẮT BUỘC bắt đầu bằng ##.`;
    
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo phần kịch bản'); }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Gợi ý 5 ý tưởng video YouTube kinh dị dã sử (Fear of the Unknown, 1800s-1950s). JSON: { title, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'gợi ý chủ đề'); }
};

export const reviseScript = async (script: string, revisionPrompt: string, params: any, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chỉnh sửa kịch bản: "${revisionPrompt}". \nLƯU Ý: Giữ vững cấu trúc POV và triết lý sensory (âm thanh, mùi vị) của Dark Frontiers.\nKịch bản:\n${script}`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'sửa kịch bản'); }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `NHIỆM VỤ: Trích xuất lời thoại SẠCH (Spoken text) từ kịch bản sau.
    QUY TẮC:
    1. LOẠI BỎ hoàn toàn các chỉ dẫn kỹ thuật như [SFX], [Scene], [Visual], [Audio].
    2. LOẠI BỎ hoàn toàn các mô tả cảnh quay hoặc hành động nhân vật.
    3. CHỈ GIỮ LẠI những lời thoại mà người dẫn chương trình (Narrator) hoặc nhân vật (Survivor) thực sự nói.
    4. Giữ nguyên cấu trúc các phần chính theo tiêu đề ##.
    5. ĐỊNH DẠNG ĐẦU RA: JSON với cấu trúc { "Tên Phần": "Toàn bộ lời thoại của phần đó" }.
    
    KỊCH BẢN CẦN TRÍCH XUẤT:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tách lời thoại'); }
};

export const generateKeywordSuggestions = async (title: string, provider: AiProvider, model: string): Promise<string[]> => {
    const prompt = `Gợi ý 10 từ khóa SEO (anh/việt) cho video kinh dị dã sử: "${title}".`;
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
    const prompt = `Tạo prompts hình ảnh cho các cảnh chính. JSON array: { scene, english, vietnamese }. Phong cách Social Realism (19th century).`;
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
    const prompt = `Gợi ý Expression và Style phù hợp với Dark Frontiers cho "${title}". JSON: { "expression": "...", "style": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'gợi ý phong cách'); }
};

export const parseIdeasFromFile = async (content: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Trích xuất ý tưởng video kinh dị dã sử từ nội dung file. JSON: { title, outline }.`;
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
    
    for (let attempt = 0; attempt < Math.max(1, totalKeys); attempt++) {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
        try {
            const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
            
            if (res.status === 401 || res.status === 429) {
                apiKeyManager.reportError('elevenlabs', apiKey);
                releaseKey();
                continue;
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
    const prompt = `Bạn là chuyên gia thẩm định nội dung của Dark Frontiers. Hãy chấm điểm kịch bản này dựa trên:
    1. Cấu trúc 5 giai đoạn (Hook -> Burn -> Siege -> Climax -> Scar)?
    2. POV (Hook ngôi 3, thân bài ngôi 1)?
    3. Sensory Details (Âm thanh, mùi vị)?
    4. Show, Don't Tell?
    5. Không gian lịch sử (1800s-1950s) và sự vắng bóng công nghệ hiện đại?`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'chấm điểm kịch bản'); }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Tạo video prompt (Tiếng Anh) cho cảnh quay kinh dị dã sử: "${scene.summary}". Tập trung vào ánh sáng đèn dầu, sương mù, góc quay cận cảnh biểu cảm ám ảnh.`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'tạo prompt video'); }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
