
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
- Bối cảnh: 1800s - 1950s (Thời kỳ đèn dầu, súng trường, thám hiểm hoang sơ, KHÔNG có công nghệ hiện đại như GPS, điện thoại vệ tinh).
- Pillar: Thám hiểm mất tích, Kinh dị công nghiệp (hầm mỏ/hải đăng), Chiến tranh & Quái vật.

2. PHONG CÁCH & GIỌNG KỂ (AUDIO CINEMA):
- Quy tắc "Show, Don't Tell": Tuyệt đối không viết "Tôi rất sợ". Hãy viết "Lớp sương giá đóng thành vảy trên râu tôi, và tôi nhận ra mình không còn cảm nhận được hơi ấm từ họng súng vừa khai hỏa".
- Tông giọng: Ominous (Điềm báo), Gritty (Gai góc), Melancholic (U sầu).

3. CẤU TRÚC NARRATIVE & NGÔI KỂ:
- Giai đoạn 1 (THE HOOK): Tóm tắt kết cục bi thảm. POV: Ngôi thứ 3 (Lạnh lùng, đưa ra cảnh báo).
- Giai đoạn 2-5 (SLOW BURN -> SIEGE -> CLIMAX -> SCAR): Chuyển hẳn sang Ngôi thứ 1 (POV Nhân vật "Tôi" - Người sống sót duy nhất). Giọng điệu mệt mỏi, ám ảnh, hối tiếc.

4. QUY TẮC KỊCH BẢN SẠCH (BẮT BUỘC):
- GIỮ LẠI các tiêu đề phần (VD: ## THE HOOK, ## THE SLOW BURN...).
- LOẠI BỎ hoàn toàn mọi chỉ dẫn kỹ thuật: [SFX], [Audio], [Visual], [Music], "Cảnh:", "Lời thoại:", "Dẫn chuyện:".
- CHỈ trả về văn bản nội dung kể chuyện trơn tru, sẵn sàng cho Text-to-speech.
`;

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;

    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `
            ${DARK_FRONTIERS_DNA}
            HÃY VIẾT KỊCH BẢN SẠCH CHO VIDEO: "${title}"
            NGÔN NGỮ: ${targetAudience}
            ĐỘ ĐÀI MỤC TIÊU: ${wordCount} từ.
            ${outlineContent ? `DÀN Ý GỢI Ý: ${outlineContent}` : ''}

            YÊU CẦU: 
            - Phân chia theo 5 giai đoạn cấu trúc Dark Frontiers bằng tiêu đề ##.
            - Nội dung kịch bản sạch 100%, không rác văn bản kỹ thuật.
        `;
    } else {
        prompt = `Viết kịch bản YouTube về "${title}". Ngôn ngữ: ${targetAudience}. Độ dài: ${wordCount} từ. 
        KỊCH BẢN SẠCH: Loại bỏ chỉ dẫn kỹ thuật, giữ tiêu đề phần.`;
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
            Tạo dàn ý chi tiết 5 phần (Hook, Slow Burn, Siege, Climax, Scar) cho "${title}".
            Ngôn ngữ tiêu đề: Tiếng Việt.
            Ngôn ngữ tóm tắt: ${targetAudience}.
            Độ dài dự kiến toàn bài: ${wordCount} từ.
        `;
    } else {
        prompt = `Tạo dàn ý YouTube "${title}". Ngôn ngữ: Tiếng Việt. Chia phần ##.`;
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
            VIẾT TIẾP PHẦN KỊCH BẢN: "${title}"
            
            DÀN Ý TỔNG: ${fullOutline}
            PHẦN ĐANG VIẾT: ${currentPartOutline}
            NỘI DUNG ĐÃ VIẾT TRƯỚC ĐÓ: ${previousPartsScript.slice(-2000)}

            YÊU CẦU:
            - Độ dài: Khoảng ${estPartWords} từ.
            - KỊCH BẢN SẠCH: Tuyệt đối không thêm rác [SFX] hay chỉ dẫn hình ảnh.
            - Tuân thủ ngôi kể (Ngôi 3 cho Hook, Ngôi 1 cho phần còn lại).
            - Ngôn ngữ: ${targetAudience}.
        `;
    } else {
        prompt = `Viết tiếp phần này cho kịch bản "${title}". Dàn ý: ${currentPartOutline}. Ngôn ngữ: ${targetAudience}. KỊCH BẢN SẠCH.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo phần kịch bản');
    }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Dựa trên "${title}", gợi ý 5 ý tưởng video YouTube kinh dị dã sử (Historical Horror). Trả về JSON: { title, vietnameseTitle, outline }.`;
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
    Đảm bảo KỊCH BẢN SẠCH (không SFX/Visuals) và DNA Dark Frontiers.
    Kịch bản:
    ${script}`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'sửa kịch bản');
    }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Bạn là chuyên gia bóc tách kịch bản. Hãy tách toàn bộ lời dẫn chuyện/lời thoại SẠCH từ kịch bản sau.
    YÊU CẦU:
    - Loại bỏ mọi ký hiệu Markdown (##, #, **).
    - Loại bỏ mọi nhãn kỹ thuật (SFX, Music, Visuals).
    - Trả về JSON duy nhất: { "Tên phần": "Nội dung lời thoại nguyên bản" }.
    - Nếu kịch bản đã sạch, chỉ cần chia nó theo các đoạn logic.

    KỊCH BẢN:
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

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt[]> => {
    const template = `Dark historical realism, late 18th–19th century atmosphere, muted sepia and earthy tones, low saturation color palette.
Painterly oil painting style with antique illustration influence, soft diffused lighting, heavy mood and melancholic atmosphere.
Textured old canvas look, subtle grain, realistic anatomy, detailed but restrained facial expressions.
Cinematic composition, social realism aesthetic, sense of human hardship, suffering, and collective fate.
No modern elements, no bright colors, no fantasy, no stylization, 16:9 aspect ratio.
[INSERT IMAGE CONTENT HERE]`;

    const prompt = `Bạn là chuyên gia tạo prompt hình ảnh cho Midjourney/Leonardo.
    Dựa trên trích đoạn kịch bản sau, hãy tạo ra đúng 4 prompt hình ảnh chi tiết.
    Mỗi prompt PHẢI tuân thủ cấu trúc sau đây, thay thế nội dung mô tả cụ thể vào chỗ [INSERT IMAGE CONTENT HERE]:
    
    \`\`\`
    ${template}
    \`\`\`

    TRẢ VỀ JSON duy nhất là một mảng gồm 4 đối tượng: [ { "english": "FULL_PROMPT_HERE", "vietnamese": "Mô tả ngắn gọn bằng tiếng Việt" }, ... ]
    
    TRÍCH ĐOẠN KỊCH BẢN:
    "${sceneDescription}"`;

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
    const prompt = `Tóm tắt kịch bản thành các cảnh quay chi tiết. Trả về JSON ScriptPartSummary.`;
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
    const prompt = `Chấm điểm (1-100) dựa trên DNA Dark Frontiers và nhận xét kịch bản này.`;
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
