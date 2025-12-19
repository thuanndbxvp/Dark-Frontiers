
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
Bạn là Content Officer cho kênh "Dark Frontiers", chuyên về Kinh dị Dã sử (Historical Fiction Horror).
ĐỊNH HƯỚNG NỘI DUNG:
- Niche: Sự kiện/địa điểm có thật + Sinh vật huyền bí (Cryptids) = Cơn ác mộng.
- Bối cảnh: 1800s - 1950s (Đèn dầu, súng trường, không có công nghệ cứu sinh hiện đại).
- Nội dung: Thám hiểm mất tích, Kinh dị công nghiệp, Chiến tranh & Quái vật.

VOICE DNA & PHONG CÁCH:
- Tông giọng: Ominous (Điềm báo), Gritty (Gai góc), Melancholic (U sầu).
- Quy tắc "Show, Don't Tell": Không nói cảm xúc trực tiếp. Hãy mô tả triệu chứng vật lý (ví dụ: "Ngón tay tôi tê dại quanh báng súng lạnh ngắt" thay vì "tôi sợ và lạnh").
- Audio Cinema Experience: Văn phong giàu hình ảnh và nhịp điệu trầm buồn, ám ảnh.

CẤU TRÚC KỊCH BẢN (NARRATIVE ARC):
1. THE HOOK: Tóm tắt kết cục bi thảm bằng ngôi thứ 3 (Lạnh lùng, khách quan).
2. THE SLOW BURN: Dấu hiệu nhỏ (mùi lạ, tiếng động), chuyển sang ngôi thứ 1 (Người sống sót).
3. THE SIEGE: Quái vật vờn mồi, tấn công tâm lý.
4. THE CLIMAX: Đối mặt trực diện hoặc trốn thoát trong gang tấc.
5. THE SCAR: Kết luận u sầu, ám ảnh, nhân vật bị thay đổi vĩnh viễn.

QUY TẮC KỊCH BẢN SẠCH (BẮT BUỘC):
- LOẠI BỎ hoàn toàn các chỉ dẫn âm thanh (Audio Cues), ánh sáng, gợi ý hình ảnh trong phần nội dung lời thoại.
- Chỉ trả về lời dẫn chuyện/lời thoại TRƠN, sẵn sàng để dán vào Text-to-speech.
`;

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;
    const isLongScript = parseInt(wordCount) >= 1000;

    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `
            ${DARK_FRONTIERS_DNA}
            TIÊU ĐỀ: "${title}"
            NGÔN NGỮ KỊCH BẢN: ${targetAudience}
            ĐỘ DÀI: ${wordCount} từ.
            ${outlineContent ? `DÀN Ý THAM KHẢO: ${outlineContent}` : ''}

            YÊU CẦU TRÌNH BÀY:
            - Sử dụng tiêu đề Markdown (##) để phân chia 5 phần của cấu trúc Dark Frontiers.
            - Phần nội dung dưới tiêu đề PHẢI LÀ VĂN BẢN SẠCH, không có bất kỳ ký tự đặc biệt hay chỉ dẫn đạo diễn nào.
        `;
    } else {
        prompt = `Viết kịch bản YouTube về "${title}". Ngôn ngữ: ${targetAudience}. Độ dài: ${wordCount} từ. 
        YÊU CẦU KỊCH BẢN SẠCH: Loại bỏ hoàn toàn các chỉ dẫn âm thanh, hình ảnh. Chỉ để lại lời thoại dẫn chuyện sẵn sàng cho TTS.`;
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
            Hãy tạo Dàn ý CHI TIẾT cho video kịch bản "${title}".
            Cấu trúc dàn ý phải tuân theo 5 giai đoạn: The Hook, The Slow Burn, The Siege, The Climax, The Scar.
            Ngôn ngữ tiêu đề phần: Tiếng Việt.
            Ngôn ngữ tóm tắt nội dung: ${targetAudience}.
            
            ĐỊNH DẠNG:
            ## [Tên giai đoạn]
            **Tóm tắt cốt truyện:** [Mô tả chi tiết những gì xảy ra trong phần này]
        `;
    } else {
        prompt = `Tạo dàn ý chi tiết cho kịch bản YouTube "${title}". Chia thành các phần ## [Tên phần]. Ngôn ngữ: Tiếng Việt.`;
    }

    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết (Sẵn sàng để tạo kịch bản sạch)\n\n` + outline;
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
            Bạn đang viết một PHẦN của kịch bản "${title}".
            
            DÀN Ý TOÀN BỘ: ${fullOutline}
            PHẦN CẦN VIẾT: ${currentPartOutline}
            BỐI CẢNH CÁC PHẦN TRƯỚC: ${previousPartsScript.slice(-1500)}

            YÊU CẦU CỤ THỂ:
            - Viết khoảng ${estPartWords} từ.
            - NGÔN NGỮ: ${targetAudience}.
            - KỊCH BẢN SẠCH 100%: Tuyệt đối không thêm bất kỳ hướng dẫn âm thanh, hình ảnh hay chú thích nào vào lời thoại.
            - Nếu là giai đoạn "Hook", dùng ngôi thứ 3. Các giai đoạn sau dùng ngôi thứ 1 (người sống sót).
            - Áp dụng "Show, Don't Tell" để miêu tả sự kinh hoàng của bối cảnh lịch sử.
        `;
    } else {
        prompt = `Viết nội dung chi tiết cho phần này của kịch bản "${title}". 
        Dàn ý phần: ${currentPartOutline}. Ngôn ngữ: ${targetAudience}. 
        YÊU CẦU KỊCH BẢN SẠCH: Chỉ trả về nội dung dẫn chuyện sẵn sàng cho TTS. Không có chỉ dẫn kỹ thuật.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo phần kịch bản');
    }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Dựa trên "${title}", gợi ý 5 ý tưởng video YouTube độc đáo. 
    Nếu là kinh dị, hãy đi theo hướng Kinh dị dã sử (Historical Horror).
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
    const prompt = `Chỉnh sửa kịch bản sau dựa trên yêu cầu: "${revisionPrompt}".
    Đảm bảo giữ vững phong cách kịch bản sạch (không chỉ dẫn âm thanh/hình ảnh) và DNA Dark Frontiers nếu là kinh dị.
    Kịch bản gốc:
    ${script}`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'sửa kịch bản');
    }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Tách lời thoại/dẫn chuyện từ kịch bản này theo từng phần. 
    Trả về JSON: { "Tên phần": "Nội dung lời thoại trơn" }.
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
    const prompt = `Gợi ý 10 từ khóa SEO cho video "${title}". Trả về danh sách ngăn cách bởi dấu phẩy.`;
    try {
        const response = await callApi(prompt, provider, model);
        return response.split(',').map(k => k.trim());
    } catch (e) {
        throw handleApiError(e, 'gợi ý từ khóa');
    }
};

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt> => {
    const prompt = `Tạo prompt hình ảnh chi tiết cho cảnh: "${sceneDescription}". 
    Nếu là Dark Frontiers, hãy dùng phong cách "Cinematic Horror, 19th Century, High Contrast, Ominous Atmosphere".
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
    const prompt = `Tạo prompts hình ảnh cho các cảnh chính trong kịch bản này.
    Trả về JSON array: { scene, english, vietnamese }.
    Kịch bản:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tạo tất cả prompt');
    }
};

export const summarizeScriptForScenes = async (script: string, config: SummarizeConfig, provider: AiProvider, model: string): Promise<ScriptPartSummary[]> => {
    const prompt = `Tóm tắt kịch bản thành storyboard cảnh quay. Config: ${JSON.stringify(config)}. 
    Trả về JSON matching ScriptPartSummary structure.
    Kịch bản:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tóm tắt kịch bản');
    }
};

export const suggestStyleOptions = async (title: string, provider: AiProvider, model: string): Promise<StyleOptions> => {
    const prompt = `Gợi ý Expression và Style tốt nhất cho video "${title}".
    Trả về JSON: { "expression": "...", "style": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'gợi ý phong cách');
    }
};

export const parseIdeasFromFile = async (content: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Trích xuất ý tưởng từ nội dung này. Trả về JSON array: { title, outline }.
    Content:
    ${content}`;
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
    const prompt = `Chấm điểm chuyên nghiệp (1-100) và nhận xét cho kịch bản này dựa trên độ hấp dẫn và DNA Dark Frontiers.
    Kịch bản:
    ${script}`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'chấm điểm kịch bản');
    }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Tạo video prompt cho cảnh này: "${scene.summary}". Scenario: ${config.scenarioType}.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'tạo prompt video');
    }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
