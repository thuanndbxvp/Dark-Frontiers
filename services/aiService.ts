
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerationParams, VisualPrompt, AllVisualPromptsResult, ScriptPartSummary, StyleOptions, TopicSuggestionItem, AiProvider, ElevenlabsVoice, Expression, SummarizeConfig, SceneSummary, ScenarioType } from '../types';
import { EXPRESSION_OPTIONS, STYLE_OPTIONS } from '../constants';
import { apiKeyManager } from './apiKeyManager';

/**
 * Internal helper to check if an error is related to API key failure.
 */
const isKeyFailureError = (error: any): boolean => {
    const msg = error?.message?.toLowerCase() || '';
    return msg.includes('api key') || msg.includes('invalid') || msg.includes('401') || msg.includes('403') || msg.includes('requested entity was not found');
};

/**
 * Internal helper for consistent error handling.
 */
const handleApiError = (error: any, action: string) => {
    console.error(`Error during ${action}:`, error);
    if (error instanceof Error) return error;
    return new Error(`Lỗi khi ${action}: ${error?.message || 'Không xác định'}`);
};

/**
 * Unified API caller for both Gemini and OpenAI providers.
 */
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

/**
 * Validates whether an API key is functional.
 */
export const validateApiKey = async (key: string, provider: AiProvider): Promise<boolean> => {
    if (provider === 'gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: 'ping',
            });
            return true;
        } catch (e) {
            throw new Error("Gemini API Key không hợp lệ.");
        }
    } else if (provider === 'openai') {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            return res.ok;
        } catch (e) { return false; }
    } else if (provider === 'elevenlabs') {
        try {
            const res = await fetch('https://api.elevenlabs.io/v1/user', {
                headers: { 'xi-api-key': key }
            });
            return res.ok;
        } catch (e) { return false; }
    }
    return false;
};

// --- STRATEGY CONSTANTS ---
const DARK_FRONTIERS_DNA = `
Bạn là Content Officer cho kênh "Dark Frontiers", chuyên gia về Kinh dị Dã sử (Historical Fiction Horror).
TRIẾT LÝ NỘI DUNG: "Chúng ta bán Nỗi sợ về những điều chưa biết núp bóng dưới vỏ bọc Lịch sử."

1. ĐỊNH HƯỚNG NỘI DUNG:
- Niche: Sự kiện/Địa điểm có thật + Cryptids (Sinh vật huyền bí) = Ác mộng.
- Bối cảnh: 1800s - 1950s (Thời kỳ đèn dầu, súng trường, thám hiểm hoang sơ, KHÔNG có công nghệ cứu sinh hiện đại).
- Pillar: Thám hiểm mất tích, Kinh dị công nghiệp (hầm mỏ/hải đăng), Chiến tranh & Quái vật.

2. PHONG CÁCH & GIỌNG KỂ (AUDIO CINEMA):
- Quy tắc "Show, Don't Tell": Tuyệt đối không viết "Tôi sợ". Hãy viết "Tay tôi run đến mức không thể châm được diêm" hoặc "Tiếng tim đập lấn át cả tiếng gió rít ngoài hang".
- Tông giọng: Ominous (Điềm báo), Gritty (Gai góc), Melancholic (U sầu).

3. CẤU TRÚC NARRATIVE (5 GIAI ĐOẠN):
- THE HOOK: Tóm tắt kết cục bi thảm. POV: Ngôi thứ 3 (Lạnh lùng, khách quan).
- THE SLOW BURN: Dấu hiệu nhỏ rùng rợn. POV: Chuyển sang ngôi thứ 1 (Người sống sót).
- THE SIEGE: Vòng vây khép lại, tấn công tâm lý. POV: Ngôi thứ 1.
- THE CLIMAX: Đối đầu trực diện, trốn thoát gang tấc. POV: Ngôi thứ 1.
- THE SCAR: Kết thúc ám ảnh, vết sẹo tâm lý vĩnh viễn. POV: Ngôi thứ 1.

4. QUY TẮC KỊCH BẢN SẠCH (TTS-READY):
- KHÔNG bao giờ thêm các chỉ dẫn âm thanh [SFX], ánh sáng, [Nhạc nổi lên], hoặc các chú thích đạo diễn.
- KHÔNG thêm nhãn "Lời thoại:", "Dẫn chuyện:", "Cảnh 1:".
- CHỈ trả về văn bản kể chuyện thuần túy, sạch sẽ, sẵn sàng để dán vào công cụ TTS (ElevenLabs).
`;

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;

    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `
            ${DARK_FRONTIERS_DNA}
            HÃY VIẾT KỊCH BẢN SẠCH CHO VIDEO: "${title}"
            NGÔN NGỮ: ${targetAudience}
            ĐỘ ĐÀI: ${wordCount} từ.
            ${outlineContent ? `DÀN Ý GỢI Ý: ${outlineContent}` : ''}

            YÊU CẦU BẮT BUỘC:
            - Trình bày theo tiêu đề Markdown ## [Tên giai đoạn].
            - Phần nội dung là VĂN BẢN SẠCH 100%, sẵn sàng cho TTS.
        `;
    } else {
        prompt = `Viết kịch bản YouTube về "${title}". Ngôn ngữ: ${targetAudience}. Độ dài: ${wordCount} từ. 
        YÊU CẦU KỊCH BẢN SẠCH: Loại bỏ hoàn toàn các chỉ dẫn kỹ thuật, chỉ để lại lời kể chuyện/lời thoại dẫn dắt.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo kịch bản');
    }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, targetAudience, wordCount, isDarkFrontiers } = params;
    
    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `
            ${DARK_FRONTIERS_DNA}
            Hãy tạo Dàn ý CHI TIẾT cho kịch bản dài: "${title}".
            Sử dụng cấu trúc 5 giai đoạn: The Hook, The Slow Burn, The Siege, The Climax, The Scar.
            Ngôn ngữ tiêu đề: Tiếng Việt.
            Ngôn ngữ tóm tắt cốt truyện: ${targetAudience}.
            
            ĐỊNH DẠNG:
            ## [Tên giai đoạn]
            **Cốt truyện chi tiết:** [Mô tả diễn biến logic]
        `;
    } else {
        prompt = `Tạo dàn ý YouTube "${title}". Ngôn ngữ: Tiếng Việt. Chia phần ## [Tên phần].`;
    }

    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết (Chuẩn bị tạo kịch bản sạch cho TTS)\n\n` + outline;
    } catch (error) {
        throw handleApiError(error, 'tạo dàn ý');
    }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, wordCount, isDarkFrontiers, title } = params;
    const estPartWords = Math.round(parseInt(wordCount) / 5);

    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `
            ${DARK_FRONTIERS_DNA}
            VIẾT TIẾP MỘT PHẦN CỦA KỊCH BẢN: "${title}"
            
            DÀN Ý TỔNG THỂ: ${fullOutline}
            PHẦN ĐANG VIẾT: ${currentPartOutline}
            NỘI DUNG CÁC PHẦN TRƯỚC: ${previousPartsScript.slice(-2000)}

            YÊU CẦU ĐẶC BIỆT:
            - Viết khoảng ${estPartWords} từ.
            - NGÔN NGỮ: ${targetAudience}.
            - PHẢI LÀ KỊCH BẢN SẠCH: Tuyệt đối không rác kỹ thuật (SFX, Visuals).
            - Nếu là "Hook", dùng ngôi thứ 3 lạnh lùng. Sau đó dùng ngôi thứ 1 ám ảnh.
            - Tập trung vào cảm giác vật lý rùng rợn của bối cảnh lịch sử 1800s-1950s.
        `;
    } else {
        prompt = `Viết tiếp phần này cho kịch bản "${title}". Dàn ý: ${currentPartOutline}. Ngôn ngữ: ${targetAudience}. KỊCH BẢN SẠCH TTS.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo phần kịch bản');
    }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Dựa trên "${title}", gợi ý 5 ý tưởng video YouTube kinh dị dã sử (Historical Horror). 
    Trả về JSON array: { title, vietnameseTitle, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'gợi ý chủ đề');
    }
};

export const reviseScript = async (script: string, revisionPrompt: string, params: any, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chỉnh sửa kịch bản sau: "${revisionPrompt}". 
    Đảm bảo giữ phong cách KỊCH BẢN SẠCH (không SFX/Visuals) và DNA Dark Frontiers.
    Kịch bản:
    ${script}`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'sửa kịch bản');
    }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Tách lời thoại/dẫn chuyện sạch từ kịch bản này. Trả về JSON: { "Phần": "Văn bản kể chuyện" }.
    Kịch bản:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tách lời thoại');
    }
};

export const generateKeywordSuggestions = async (title: string, provider: AiProvider, model: string): Promise<string[]> => {
    const prompt = `Gợi ý 10 từ khóa SEO YouTube cho video kinh dị dã sử "${title}". Dấu phẩy ngăn cách.`;
    try {
        const response = await callApi(prompt, provider, model);
        return response.split(',').map(k => k.trim());
    } catch (e) {
        throw handleApiError(e, 'gợi ý từ khóa');
    }
};

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt> => {
    const prompt = `Tạo prompt hình ảnh cho cảnh: "${sceneDescription}". 
    Style: 19th-20th Century Historical Horror, Sepia/Desaturated, Ominous, High Contrast.
    Trả về JSON: { "english": "...", "vietnamese": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tạo prompt hình ảnh');
    }
};

export const generateAllVisualPrompts = async (script: string, provider: AiProvider, model: string): Promise<AllVisualPromptsResult[]> => {
    const prompt = `Tạo prompts hình ảnh cho các cảnh chính trong kịch bản này. JSON array: { scene, english, vietnamese }.`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tạo tất cả prompt');
    }
};

export const summarizeScriptForScenes = async (script: string, config: SummarizeConfig, provider: AiProvider, model: string): Promise<ScriptPartSummary[]> => {
    const prompt = `Tóm tắt kịch bản thành các cảnh quay chi tiết. Trả về JSON theo cấu trúc ScriptPartSummary.`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tóm tắt kịch bản');
    }
};

export const suggestStyleOptions = async (title: string, provider: AiProvider, model: string): Promise<StyleOptions> => {
    const prompt = `Gợi ý Expression và Style cho kịch bản "${title}". JSON: { "expression": "...", "style": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'gợi ý phong cách');
    }
};

export const parseIdeasFromFile = async (content: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Trích xuất ý tưởng video từ văn bản này. JSON array: { title, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'phân tích file');
    }
};

export const getElevenlabsVoices = async (): Promise<ElevenlabsVoice[]> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
        const data = await res.json();
        return data.voices || [];
    } finally {
        releaseKey();
    }
};

export const generateElevenlabsTts = async (text: string, voiceId: string): Promise<string> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
            body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
        });
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } finally {
        releaseKey();
    }
};

export const scoreScript = async (script: string, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chấm điểm (1-100) và nhận xét tính "Kinh dị dã sử" và độ hấp dẫn của kịch bản này.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'chấm điểm kịch bản');
    }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Tạo video prompt (Tiếng Anh) cho cảnh này: "${scene.summary}". Scenario: ${config.scenarioType}.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'tạo prompt video');
    }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
